import { faker } from '@faker-js/faker';
import {
  Resource,
  ResourceInstance,
  PropertyMap,
  PropertyValues,
  PropertyType,
  PropertyDefinition,
} from '../resources';
import { DesiredState } from '../resources/desired-state';

type Desired = DesiredState<PropertyMap, Resource<PropertyMap, PropertyMap>>;

const DEFAULT_CREATE_TIMEOUT = 30 * 1000;

interface StateNode {
  state: Desired;
  depth: number;
  dependencies: StateNode[];
  depedendents: StateNode[];
  output?: ResourceInstance<PropertyMap>;
  error?: GenerationError;
}

class GeneratorState {
  private inProgressCount = 0;
  private queued: StateNode[] = [];

  private constructor(
    private stateNodes: StateNode[],
    public resolve: (results: ResourceInstance<PropertyMap>[]) => void,
    public reject: (error: Error) => void,
    public options: GeneratorOptions
  ) {
    this.appendReadyNodesToQueue(stateNodes);
  }

  get anyInProgress(): boolean {
    return this.inProgressCount > 0;
  }

  getNextForCreation(count: number): Desired[] {
    const toFetch = count - this.inProgressCount;
    if (toFetch <= 0) {
      return [];
    }

    const upNext = this.queued.splice(0, count);
    return upNext.map(({ state }) => state);
  }

  completeGeneration(): void {
    const [numCompleted, numErrored, total] = this.stateNodes.reduce(
      ([comp, err, tot], node) => [
        comp + (node.output ? 1 : 0),
        err + (node.error ? 1 : 0),
        tot + 1,
      ],
      [0, 0, 0] as [number, number, number]
    );
    if (numErrored > 0) {
      const errors = this.stateNodes
        .map((n) => n.error as GenerationError)
        .filter((n) => n);
      this.reject(
        new GenerationResultError('Generation encountered errors', errors)
      );
    } else if (numCompleted < total) {
      this.reject(new GenerationResultError('Generation stalled'));
    } else {
      this.resolve(
        this.stateNodes.map((n) => n.output as ResourceInstance<PropertyMap>)
      );
    }
  }

  markCreating(_: Desired): void {
    this.inProgressCount++;
  }

  markCreated(state: Desired, output: ResourceInstance<PropertyMap>): void {
    const node = this.stateNodes.find((n) => n.state === state);
    if (!node) {
      throw new Error('Node does not exist');
    }

    node.output = output;
    this.inProgressCount--;
    this.appendReadyNodesToQueue(node.depedendents);
  }

  markFailed(state: Desired, error: Error): void {
    const node = this.stateNodes.find((n) => n.state === state);
    if (!node) {
      throw new Error('Node does not exist');
    }

    node.error =
      error instanceof GenerationError
        ? error
        : new GenerationError(error, state);
    this.inProgressCount--;
  }

  private appendReadyNodesToQueue(nodes: StateNode[]): void {
    const ready = nodes.filter(
      (n) =>
        !n.output &&
        n.dependencies.every((dep) => dep.output) &&
        !this.queued.includes(n)
    );

    // TODO: Proper priority
    this.queued = this.queued
      .concat(ready)
      .sort((n1, n2) => n1.depth - n2.depth);
  }

  static create(
    state: Desired[],
    [resolve, reject]: [
      (results: ResourceInstance<PropertyMap>[]) => void,
      (error: Error) => void
    ],
    options: GeneratorOptions
  ): GeneratorState {
    return new GeneratorState(
      GeneratorState.getStructure(state),
      resolve,
      reject,
      options
    );
  }

  // TODO: Proper tree construction
  private static getStructure(stateValues: Desired[]): StateNode[] {
    return stateValues.map((state) => ({
      state,
      depth: 0,
      created: false,
      dependencies: [],
      depedendents: [],
    }));
  }
}

const CONCURRENT_CREATIONS = 10;

interface GeneratorOptions {
  onCreate?: (resource: ResourceInstance<PropertyMap>) => void;
  onError?: (error: GenerationError) => void;
}

export class Generator {
  constructor(private resources: Resource<PropertyMap, PropertyMap>[]) {}

  async generateState(
    state: DesiredState<PropertyMap, Resource<PropertyMap, PropertyMap>>[],
    options?: GeneratorOptions
  ): Promise<ResourceInstance<PropertyMap>[]> {
    return new Promise((res, rej) => {
      const generatorState = GeneratorState.create(
        state,
        [res, rej],
        options ?? {}
      );
      this.runRound(generatorState);
    });
  }

