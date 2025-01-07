import { mergeAttributes, Node } from '@tiptap/core';
import { NODE_NAME_DEFINITION_TERM } from '../../common';

export interface DefinitionTermOptions {
  HTMLAttributes: Record<string, any>;
}

export const DefinitionTerm = Node.create<DefinitionTermOptions>({
  name: NODE_NAME_DEFINITION_TERM,
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
