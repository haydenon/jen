import { ComplexTypeResponse } from '@haydenon/gen-server';
import styled from 'styled-components';
import Label, { NonFormLabel } from '../../../components/Label';
import { getFieldDisplayName } from './field.utils';
import { BaseInputProps } from './props';
import { InputForType } from './ResourceField';

interface Props extends BaseInputProps {
  type: ComplexTypeResponse;
  value: { [field: string]: any };
  onChange: (value: { [field: string]: any }) => void;
}

const FieldLabel = styled(NonFormLabel)`
  margin-top: calc(-1 * var(--labelOffset));
`;

const InputWrapper = styled.div`
  padding-top: var(--labelOffset);
  display: flex;
  gap: var(--spacing-tiny);
  &:not(:last-child) {
    padding-bottom: var(--spacing-small);
  }
`;

const InputsWrapper = styled.div`
  margin: var(--spacing-small) 0 var(--spacing-small)
    calc(var(--spacing-large) - 4px);
  border-left: 4px solid var(--colors-text);
  padding-left: var(--spacing-small);
`;

const ComplexField = ({
  name,
  type,
  parentActions,
  value,
  onChange,
  ...baseProps
}: Props) => {
  const handleChange = (field: string) => (fieldValue: any) => {
    const newValue = { ...value, [field]: fieldValue };
    onChange(newValue);
  };

  return (
    <FieldLabel label={name}>
      {parentActions}
      <InputsWrapper>
        {Object.keys(type.fields).map((field) => (
          <InputWrapper key={field}>
            <InputForType
              name={getFieldDisplayName(field)}
              type={type.fields[field]}
              parentActions={null}
              value={value[field]}
              onChange={handleChange(field)}
              context={baseProps.context}
            />
          </InputWrapper>
        ))}
      </InputsWrapper>
    </FieldLabel>
  );
};

export default ComplexField;
