import { mergeAttributes, Node } from '@tiptap/core';
import { NODE_NAME_DEFINITION_LIST } from '../../common';

export interface DefinitionListOptions {
  HTMLAttributes: Record<string, any>
}

export const DefinitionList = Node.create<DefinitionListOptions>({
  name: NODE_NAME_DEFINITION_LIST,
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
