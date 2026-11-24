import { describe, expect, it } from 'vitest';
import { makeProjectConfigPathsRelative } from '../src/components/projectConfigPaths';

describe('makeProjectConfigPathsRelative', () => {
  const projectPath = '/projects/book';

  it('makes project file paths relative and resource references path-less', () => {
    const config = {
      documentTemplate: '/projects/book/templates/local.html',
      customCss: ['/projects/book/styles/editor.css'],
      outputConverters: [
        {
          type: 'pandoc' as const,
          name: 'pdf',
          format: 'pdf',
          resultFile: '/projects/book/build/book.pdf',
          filters: [
            '/configs/base/filters/diagram.lua',
            { name: '/configs/base/filters/citations.lua' },
          ],
          pandocOptions: [
            ['reference-doc', '/projects/book/templates/reference.docx'],
          ] as [string, string][],
        },
      ],
      automations: [
        {
          type: 'pandoc-filter' as const,
          name: 'transform',
          filters: ['/configs/base/filters/cleanup.lua'],
          sources: ['/projects/book/source.md'],
        },
      ],
    };

    expect(makeProjectConfigPathsRelative(projectPath, config)).toEqual({
      documentTemplate: 'templates/local.html',
      customCss: ['styles/editor.css'],
      outputConverters: [
        {
          type: 'pandoc',
          name: 'pdf',
          format: 'pdf',
          resultFile: 'build/book.pdf',
          filters: ['diagram.lua', { name: 'citations.lua' }],
          pandocOptions: [['reference-doc', 'templates/reference.docx']],
        },
      ],
      automations: [
        {
          type: 'pandoc-filter',
          name: 'transform',
          filters: ['cleanup.lua'],
          sources: ['source.md'],
        },
      ],
    });
  });

  it('does not rewrite non-path values or path-less resources', () => {
    const config = {
      customCss: ['styles/editor.css'],
      outputConverters: [
        {
          type: 'script' as const,
          name: 'script',
          command: 'convert',
          commandArgs: ['--input', '/external/input.md'],
          resultFile: 'output.pdf',
        },
      ],
    };

    expect(makeProjectConfigPathsRelative(projectPath, config)).toEqual(config);
  });
});
