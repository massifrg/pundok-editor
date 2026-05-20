import { createPinia } from 'pinia';

export { useActions } from './ActionsStore';
export { useBackend } from './BackendStore';
export { useNotes } from './NotesStore';
export { useProjectCache } from './ProjectCacheStore';
export type { PundokEditorConfig } from '../common';

export default async function createStore() {
  return createPinia()
}