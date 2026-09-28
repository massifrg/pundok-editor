import { afterEach, describe, expect, it, vi } from 'vitest';
import { IPC_VALUE_WINDOW_TITLE } from '../src/common';
import { setWindowTitle } from '../src/backend/windowTitle';

describe('setWindowTitle', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the title to the backend in Electron mode', async () => {
    const setValue = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('window', { ipc: {} });

    await expect(setWindowTitle('document.md', { setValue })).resolves.toBeUndefined();

    expect(setValue).toHaveBeenCalledWith(IPC_VALUE_WINDOW_TITLE, 'document.md');
  });

  it('sets the browser tab title without using the backend', async () => {
    const setValue = vi.fn().mockResolvedValue(undefined);
    const browserDocument = { title: '' };
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', browserDocument);

    await expect(setWindowTitle('document.md', { setValue })).resolves.toBeUndefined();

    expect(browserDocument.title).toBe('document.md');
    expect(setValue).not.toHaveBeenCalled();
  });
});
