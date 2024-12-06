export type PendingOperationType = 'closing' | 'loading' | 'new';

export interface PendingOperationExtraValue {
  name: string;
  label: string;
  color?: string;
  values: any[];
  default?: any;
}

export interface PendingOperation extends Record<string, any> {
  type: PendingOperationType;
  cancel?: {
    label?: string;
    color?: string;
  };
  confirm?: {
    label?: string;
    color?: string;
  };
  extraValues?: PendingOperationExtraValue[];
}
