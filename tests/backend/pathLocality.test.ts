import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  localizeDocumentPath,
  localizePath,
} from '../../packages/backend/src/filesystem';

describe('backend document path localization', () => {
  it('resolves renderer project-relative paths on the host filesystem', () => {
    const project = process.platform === 'win32'
      ? 'C:\\projects\\book'
      : '/projects/book';

    expect(localizeDocumentPath('chapters/one.md', project)).toBe(
      join(project, 'chapters', 'one.md'),
    );
  });

  it('preserves an absolute file URL across a renderer/backend round trip', () => {
    const path = join(process.cwd(), 'chapter one.md');
    expect(localizeDocumentPath(pathToFileURL(path).href, '/ignored')).toBe(
      path,
    );
  });

  it('localizes encoded URL characters without treating percent signs as syntax', () => {
    const path = join(process.cwd(), '100%draft #1.md');
    expect(localizePath(pathToFileURL(path).href)).toBe(path);
  });
});
