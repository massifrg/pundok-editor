export interface EditorGUIProps {
  /** new document button */
  newDocument: boolean;
  /** import document button */
  importButton: boolean;
  /** export document button */
  exportButton: boolean;
  /** project structure button */
  projectStructure: boolean;
  showEditorVersion: boolean;
  showEditorKey: boolean;
  showConfiguration: boolean;
}

export class EditorGUIPropsClass implements EditorGUIProps {
  newDocument: boolean = true;
  importButton: boolean = true;
  exportButton: boolean = true;
  projectStructure: boolean = true;
  showEditorVersion: boolean = true;
  showEditorKey: boolean = true;
  showConfiguration: boolean = true;

  constructor(props?: Partial<EditorGUIProps>) {
    if (props) {
      Object.keys(props).forEach((k) => {
        const key = k as keyof EditorGUIProps;
        const value = props[key];
        if (value !== undefined) this[key] = value;
      });
    }
  }
}
