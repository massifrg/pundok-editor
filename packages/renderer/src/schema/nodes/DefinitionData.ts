import { mergeAttributes, Node } from '@tiptap/core';

export interface DefinitionDataOptions {
  HTMLAttributes: Record<string, any>;
}

export const DefinitionData = Node.create<DefinitionDataOptions>({
  name: 'definitionData',
  content: 'block*',
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [{ tag: 'dd' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'dd',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});
