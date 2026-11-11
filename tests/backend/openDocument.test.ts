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

    expect(bookmarks).toContainEqual({
      type: 'project',
      name: 'Notes',
      url: 'file:///projects/notes/notes.md',
    });
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

    expect(bookmarks).toContainEqual({
      type: 'project',
      name: 'Notes',
      url: 'file:///projects/notes/index.md',
    });
  });
});
