import { mergeAttributes, Node } from '@tiptap/core';

export interface DefinitionListOptions {
  HTMLAttributes: Record<string, any>
}

export const DefinitionList = Node.create<DefinitionListOptions>({
  name: 'definitionList',
  content: '(definitionTerm definitionData+)+',
  group: 'block',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [{ tag: 'dl' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['dl', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
});
