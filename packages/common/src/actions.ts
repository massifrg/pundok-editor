import {
  CustomSpan,
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

export type ActionProps = Record<string, any>

export interface ActionNameWithProps {
  name: string,
  props?: ActionProps
}

export interface BackendFeedbackActionProps extends ActionProps {
  feedback: FeedbackMessage
}

export interface BackendSetProjectActionProps extends ActionProps {
  project: PundokEditorProject
}

export interface BackendSetConfigNameActionProps extends ActionProps {
  configurationName: string
}

export interface SetContentActionProps extends ActionProps {
  content: string
}

export interface BackendSetContentActionProps extends ActionProps {
  content: CxDocument
}

export interface BackendSetContentWithProjectActionProps extends ActionProps {
  content: CxDocument,
  configuration: PundokEditorConfig,
  project: PundokEditorProject
}

export interface NewDocumentActionProps extends ActionProps {
  configurationName: string,
  content: string
}

export interface NewEmptyDocumentActionProps extends ActionProps {
  configurationName?: string
}

export interface DocumentOpenActionProps extends ActionProps {
  context?: DocumentContext,
  atLine?: number
}

export interface DocumentSaveActionProps extends ActionProps {
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

export interface ImportDocumentActionProps extends ActionProps {
  doc: Partial<CxDocument>
}

export interface ExportDocumentActionProps extends ActionProps {
  doc: Partial<CxDocument>
}

export interface TransformDocumentActionProps extends ActionProps {
  transform: PandocFilterTransform
}

export type WhichDocumentFormat = 'input' | 'output' | 'copy'
export interface SetDocumentFormatActionProps extends ActionProps {
  whichFormat: WhichDocumentFormat
  documentFormat: DocumentFormat
}

export interface GoToLineActionProps extends ActionProps {
  atLine: number
}

export interface ResultMessageActionProps extends ActionProps {
  success: boolean,
  message: string,
  caption: string,
  icon: string,
}

export interface ShowExportDialogActionProps extends ActionProps {
  outputConverter: OutputConverter
}

export interface SetAlternativeActionProps extends ActionProps {
  alternative: number,
  context?: 'indices' // | 'other-context' ... 
}

export interface SetupViewerActionProps extends ActionProps {
  setup: ViewerSetup
}

export interface EditAttributesActionProps extends ActionProps {
  tab?: string,
  action?: ActionNameWithProps,
  selectNode?: (node: ProsemirrorNode) => boolean,
}

export interface MetaMapTextActionProps extends ActionProps {
  text: string,
  oldText?: string
}

export interface TextAlignmentActionProps extends ActionProps {
  alignment: 'left' | 'center' | 'right'
}

export interface TableCellVertAlignActionProps extends ActionProps {
  alignment: 'top' | 'middle' | 'bottom'
}

export interface AddOrRemoveClassActionProps extends ActionProps {
  className: string,
  typeName?: string,
}

export interface AddOrRemoveMarkActionProps extends ActionProps {
  markType: string,
  attrs?: Record<string, string>,
}

export interface AddOrRemoveCustomStyleActionProps extends ActionProps {
  styleName: string,
}

export interface AddOrRemoveCustomClassActionProps extends ActionProps {
  shortDesc?: string,
  className: string,
  attrs?: Record<string, string>,
}

export interface SetSpanActionProps extends ActionProps {
  classes: string[],
  attrs: Record<string, string>,
  alternativeIndex: number,
  alternatives?: CustomSpan[],
}

export interface SetIndexRefActionProps extends ActionProps {
  indexName: string,
}

export interface InsertRawInlineActionProps extends ActionProps {
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