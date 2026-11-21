import { describe, expect, it } from 'vitest';
import type { CxDocument } from '../../packages/common/src';
import { bookmarksForDocument } from '../../packages/backend/src/handlers/openDocument';

describe('bookmarksForDocument', () => {
  it('remembers a project without a root document using the opened document', () => {
    const bookmarks = bookmarksForDocument({
      path: '/projects/notes/notes.md',
      content: '',
      project: {
        name: 'Notes',
        path: '/projects/notes',
        rootDocument: '',
        editorConfig: {},
      },
    } satisfies CxDocument);

    expect(bookmarks).toContainEqual(
      expect.objectContaining({
        type: 'project',
        name: 'Notes',
        url: 'file:///projects/notes/notes.md',
      }),
    );
  });

  it('remembers a project with a root document using that document', () => {
    const bookmarks = bookmarksForDocument({
      path: '/projects/notes/chapter.md',
      content: '',
      project: {
        name: 'Notes',
        path: '/projects/notes',
        rootDocument: 'index.md',
        editorConfig: {},
      },
    } satisfies CxDocument);

    expect(bookmarks).toContainEqual(
      expect.objectContaining({
        type: 'project',
        name: 'Notes',
        url: 'file:///projects/notes/index.md',
      }),
    );
  });

  it('creates portable Windows bookmark paths', () => {
    const bookmarks = bookmarksForDocument({
      path: 'C:\\Projects\\notes\\chapter.md',
      content: '',
      project: {
        name: 'Notes',
        path: 'C:\\Projects\\notes',
        rootDocument: 'index.md',
        editorConfig: {},
      },
    } satisfies CxDocument);

    expect(bookmarks).toEqual([
      expect.objectContaining({
        type: 'document',
        url: 'file:///C:/Projects/notes/chapter.md',
      }),
      expect.objectContaining({
        type: 'project',
        url: 'file:///C:/Projects/notes/index.md',
      }),
    ]);
  });
});
