import {
  CustomSpan,
  InputConverter,
  OutputConverter,
  PandocFilterTransform,
  PundokEditorConfig,
  PundokEditorProject
} from './config';
import { DocumentContext, ReadDoc, StoredDoc } from './document';
import { FeedbackMessage } from "./feedback"
import { Node as ProsemirrorNode } from "@tiptap/pm/model"
import { ViewerSetup } from './viewer';

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
  content: ReadDoc
}

export interface BackendSetContentWithProjectActionProps {
  content: ReadDoc,
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

export interface ImportDocumentActionProps {
  inputConverter: InputConverter,
  storedDoc: Partial<StoredDoc>
}

export interface ExportDocumentActionProps {
  outputConverter: OutputConverter,
  storedDoc: Partial<StoredDoc>
}

export interface TransformDocumentActionProps {
  transform: PandocFilterTransform
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