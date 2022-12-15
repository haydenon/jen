import { Type } from '@haydenon/gen-core';
import {
  PropertyDefinitionResponse,
  PropertyTypeResponse,
} from '@haydenon/gen-server';
import ArrayInput from './ArrayInput';

import NumberInput from './NumberInput';
import { BaseInputProps } from './props';
import StringInput from './StringInput';

const getDisplayName = (response: PropertyDefinitionResponse) => {
  const name = response.name;
  const res = name.replace(/([A-Z]+)/g, ' $1').replace(/([A-Z][a-z])/g, ' $1');
  return res[0].toLocaleUpperCase() + res.substring(1);
};

interface TypeProps extends BaseInputProps {
  type: PropertyTypeResponse;
  value: any;
}

export const InputForType = ({ type, value, ...baseProps }: TypeProps) => {
  switch (type.type) {
    case Type.Int:
    case Type.Float:
      return (
        <NumberInput
          {...baseProps}
          type={type}
          value={value}
          onChange={console.log}
        />
      );
    case Type.String:
      return (
        <StringInput
          {...baseProps}
          type={type}
          value={value}
          onChange={console.log}
        />
      );
    case Type.Array:
      return (
        <ArrayInput
          {...baseProps}
          value={undefined}
          type={type}
          onChange={console.log}
        />
      );
    case Type.Link:
      return <InputForType type={type.inner} {...baseProps} value={value} />;
    case Type.Undefinable:
      return (
        <InputForType
          {...baseProps}
          type={type.inner}
          undefinable={true}
          value={value}
        />
      );
    case Type.Nullable:
      return (
        <InputForType
          {...baseProps}
          type={type.inner}
          nullable={true}
          value={value}
        />
      );
    default:
      return <>Field</>;
  }
};

interface RootProps {
  fieldDefinition: PropertyDefinitionResponse;
  value: any;
}

const ResourceField = ({ fieldDefinition, value }: RootProps) => {
  const displayName = getDisplayName(fieldDefinition);
  return (
    <InputForType
      type={fieldDefinition.type}
      name={displayName}
      undefinable={false}
      nullable={false}
      value={value}
    />
  );
};

export default ResourceField;
