import { Dialog } from 'quasar'
import { Editor } from '@tiptap/vue-3'
import { DocumentFormat } from '../common'
import OpenDocumentDialog, { DocumentDialogMode } from './OpenDocumentDialog.vue'

export interface ShowOpenDocumentDialogProps {
  editor: Editor
  mode: DocumentDialogMode
  prompt?: string
  startFilename?: string
  startFormat?: DocumentFormat
}

export function showOpenDocumentDialog(props: ShowOpenDocumentDialogProps) {
  Dialog.create({
    component: OpenDocumentDialog,
    // props forwarded to your custom component
    componentProps: {
      ...props,
      persistent: true,
    }
  }).onOk(() => {
    console.log('OpenDocumentDialog: OK')
  }).onCancel(() => {
    console.log('OpenDocumentDialog: Cancel')
  }).onDismiss(() => {
    console.log('OpenDocumentDialog dismissed')
  })
}