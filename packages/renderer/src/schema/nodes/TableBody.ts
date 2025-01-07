import { mergeAttributes, Node } from '@tiptap/core';
import { NODE_NAME_TABLE_BODY, TABLE_ROLE_BODY } from '../../common';

export interface TableBodyOptions {
  HTMLAttributes: Record<string, any>;
}

export const TableBody = Node.create<TableBodyOptions>({
  name: NODE_NAME_TABLE_BODY,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  content: 'tableRow+',

  tableRole: TABLE_ROLE_BODY,

  addAttributes() {
    return {
      headRows: {
        default: 0,
      },
      rowHeadColumns: {
        default: 0,
        // parseHTML: (e) => 0,
        // renderHTML: (attrs) => {}
      },
    };
  },

  parseHTML() {
    return [{ tag: 'tbody' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'tbody',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});
