import { describe, expect, it } from 'vitest';
import {
  computeProjectConfiguration,
  getNextProjectComponent,
  getNextProjectComponentAcrossContainers,
  getParentProjectComponent,
  getPreviousProjectComponent,
  getPreviousProjectComponentAcrossContainers,
  type PundokEditorProject,
  type ProjectComponent,
} from '../src/config/project';
import { PundokEditorConfig } from '../src/config/editorConfiguration';
import type { ConfigurationPruning } from '../src/config/editorConfigInit';
import { serializeProject } from '../src/config/jsonStringify';

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

describe('project utilities', () => {
  it('returns the previous and next sibling in a nested children array', () => {
    expect(getPreviousProjectComponent(structure, 'chapter-two.md')).toEqual({
      src: 'chapter-one.md',
    });

    expect(getNextProjectComponent(structure, 'chapter-two.md')).toEqual({
      src: 'chapter-three.md',
    });
  });

  it('serializes project editorConfig fields and items in the defined order', () => {
    const project = {
      name: 'project',
      path: '/projects/test',
      rootDocument: 'index.md',
      editorConfig: {
        outputConverters: [
          { name: 'z-output', type: 'pandoc', format: 'html' },
        ],
        inputConverters: [{ name: 'z-input', type: 'pandoc', format: 'html' }],
        rawBlocks: [{ format: 'html', title: 'z-block', content: 'x' }],
        rawInlines: [{ format: 'html', title: 'z-inline', content: 'x' }],
        defaultRawFormat: 'html',
        automations: [
          { name: 'z-filter', type: 'pandoc-filter' },
          { name: 'a-search', type: 'search-replace' },
          { name: 'z-selection', type: 'elements-selection' },
          { name: 'a-search-later', type: 'search-replace' },
        ],
        customMetadata: [{ name: 'z-metadata' }],
        customAttributes: [{ name: 'z-attribute' }],
        customClasses: [{ name: 'z-class' }],
        customStyles: [{ name: 'z-style', appliesTo: ['span'] }],
        customCss: ['z.css'],
        indices: [{ indexName: 'z-index', refClass: 'z-index-ref' }],
        noteStyles: [{ noteType: 'z-note' }],
        autoDelimiters: {
          SingleQuote: ['“', '”'],
          DoubleQuote: ['„', '“'],
        },
        documentTemplate: 'template.json',
        mainFormats: ['html'],
        copyFormat: 'html',
        workingFormat: 'markdown',
      },
    } as PundokEditorProject;

    const serialized = JSON.parse(serializeProject(project));

    expect(Object.keys(serialized.editorConfig)).toEqual([
      'workingFormat',
      'copyFormat',
      'mainFormats',
      'documentTemplate',
      'autoDelimiters',
      'noteStyles',
      'indices',
      'customCss',
      'customStyles',
      'customClasses',
      'customAttributes',
      'customMetadata',
      'automations',
      'defaultRawFormat',
      'rawInlines',
      'rawBlocks',
      'inputConverters',
      'outputConverters',
    ]);
    expect(
      serialized.editorConfig.customStyles.map(
        (item: { name: string }) => item.name,
      ),
    ).toEqual(['z-style']);
    expect(
      serialized.editorConfig.automations.map(
        (item: { name: string }) => item.name,
      ),
    ).toEqual(['a-search', 'a-search-later', 'z-selection', 'z-filter']);
  });

  describe('project configuration computation', () => {
    it('merges inherited configurations and removes the requested inherited elements', async () => {
      const baseConfiguration = new PundokEditorConfig({
        name: 'base',
        version: [1],
        customStyles: [
          { name: 'kept-style', appliesTo: ['span'] },
          { name: 'removed-style', appliesTo: ['span'] },
        ],
        customCss: ['kept.css', 'removed.css'],
        indices: [
          { indexName: 'kept-index', refClass: 'kept-index-ref' },
          { indexName: 'removed-index', refClass: 'removed-index-ref' },
        ],
        inputConverters: [
          {
            name: 'kept-input',
            type: 'pandoc',
            format: 'markdown',
            extensions: [],
          },
          {
            name: 'removed-input',
            type: 'pandoc',
            format: 'html',
            extensions: [],
          },
        ],
        outputConverters: [
          {
            name: 'kept-output',
            type: 'pandoc',
            format: 'markdown',
            extension: 'md',
          },
          {
            name: 'removed-output',
            type: 'pandoc',
            format: 'html',
            extension: 'html',
          },
        ],
        automations: [
          { name: 'kept-automation', type: 'search-replace' },
          { name: 'removed-automation', type: 'search-replace' },
        ],
      });
      const pruning = {
        customStyles: ['removed-style'],
        customCss: ['removed.css'],
        indices: ['removed-index'],
        inputConverters: ['removed-input'],
        outputConverters: ['removed-output'],
        automations: ['removed-automation'],
      } as ConfigurationPruning;
      const project: PundokEditorProject = {
        name: 'project',
        description: 'A test project',
        path: '/projects/test',
        rootDocument: 'index.md',
        configurations: ['base'],
        editorConfig: { remove: pruning },
      };

      const computedProject = await computeProjectConfiguration(
        project,
        async (configurationName) =>
          configurationName === 'base' ? baseConfiguration : undefined,
      );

      expect(computedProject.computedConfig?.customStyles).toEqual([
        { name: 'kept-style', appliesTo: ['span'] },
      ]);
      expect(computedProject.computedConfig?.customCss).toEqual(['kept.css']);
      expect(computedProject.computedConfig?.indices).toEqual([
        { indexName: 'kept-index', refClass: 'kept-index-ref' },
      ]);
      expect(
        computedProject.computedConfig?.inputConverters?.map(
          (converter) => converter.name,
        ),
      ).toEqual(['kept-input']);
      expect(
        computedProject.computedConfig?.outputConverters?.map(
          (converter) => converter.name,
        ),
      ).toEqual(['kept-output']);
      expect(
        computedProject.computedConfig?.automations?.map(
          (automation) => automation.name,
        ),
      ).toEqual(['kept-automation']);
    });

    it('retains project-defined values while pruning inherited values', async () => {
      const inheritedConfiguration = new PundokEditorConfig({
        name: 'base',
        version: [1],
        customClasses: [
          { name: 'inherited-class' },
          { name: 'overridden-class' },
        ],
        noteStyles: [
          { noteType: 'inherited-note' },
          { noteType: 'overridden-note' },
        ],
      });
      const project: PundokEditorProject = {
        name: 'project',
        path: '/projects/test',
        rootDocument: 'index.md',
        configurations: ['base'],
        editorConfig: {
          customClasses: [
            { name: 'project-class' },
            { name: 'overridden-class' },
          ],
          noteStyles: [
            { noteType: 'project-note' },
            { noteType: 'overridden-note', textColor: 'blue' },
          ],
          remove: {
            customClasses: ['inherited-class'],
            noteStyles: ['inherited-note'],
          } as ConfigurationPruning,
        },
      };

      const computedProject = await computeProjectConfiguration(
        project,
        async () => inheritedConfiguration,
      );

      expect(computedProject.computedConfig?.customClasses).toEqual(
        expect.arrayContaining([
          { name: 'project-class' },
          { name: 'overridden-class' },
        ]),
      );
      expect(computedProject.computedConfig?.customClasses).toHaveLength(2);
      expect(computedProject.computedConfig?.noteStyles).toEqual(
        expect.arrayContaining([
          { noteType: 'project-note' },
          { noteType: 'overridden-note', textColor: 'blue' },
        ]),
      );
      expect(computedProject.computedConfig?.noteStyles).toHaveLength(2);
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
