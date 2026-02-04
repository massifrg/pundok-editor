import { Editor } from '@tiptap/core'
import { Dialog } from 'quasar'
import { getDocState } from '../../schema'

export function showDocStateDialog(editor: Editor) {
  const docState = getDocState(editor.state)
  if (docState) {
    const fields: (keyof typeof docState)[] = [
      'documentName',
      'inputFolder',
      'inputFormat',
      'outputFolder',
      'outputFormat',
      'copyFolder',
      'copyFormat',
      'imagesFolder',
      'imagesFormat',
      'unsavedChanges',
      'unsavedChangesAsCopy',
      'resourcePath',
    ]
    let lines: string[] = fields.map(f => `<th>${f}</th><td>${JSON.stringify(docState[f])}</td>`)
    lines.push(`<th>project</th><td>${JSON.stringify(docState.project?.name)}</td>`)
    lines.push(`<th>configurationName</th><td>${JSON.stringify(docState.configuration?.name)}</td>`)
    lines = lines.map(line => `<tr>${line}</tr>`)

    Dialog.create({
      title: 'DocState',
      message: '<table>' + lines.join('\n') + '</table>',
      html: true,
      fullWidth: true,
    }).onOk(() => {
      // console.log('OK')
    }).onCancel(() => {
      // console.log('Cancel')
    }).onDismiss(() => {
      // console.log('I am triggered on both OK and Cancel')
    })
  }
}
