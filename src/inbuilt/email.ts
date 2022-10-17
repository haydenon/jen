import { faker } from '@faker-js/faker';
import {
  OutputValues,
  PropertiesBase,
  PropertyMap,
  Resource,
} from '../resources';
import {
  Constraint,
  PropertyDefinition,
  Props,
  def,
} from '../resources/properties';

const EMAIL_REGEX =
  // eslint-disable-next-line no-control-regex
  /^(?:[a-z0-9!#$%&'*+=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/;

export const EmailConstraint: Constraint<string> = {
  isValid: (value: string): boolean => EMAIL_REGEX.test(value),
  generateConstrainedValue: function (): string {
    return faker.internet.exampleEmail();
  },
};

export const EmailProperty = def(Props.String, {
  constraint: EmailConstraint,
});

class EmailOutputs extends PropertiesBase {
  value: PropertyDefinition<string> = EmailProperty;
}

class EmailDefinition extends Resource<PropertyMap, EmailOutputs> {
  async create(): Promise<OutputValues<EmailOutputs>> {
    return {
      value: 'test@example.com',
    };
  }
}

export const Email = new EmailDefinition({}, new EmailOutputs());
