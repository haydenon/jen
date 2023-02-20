interface InputContext {
  rootInputName: string;
  desiredResourceId: string;
}

export interface BaseInputProps {
  name: string;
  context: InputContext;
  parentActions: React.ReactNode | React.ReactNode[];
}
