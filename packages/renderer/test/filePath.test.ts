import { describe, expect, it } from 'vitest';
import {
  filePathBaseName,
  filePathDirName,
  filePathWithChild,
  filePathsEqual,
} from '../src/components/helpers/filePath';

describe('file path helpers', () => {
  it('compares Windows paths independently of separators and case', () => {
    expect(
      filePathsEqual('C:\\Users\\Alice\\project', 'c:/users/alice/project'),
    ).toBe(true);
  });

  it('keeps Unix path comparisons case-sensitive', () => {
    expect(filePathsEqual('/home/alice/project', '/home/Alice/project')).toBe(
      false,
    );
  });

  it('extracts names and directories from Windows paths', () => {
    const path = 'C:\\Users\\Alice\\project\\document.md';

    expect(filePathDirName(path)).toBe('C:/Users/Alice/project');
    expect(filePathBaseName(path)).toBe('document.md');
  });

  it('joins a child path with normalized separators', () => {
    expect(
      filePathWithChild('C:\\Users\\Alice\\project\\', 'document.md'),
    ).toBe('C:/Users/Alice/project/document.md');
  });
});
