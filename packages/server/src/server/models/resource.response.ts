import { PropertyType } from '@haydenon/gen-core';

export interface PropertyDefinitionResponse {
  type: PropertyType;
}

export interface PropertyMapResponse {
  [name: string]: PropertyDefinitionResponse;
}

export interface ResourceResponse {
  name: string;
  inputs: PropertyMapResponse;
  outputs: PropertyMapResponse;
}
