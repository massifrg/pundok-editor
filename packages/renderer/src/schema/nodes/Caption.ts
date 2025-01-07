import { mergeAttributes, Node } from '@tiptap/core';
import { NODE_NAME_CAPTION, TABLE_ROLE_CAPTION } from '../../common';

export interface CaptionOptions {
  HTMLAttributes: Record<string, any>;
}

export const Caption = Node.create({
  name: NODE_NAME_CAPTION,
  content: 'shortCaption? block+',
  isolating: true,
  tableRole: TABLE_ROLE_CAPTION,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'table-caption',
      },
    };
  },

  parseHTML() {
    return [{ tag: 'caption' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'caption',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});
