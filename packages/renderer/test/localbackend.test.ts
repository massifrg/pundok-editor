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

  it('removes proxies recursively from arrays and nested options', () => {
    const options = reactive({
      project: reactive({
        path: 'C:/projects/book',
        rootDocument: 'index.md',
      }),
      paths: reactive(['chapter.md', 'images/figure.png']),
    });

    const plain = plainIpcValue(options);
    expect(() => structuredClone(plain)).not.toThrow();
    expect(plain).toEqual(options);
    expect(plain.paths).not.toBe(options.paths);
    expect(plain.project).not.toBe(options.project);
  });

  it('preserves undefined scalar-like values', () => {
    expect(plainIpcValue(undefined)).toBeUndefined();
  });
});
