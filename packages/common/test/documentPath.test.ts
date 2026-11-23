import { describe, expect, it } from 'vitest';
import {
  documentLocation,
  documentPathBaseName,
  documentPathDirName,
  documentPathFromFileUrl,
  documentPathRoot,
  documentPathsEqual,
  documentPathToFileUrl,
  isDocumentPathAbsolute,
  joinDocumentPath,
  normalizeDocumentPath,
  relativeDocumentPath,
  resolveDocumentContextPath,
  resolveDocumentPath,
  splitFolderAndDoc,
} from '../src';
import { projectSourceVariants } from '../src/config/project';

describe('universal document paths', () => {
  it.each([
    [
      'C:\\Users\\Alice\\Documents\\draft.md',
      'C:/Users/Alice/Documents/draft.md',
    ],
    ['c:/users/alice/project', 'C:/users/alice/project'],
    ['/home/alice/project/draft.md', '/home/alice/project/draft.md'],
    ['/Users/alice/project/draft.md', '/Users/alice/project/draft.md'],
    ['chapter\\section\\draft.md', 'chapter/section/draft.md'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeDocumentPath(input)).toBe(expected);
  });

  it('handles Linux file URLs', () => {
    expect(documentPathFromFileUrl('file:///home/alice/draft.md')).toBe(
      '/home/alice/draft.md',
    );
    expect(documentPathToFileUrl('/home/alice/draft.md')).toBe(
      'file:///home/alice/draft.md',
    );
  });

  it('normalizes legacy file URLs whose path is entirely encoded', () => {
    expect(documentPathFromFileUrl('file://%2Ftmp%2Frecent.md')).toBe(
      '/tmp/recent.md',
    );
    expect(documentPathFromFileUrl('file://%2FC%3A%5Cproject%5Cdraft.md')).toBe(
      'C:/project/draft.md',
    );
  });

  it('preserves UNC roots and localhost file URLs', () => {
    expect(
      documentPathFromFileUrl('file://server/share/project/draft.md'),
    ).toBe('//server/share/project/draft.md');
    expect(
      documentPathFromFileUrl('file://localhost/home/alice/draft.md'),
    ).toBe('/home/alice/draft.md');
    expect(documentPathToFileUrl('\\\\server\\share\\draft #1.md')).toBe(
      'file://server/share/draft%20%231.md',
    );
  });

  it('round trips reserved and malformed percent characters', () => {
    const path = '/home/alice/draft 100% #1?.md';
    expect(documentPathFromFileUrl(documentPathToFileUrl(path))).toBe(path);
  });

  it('handles macOS file URLs', () => {
    expect(documentPathFromFileUrl('file:///Users/alice/draft.md')).toBe(
      '/Users/alice/draft.md',
    );
  });

  it('handles Windows file URLs and native paths', () => {
    expect(documentPathFromFileUrl('file:///C:/Users/Alice/draft.md')).toBe(
      'C:/Users/Alice/draft.md',
    );
    expect(documentPathToFileUrl('C:\\Users\\Alice\\draft.md')).toBe(
      'file:///C:/Users/Alice/draft.md',
    );
  });

  it('handles UNC paths independently of the host OS', () => {
    expect(normalizeDocumentPath('\\\\server\\share\\project')).toBe(
      '//server/share/project',
    );
    expect(documentPathFromFileUrl('file://server/share/project')).toBe(
      '//server/share/project',
    );
  });

  it('compares Windows paths case-insensitively', () => {
    expect(
      documentPathsEqual(
        'C:\\Users\\Alice\\Draft.md',
        'file:///c:/users/alice/draft.md',
      ),
    ).toBe(true);
    expect(
      documentPathsEqual(
        'C:\\Users\\Alice\\Draft.md',
        'c:/Users/alice/Draft.md',
      ),
    ).toBe(true);
  });

  it('compares Unix and macOS paths case-sensitively', () => {
    expect(
      documentPathsEqual('/home/Alice/draft.md', '/home/alice/draft.md'),
    ).toBe(false);
    expect(
      documentPathsEqual('/Users/Alice/draft.md', '/Users/alice/draft.md'),
    ).toBe(false);
  });

  it('extracts a consistent basename and directory', () => {
    expect(documentPathBaseName('C:\\project\\draft.md')).toBe('draft.md');
    expect(documentPathDirName('C:\\project\\draft.md')).toBe('C:/project');
    expect(documentPathBaseName('/Users/alice/draft.md')).toBe('draft.md');
    expect(documentPathDirName('/Users/alice/draft.md')).toBe('/Users/alice');
  });

  it('joins and resolves relative paths without node:path', () => {
    expect(joinDocumentPath('C:\\project\\', 'chapter/draft.md')).toBe(
      'C:/project/chapter/draft.md',
    );
    expect(resolveDocumentPath('/project', './chapter/../draft.md')).toBe(
      '/project/draft.md',
    );
    expect(resolveDocumentPath('C:/project', 'chapter/../draft.md')).toBe(
      'C:/project/draft.md',
    );
    expect(
      resolveDocumentPath('//server/share/project', '../../draft.md'),
    ).toBe('//server/share/draft.md');
  });

  it('resolves document paths relative to their project base', () => {
    expect(
      resolveDocumentContextPath('chapter/draft.md', 'C:\\projects\\book'),
    ).toBe('C:/projects/book/chapter/draft.md');
    expect(
      resolveDocumentContextPath(
        'chapter/draft.md',
        '/Users/alice/projects/book',
      ),
    ).toBe('/Users/alice/projects/book/chapter/draft.md');
    expect(
      resolveDocumentContextPath(
        'file:///home/alice/other/draft.md',
        '/home/alice/projects/book',
      ),
    ).toBe('/home/alice/other/draft.md');
  });

  it('computes roots, absoluteness, and relative paths for every platform', () => {
    expect(isDocumentPathAbsolute('C:\\project\\draft.md')).toBe(true);
    expect(isDocumentPathAbsolute('/Users/alice/draft.md')).toBe(true);
    expect(isDocumentPathAbsolute('chapter/draft.md')).toBe(false);
    expect(documentPathRoot('C:\\project\\draft.md')).toBe('C:/');
    expect(documentPathRoot('\\\\server\\share\\draft.md')).toBe(
      '//server/share/',
    );
    expect(
      relativeDocumentPath('C:\\Project', 'c:/project/Chapter/draft.md'),
    ).toBe('Chapter/draft.md');
    expect(
      relativeDocumentPath(
        '/Users/alice/project',
        '/Users/alice/project/chapter/draft.md',
      ),
    ).toBe('chapter/draft.md');
    expect(
      relativeDocumentPath(
        '//server/share/project',
        '//SERVER/SHARE/chapter/draft.md',
      ),
    ).toBe('../chapter/draft.md');
  });

  it('does not convert HTTP URLs into file paths', () => {
    expect(documentLocation('https://example.com/project/draft.md')).toEqual({
      kind: 'url',
      value: 'https://example.com/project/draft.md',
    });
  });

  it('splits all platform forms consistently', () => {
    expect(splitFolderAndDoc('C:\\project\\draft.md')).toEqual({
      folder: 'C:/project',
      document: 'draft.md',
    });
    expect(splitFolderAndDoc('file:///Users/alice/draft.md')).toEqual({
      folder: '/Users/alice',
      document: 'draft.md',
    });
  });

  it('creates absolute and project-relative source variants', () => {
    expect([
      ...projectSourceVariants(
        'file:///C:/project/chapter/draft.md',
        'C:\\project',
      ),
    ]).toEqual(['C:/project/chapter/draft.md', 'chapter/draft.md']);
    expect([
      ...projectSourceVariants('c:/PROJECT/chapter/draft.md', 'C:\\project'),
    ]).toContain('chapter/draft.md');
    expect([...projectSourceVariants('./chapter/draft.md')]).toEqual([
      'chapter/draft.md',
    ]);
  });

  it('preserves literal malformed percent sequences', () => {
    expect(normalizeDocumentPath('/project/100%draft.md')).toBe(
      '/project/100%draft.md',
    );
  });
});
