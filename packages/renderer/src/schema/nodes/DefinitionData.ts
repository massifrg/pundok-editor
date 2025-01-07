import { mergeAttributes, Node } from '@tiptap/core';
import { NODE_NAME_DEFINITION_DATA } from '../../common';

export interface DefinitionDataOptions {
  HTMLAttributes: Record<string, any>;
}

export const DefinitionData = Node.create<DefinitionDataOptions>({
  name: NODE_NAME_DEFINITION_DATA,
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
