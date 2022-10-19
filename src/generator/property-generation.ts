import { faker } from '@faker-js/faker';
import {
  PropertyDefinition,
  PropertyValues,
  PropertyMap,
  PropertyType,
  isNullable,
  isUndefinable,
  isStr,
  isBool,
  isNum,
  DesiredState,
  isLinkType,
  isComplex,
  isArray,
  createDesiredState,
} from '../resources';
import { ResourceLink } from './generator';

function getValueForSimpleType(type: PropertyType): any {
  console.log(type);
  if (isNullable(type)) {
    const random = Math.random();
    if (isUndefinable(type.inner)) {
      return random < 0.25
        ? undefined
        : random < 0.5
        ? null
        : getValueForSimpleType(type.inner.inner);
    }

    return random < 0.5 ? null : getValueForSimpleType(type.inner);
  }

  if (isUndefinable(type)) {
    const random = Math.random();
    return random < 0.5 ? undefined : getValueForSimpleType(type.inner);
  }

  console.log('Base type', type, isNum(type));
  if (isStr(type)) {
    console.log('Str');
    return `${faker.word.adjective()}  ${faker.word.noun()}`;
  } else if (isNum(type)) {
    console.log('Num');
    return faker.datatype.number();
  } else if (isBool(type)) {
    return faker.datatype.boolean();
  }
}

// function getInputs(state: DesiredState): PropertyValues<PropertyMap> {
//   let currentInput: string | undefined;
//   const values = { ...state.inputs };
//   const getForKey = (key: string) => {
//     // TODO: Make sure error is reported correctly
//     if (currentInput === key) {
//       throw new Error(
//         `Circular property generation from property '${currentInput}' on resource '${state.resource.constructor.name}'`
//       );
//     }

//     const inputDef = state.resource.inputs[key];
//     if (!inputDef) {
//       throw new Error(
//         `Property '${currentInput}' does not exist on resource '${state.resource.constructor.name}'`
//       );
//     }

//     if (key in values) {
//       return values[key];
//     }

//     return (values[key] = getValue(inputDef, inputProxy));
//   };

//   const inputProxy: PropertyValues<PropertyMap> = {};
//   for (const prop of Object.keys(state.resource.inputs)) {
//     Object.defineProperty(inputProxy, prop, {
//       get: () => getForKey(prop),
//     });
//   }

//   for (const inputKey of Object.keys(state.resource.inputs)) {
//     const value = values[inputKey];
//     if (!(inputKey in values)) {
//       currentInput = inputKey;
//       values[inputKey] = getValue(state.resource.inputs[inputKey], inputProxy);
//     } else if (isResourceLink(value)) {
//       values[inputKey] = getLinkValue(value);
//     }
//   }
//   return values as PropertyValues<PropertyMap>;
// }

// function getValue(
//   input: PropertyDefinition<any>,
//   inputs: PropertyValues<PropertyMap>
// ): any {
//   // TODO: Fix generation
//   // if (input.constraint) {
//   //   return input.constraint.generateConstrainedValue(inputs);
//   // }

//   return getValueForSimpleType(input.type);
// }

function fillInType(
  type: PropertyType,
  inputs: PropertyValues<PropertyMap>
): [any, DesiredState[]] {
  if (isComplex(type)) {
    return Object.keys(type.fields).reduce(
      ([acc, states], field) => {
        const [value, newStates] = fillInType(type.fields[field], inputs);
        console.log(field, type.fields[field], value, newStates);
        acc[field] = value;
        return [acc, [...states, ...newStates]];
      },
      [{}, []] as [any, DesiredState[]]
    );
  }

  if (isArray(type)) {
    const min = type.constraint?.minItems ?? 0;
    const max = type.constraint?.maxItems ?? 10;
    const difference = max - min;
    const count = Math.floor(Math.random() * difference) + min;
    const mapped = [...Array(count).keys()].map(() =>
      fillInType(type.inner, inputs)
    );
    return [
      mapped.flatMap(([value]) => value),
      mapped.flatMap(([, items]) => items),
    ];
  }

  if (type.constraint?.generateConstrainedValue) {
    return [type.constraint?.generateConstrainedValue(inputs), []];
  } else if (isLinkType(type)) {
    const dependentState = createDesiredState(type.resource, {});
    const link = new ResourceLink(dependentState, type.outputAccessor);
    return [link, [dependentState]];
  }

  return [getValueForSimpleType(type), []];
}

function fillInInput(
  state: DesiredState,
  input: PropertyDefinition<any>
): [any, DesiredState[]] {
  let currentInput: string | undefined;
  const values = state.inputs;
  let newState: DesiredState[] = [];
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

    const [value, dependentState] = fillInType(inputDef.type, inputProxy);
    newState = [...newState, ...dependentState];
    return (values[key] = value);
  };

  const inputProxy: PropertyValues<PropertyMap> = {};
  for (const prop of Object.keys(state.resource.inputs)) {
    Object.defineProperty(inputProxy, prop, {
      get: () => getForKey(prop),
    });
  }

  const [value, dependentState] = fillInType(input.type, inputProxy);
  newState = [...newState, ...dependentState];
  return [value, newState];
}

export function fillInDesiredStateTree(state: DesiredState[]): DesiredState[] {
  const newState = [...state];
  for (const item of newState) {
    for (const inputKey of Object.keys(item.resource.inputs)) {
      const input = item.resource.inputs[inputKey];
      if (!(inputKey in item.inputs)) {
        const [value, dependentStates] = fillInInput(item, input);
        item.inputs[inputKey] = value;
        for (const state of dependentStates) {
          newState.push(state);
        }
      }
    }
  }

  return newState;
}
