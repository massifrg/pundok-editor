import { Dialog } from 'quasar'
import { Editor } from '@tiptap/vue-3'
import {
  CxDocument,
  DocumentContext,
  DocumentFormat,
} from '../../common'
import { DocumentDialogMode, OpenDocumentDialog } from '../dialogs'

export interface DocumentDialogOptions {
  prompt?: string
  startFolder?: string
  startFilename?: string
  startFormat?: DocumentFormat
}

export type DocumentDialogCallback = (payload: DocumentContext | CxDocument) => void

export interface DocumentDialogProps {
  editor: Editor
  mode?: DocumentDialogMode
  options: DocumentDialogOptions,
  callback?: DocumentDialogCallback
}

export function showDocumentDialog(props: DocumentDialogProps) {
  Dialog.create({
    component: OpenDocumentDialog,
    componentProps: {
      editor: props.editor,
      mode: props.mode,
      options: props.options,
      persistent: true
    }
  }).onOk((payload: DocumentContext) => {
    const { callback } = props
    if (callback) {
      callback(payload)
    }
  }).onCancel(() => {
    console.log('Cancel')
  }).onDismiss(() => {
    console.log('Dismiss')
  })
}

export function showOpenDocumentDialog(props: DocumentDialogProps) {
  return showDocumentDialog({ ...props, mode: 'open' })
}

export function showSaveDocumentDialog(props: DocumentDialogProps) {
  return showDocumentDialog({ ...props, mode: 'save' })
}

export function showSaveCopyDialog(props: DocumentDialogProps) {
  return showDocumentDialog({ ...props, mode: 'save-copy' })
}

export function showIncludeDocumentDialog(props: DocumentDialogProps) {
  return showDocumentDialog({ ...props, mode: 'include' })
}

export function showImportDocumentDialog(props: DocumentDialogProps) {
  return showDocumentDialog({ ...props, mode: 'import' })
}

export function showSelectFolderDialog(props: DocumentDialogProps) {
  return showDocumentDialog({ ...props, mode: 'folder' })
}

export function showSelectImageDialog(props: DocumentDialogProps) {
  return showDocumentDialog({ ...props, mode: 'image' })
}