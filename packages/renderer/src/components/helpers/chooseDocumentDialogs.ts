import { Dialog } from 'quasar'
import { Editor } from '@tiptap/vue-3'
import {
  ACTION_DOCUMENT_INCLUDE,
  ACTION_DOCUMENT_OPEN,
  ACTION_DOCUMENT_SAVE,
  ACTION_DOCUMENT_SAVE_AS,
  ACTION_SET_DOCUMENT_FORMAT,
  BaseEditorAction,
  setActionCommand
} from '../../actions'
import {
  DocumentContext,
  DocumentFormat,
  DocumentOpenActionProps,
  SetDocumentFormatActionProps,
  WhichDocumentFormat
} from '../../common'
import OpenDocumentDialog, { DocumentDialogMode } from '../OpenDocumentDialog.vue'

export interface DocumentDialogProps {
  editor: Editor
  mode?: DocumentDialogMode
  prompt?: string
  startFolder?: string[]
  startFilename?: string
  startFormat?: DocumentFormat
  callback?: (payload: DocumentContext) => void
}

function whichFormatFromMode(mode: DocumentDialogMode): WhichDocumentFormat | undefined {
  switch (mode) {
    case 'open':
      return 'input'
    case 'save':
      return 'output'
    case 'save-copy':
      return 'copy'
    default:
      return undefined
  }
}

function actionFromMode(mode: DocumentDialogMode): BaseEditorAction | undefined {
  switch (mode) {
    case 'open':
      return ACTION_DOCUMENT_OPEN
    case 'save':
      return ACTION_DOCUMENT_SAVE
    case 'save-copy':
      return ACTION_DOCUMENT_SAVE_AS
    default:
      return undefined
  }
}

export function showOpenDocumentDialog(props: DocumentDialogProps) {
  Dialog.create({
    component: OpenDocumentDialog,
    componentProps: { ...props, persistent: true }
  }).onOk((context: DocumentContext) => {
    const { mode, callback } = props
    const { documentFormat, editorKey, path } = context
    if (path && editorKey) {
      const whichFormat = whichFormatFromMode(mode || 'open')
      if (whichFormat) {
        setActionCommand(
          editorKey,
          ACTION_SET_DOCUMENT_FORMAT,
          { whichFormat, documentFormat } as SetDocumentFormatActionProps
        )
      }
      const action = actionFromMode(mode || 'open')
      if (action) {
        setActionCommand(
          editorKey,
          action,
          { context } as DocumentOpenActionProps
        )
      }
      if (callback)
        callback(context)
    }
  })
}

export function showSaveDocumentDialog(props: DocumentDialogProps) {
  return showOpenDocumentDialog({ ...props, mode: 'save' })
}

export function showSaveCopyDialog(props: DocumentDialogProps) {
  return showOpenDocumentDialog({ ...props, mode: 'save-copy' })
}

export function showIncludeDocumentDialog(props: DocumentDialogProps) {
  return showOpenDocumentDialog({ ...props, mode: 'include' })
}