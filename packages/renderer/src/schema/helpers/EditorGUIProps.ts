export interface EditorGUIProps {
  /** new document button */
  newDocument: boolean;
  /** open document button */
  openButton: boolean;
  /** import document button (DEPRECATED) */
  importButton: boolean;
  /** export document button (DEPRECATED) */
  exportButton: boolean;
  /** allow line/blocks swapping (with Alt+Up and Alt+Down) */
  swapBlocksActive: boolean;
  /** project structure button */
  projectStructure: boolean;
  showEditorVersion: boolean;
  showEditorKey: boolean;
  showConfiguration: boolean;
  /** process.env.NODE_ENV !== 'production' */
  isDevelopmentMode: boolean;
}

export class EditorGUIPropsClass implements EditorGUIProps {
  newDocument: boolean = true;
  openButton: boolean = true;
  importButton: boolean = true;
  exportButton: boolean = true;
  swapBlocksActive: boolean = true;
  projectStructure: boolean = true;
  showEditorVersion: boolean = true;
  showEditorKey: boolean = process.env.NODE_ENV !== 'production';
  showConfiguration: boolean = true;
  isDevelopmentMode: boolean = process.env.NODE_ENV !== 'production'

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
