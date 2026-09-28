import { IPC_VALUE_WINDOW_TITLE } from '../common';
import type { Backend } from './backend';

export async function setWindowTitle(
  title: string,
  backend?: Pick<Backend, 'setValue'> | null,
): Promise<void> {
  if (window.ipc) {
    await backend?.setValue(IPC_VALUE_WINDOW_TITLE, title);
    return;
  }
  document.title = title;
}
