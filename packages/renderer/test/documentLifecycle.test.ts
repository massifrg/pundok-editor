// @vitest-environment happy-dom

import { describe, expect, it, vi } from 'vitest';
import { loadDocument } from '../src/components/editor/documentLifecycle';

describe('loadDocument', () => {
  it('keeps the previous DocState when loading is deferred for unsaved changes', async () => {
    const previousDocState = {
      documentName: 'current.md',
      workingFolder: '/documents',
      unsavedChanges: true,
    };
    const host = {
      documentLoading: false,
      askToSaveChanges: true,
      docState: () => previousDocState,
      setPendingBeforeLoadDoc: vi.fn(),
      updateEditorDocState: vi.fn(),
      editor: {
        destroy: vi.fn(),
      },
    };
    const doc = {
      path: '/documents/next.md',
      content: '{"pandoc-api-version":[1,23,1,2],"meta":{},"blocks":[]}',
    };

    await expect(loadDocument(host, doc)).rejects.toBe('operation pending...');

    expect(host.documentLoading).toBe(false);
    expect(host.docState()).toBe(previousDocState);
    expect(host.setPendingBeforeLoadDoc).toHaveBeenCalledWith({ doc });
    expect(host.editor.destroy).not.toHaveBeenCalled();
    expect(host.updateEditorDocState).not.toHaveBeenCalled();
  });
});