  private runRound(generatorState: GeneratorState): void {
    // TODO: Determine when finished
    const toCreate = generatorState.getNextForCreation(CONCURRENT_CREATIONS);
    if (toCreate.length <= 0) {
      if (!generatorState.anyInProgress) {
        generatorState.completeGeneration();
      }
      return;
    }

    for (const stateItem of toCreate) {
      generatorState.markCreating(stateItem);
      this.createDesiredState(stateItem)
        .then((instance) => {
          this.notifyItemSuccess(generatorState, instance);
          generatorState.markCreated(stateItem, instance);
          this.runRound(generatorState);
        })
        .catch((err: Error) => {
          generatorState.markFailed(stateItem, err);
          this.notifyItemError(generatorState, err, stateItem);
          this.runRound(generatorState);
        });
    }
  }

  private async createDesiredState(
    state: Desired
  ): Promise<ResourceInstance<PropertyMap>> {
    return new Promise((res, rej) => {
      const timeout =
        state.resource.createTimeoutMillis ?? DEFAULT_CREATE_TIMEOUT;
      const timerId = setTimeout(() => {
        rej(
          new Error(
            `Creating desired state item '${state.name}' of resource '${state.resource.constructor.name}' timed out`
          )
        );
      }, timeout);
      const created = state.resource
        .create(this.getInputs(state))
        .then((instance) => {
          clearTimeout(timerId);
          res(instance);
        })
        .catch((err) => {
          clearTimeout(timerId);
          rej(err);
        });
      return created;
    });
  }

  private getInputs(state: Desired): PropertyValues<PropertyMap> {
    let currentInput: string | undefined;
    const values = state.values;
    const getForKey = (key: string) => {
      // TODO: Make sure error is reported correctly
      if (currentInput === key) {
        throw new Error(
          `Circular property generation from property '${currentInput}' on resource '${state.resource.constructor.name}'`
        );
      }

      const inputDef = state.resource.inputs[key];
      if (!inputDef) {
        throw new Error(
          `Property '${currentInput}' does not exist on resource '${state.resource.constructor.name}'`
        );
      }

      if (key in values) {
        return values[key];
      }

      return (values[key] = this.getValue(inputDef, inputProxy));
    };

    const inputProxy: PropertyValues<PropertyMap> = {};
    for (const prop of Object.keys(state.resource.inputs)) {
      Object.defineProperty(inputProxy, prop, {
        get: () => getForKey(prop),
      });
    }

    for (const inputKey of Object.keys(state.resource.inputs)) {
      if (!(inputKey in values)) {
        currentInput = inputKey;
        values[inputKey] = this.getValue(
          state.resource.inputs[inputKey],
          inputProxy
        );
      }
    }
    return values as PropertyValues<PropertyMap>;
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  private getValue(
    input: PropertyDefinition<PropertyType>,
    inputs: PropertyValues<PropertyMap>
  ): any {
    /* eslint-enable @typescript-eslint/no-explicit-any */
    if (input.constraint) {
      return input.constraint.generateConstrainedValue(inputs);
    }

    switch (input.type) {
      case 'String':
        return `${faker.word.adjective()}  ${faker.word.noun()}`;
      case 'Number':
        return faker.datatype.number();
      case 'Boolean':
        return faker.datatype.boolean();
    }
  }

  private notifyItemSuccess(
    generatorState: GeneratorState,
    instance: ResourceInstance<PropertyMap>
  ) {
    if (generatorState.options.onCreate) {
      try {
        generatorState.options.onCreate(instance);
      } catch {
        // Prevent consumer errors stopping the generator
      }
    }
  }

  private notifyItemError(
    generatorState: GeneratorState,
    error: Error,
    desired: Desired
  ) {
    if (generatorState.options.onError) {
      try {
        generatorState.options.onError(new GenerationError(error, desired));
      } catch {
        // Prevent consumer errors stopping the generator
      }
    }
  }
}

export class GenerationError extends Error {
  constructor(public inner: Error, public desired: Desired) {
    super();
    this.message = `Failed to create state: ${inner.message}`;
  }
}

export class GenerationResultError extends Error {
  constructor(message: string, public errors?: GenerationError[]) {
    super(message);
  }
}
