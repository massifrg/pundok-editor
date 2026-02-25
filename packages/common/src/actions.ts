import {
  CustomSpan,
  InputConverter,
  OutputConverter,
  PandocFilterTransform,
  PundokEditorConfig,
  PundokEditorProject
} from './config';
import { DocumentContext, CxDocument } from './document';
import { FeedbackMessage } from "./feedback"
import { Node as ProsemirrorNode } from "@tiptap/pm/model"
import { ViewerSetup } from './viewer';
import { DocumentFormat } from './documentFormat';

export interface ActionNameWithProps {
  name: string,
  props?: Record<string, any>
}

export interface BackendFeedbackActionProps {
  feedback: FeedbackMessage
}

export interface BackendSetProjectActionProps {
  project: PundokEditorProject
}

export interface BackendSetConfigNameActionProps {
  configurationName: string
}

export interface SetContentActionProps {
  content: string
}

export interface BackendSetContentActionProps {
  content: CxDocument
}

export interface BackendSetContentWithProjectActionProps {
  content: CxDocument,
  configuration: PundokEditorConfig,
  project: PundokEditorProject
}

export interface NewDocumentActionProps {
  configurationName: string,
  content: string
}

export interface NewEmptyDocumentActionProps {
  configurationName?: string
}

export interface DocumentOpenActionProps {
  context?: DocumentContext,
  atLine?: number
}

export interface DocumentSaveActionProps {
  /** The complete path of the document to be saved (folder and filename). */
  path?: string,
  /** The format in which the document must be saved. */
  documentFormat: DocumentFormat,
  /** It's a "save as" operation. The document in the editor takes the new name and format. */
  isSaveAs?: boolean,
  /** It's a "save a copy" operation. The document in the editor keeps its name and format. */
  isCopy?: boolean,
  /** When `true`, don't ask for the copy name and format. */
  dontAskCopyPath?: boolean,
}

export interface ImportDocumentActionProps {
  doc: Partial<CxDocument>
}

export interface ExportDocumentActionProps {
  doc: Partial<CxDocument>
}

export interface TransformDocumentActionProps {
  transform: PandocFilterTransform
}

export type WhichDocumentFormat = 'input' | 'output' | 'copy'
export interface SetDocumentFormatActionProps {
  whichFormat: WhichDocumentFormat
  documentFormat: DocumentFormat
}

export interface GoToLineActionProps {
  atLine: number
}

export interface ResultMessageActionProps {
  success: boolean,
  message: string,
  caption: string,
  icon: string,
}

export interface ShowExportDialogActionProps {
  outputConverter: OutputConverter
}

export interface SetAlternativeActionProps {
  alternative: number,
  context?: 'indices' // | 'other-context' ... 
}

export interface SetupViewerActionProps {
  setup: ViewerSetup
}

export interface EditAttributesActionProps {
  tab?: string,
  action?: ActionNameWithProps,
  selectNode?: (node: ProsemirrorNode) => boolean,
}

export interface MetaMapTextActionProps {
  text: string,
  oldText?: string
}

export interface TextAlignmentActionProps {
  alignment: 'left' | 'center' | 'right'
}

export interface TableCellVertAlignActionProps {
  alignment: 'top' | 'middle' | 'bottom'
}

export interface AddOrRemoveClassActionProps {
  className: string,
  typeName?: string,
}

export interface AddOrRemoveMarkActionProps {
  markType: string,
  attrs?: Record<string, string>,
}

export interface AddOrRemoveCustomStyleActionProps {
  styleName: string,
}

export interface AddOrRemoveCustomClassActionProps {
  shortDesc?: string,
  className: string,
  attrs?: Record<string, string>,
}

export interface SetSpanActionProps {
  classes: string[],
  attrs: Record<string, string>,
  alternativeIndex: number,
  alternatives?: CustomSpan[],
}

export interface SetIndexRefActionProps {
  indexName: string,
}

export interface InsertRawInlineActionProps {
  format: string,
  where: 'before' | 'after',
  content: string | string[],
}

/**
 * Check if two action (names) do the opposite (e.g. "add-mark" and "remove-mark").
 * @param n1 The name of the first action.
 * @param n2 The name of the second action.
 * @returns 
 */
export function isOppositeAction(n1: string, n2: string): boolean {
  return n1 !== n2
    && n1.replace(/^(add|remove)/, '') === n2.replace(/^(add|remove)/, '')
}