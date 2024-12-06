import { mergeAttributes, Node } from '@tiptap/core';

export interface DefinitionTermOptions {
  HTMLAttributes: Record<string, any>;
}

export const DefinitionTerm = Node.create<DefinitionTermOptions>({
  name: 'definitionTerm',
  content: 'inline*',
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [{ tag: 'dt' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'dt',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});
