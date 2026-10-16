export { default as OpenDocumentDialog } from './OpenDocumentDialog.vue'

// Re-export the dialog mode type as a local type alias because
// TypeScript's `.vue` module typings don't expose named type exports.
export type DocumentDialogMode = 'open' | 'save' | 'save-copy' | 'import' | 'include' | 'folder' | 'image'

export { default as PromptDialog } from './PromptDialog.vue'