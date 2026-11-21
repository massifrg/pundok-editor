import { reactive } from 'vue';
import { describe, expect, it } from 'vitest';
import { plainIpcValue } from '../src/backend/ipcValue';

describe('LocalBackend IPC values', () => {
  it('removes Vue proxies from SyncTeX project payloads', () => {
    const project = reactive({
      name: 'Book',
      path: 'C:/projects/book',
      rootDocument: 'index.md',
      editorConfig: {},
      computedConfig: {
        name: 'book',
        workingFormat: 'json',
      },
    });

    expect(() => structuredClone(project)).toThrow();

    const plain = plainIpcValue(project);
    expect(() => structuredClone(plain)).not.toThrow();
    expect(plain).toEqual(project);
    expect(plain).not.toBe(project);
  });
});
