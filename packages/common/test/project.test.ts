import { describe, expect, it } from 'vitest';
import {
  getNextProjectComponent,
  getNextProjectComponentAcrossContainers,
  getParentProjectComponent,
  getPreviousProjectComponent,
  getPreviousProjectComponentAcrossContainers,
  type ProjectComponent,
} from '../src/config/project';

const structure: ProjectComponent = {
  id: 'root',
  children: [
    { src: 'introduction.md' },
    {
      id: 'part-one',
      children: [
        { src: 'chapter-one.md' },
        { src: 'chapter-two.md' },
        { src: 'chapter-three.md' },
      ],
    },
    {
      id: 'part-two',
      children: [{ src: 'chapter-four.md' }],
    },
    { src: 'appendix.md' },
  ],
};

describe('project component siblings', () => {
  it('returns the previous and next sibling in a nested children array', () => {
    expect(getPreviousProjectComponent(structure, 'chapter-two.md')).toEqual({
      src: 'chapter-one.md',
    });
    expect(getNextProjectComponent(structure, 'chapter-two.md')).toEqual({
      src: 'chapter-three.md',
    });
  });

  it('returns undefined at the boundaries of a children array', () => {
    expect(
      getPreviousProjectComponent(structure, 'introduction.md'),
    ).toBeUndefined();
    expect(getNextProjectComponent(structure, 'appendix.md')).toBeUndefined();
  });

  it('returns undefined when the source is not a child document', () => {
    expect(
      getPreviousProjectComponent(structure, 'missing.md'),
    ).toBeUndefined();
    expect(getNextProjectComponent(structure, 'root')).toBeUndefined();
  });

  it('returns the direct parent of a nested document', () => {
    expect(getParentProjectComponent(structure, 'chapter-two.md')).toEqual({
      id: 'part-one',
      children: [
        { src: 'chapter-one.md' },
        { src: 'chapter-two.md' },
        { src: 'chapter-three.md' },
      ],
    });
    expect(getParentProjectComponent(structure, 'introduction.md')).toBe(
      structure,
    );
  });

  it('returns undefined for the root or an unknown source', () => {
    expect(getParentProjectComponent(structure, 'root')).toBeUndefined();
    expect(getParentProjectComponent(structure, 'missing.md')).toBeUndefined();
  });

  it('crosses to the first child of the next container', () => {
    expect(
      getNextProjectComponentAcrossContainers(structure, 'chapter-three.md'),
    ).toEqual({ src: 'chapter-four.md' });
    expect(
      getNextProjectComponentAcrossContainers(structure, 'chapter-four.md'),
    ).toEqual({
      src: 'appendix.md',
    });
  });

  it('crosses to the last child of the previous container', () => {
    expect(
      getPreviousProjectComponentAcrossContainers(structure, 'chapter-one.md'),
    ).toEqual({ src: 'introduction.md' });
    expect(
      getPreviousProjectComponentAcrossContainers(
        structure,
        'chapter-three.md',
      ),
    ).toEqual({ src: 'chapter-two.md' });
    expect(
      getPreviousProjectComponentAcrossContainers(structure, 'chapter-four.md'),
    ).toEqual({ src: 'chapter-three.md' });
  });

  it('returns undefined when no component exists in the requested direction', () => {
    expect(
      getPreviousProjectComponentAcrossContainers(structure, 'introduction.md'),
    ).toBeUndefined();
    expect(
      getNextProjectComponentAcrossContainers(structure, 'appendix.md'),
    ).toBeUndefined();
    expect(
      getNextProjectComponentAcrossContainers(structure, 'missing.md'),
    ).toBeUndefined();
  });
});
