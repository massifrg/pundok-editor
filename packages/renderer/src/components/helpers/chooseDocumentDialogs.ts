import { Dialog } from 'quasar'
import { Editor } from '@tiptap/vue-3'
import {
  CxDocument,
  DocumentContext,
  DocumentFormat,
} from '../../common'
import { DocumentDialogMode, OpenDocumentDialog } from '../dialogs'

export interface DocumentDialogProps {
  editor: Editor
  mode?: DocumentDialogMode
  prompt?: string
  startFolder?: string
  startFilename?: string
  startFormat?: DocumentFormat
  callback?: (payload: DocumentContext | CxDocument) => void
}

export function showOpenDocumentDialog(props: DocumentDialogProps) {
  Dialog.create({
    component: OpenDocumentDialog,
    componentProps: { ...props, persistent: true }
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

export function showSaveDocumentDialog(props: DocumentDialogProps) {
  return showOpenDocumentDialog({ ...props, mode: 'save' })
}

export function showSaveCopyDialog(props: DocumentDialogProps) {
  return showOpenDocumentDialog({ ...props, mode: 'save-copy' })
}

export function showIncludeDocumentDialog(props: DocumentDialogProps) {
  return showOpenDocumentDialog({ ...props, mode: 'include' })
}

export function showImportDocumentDialog(props: DocumentDialogProps) {
  return showOpenDocumentDialog({ ...props, mode: 'import' })
}

export function showSelectFolderDialog(props: DocumentDialogProps) {
  return showOpenDocumentDialog({ ...props, mode: 'folder' })
}

export function showSelectImageDialog(props: DocumentDialogProps) {
  return showOpenDocumentDialog({ ...props, mode: 'image' })
}