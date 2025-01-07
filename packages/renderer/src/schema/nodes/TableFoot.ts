import { mergeAttributes, Node } from '@tiptap/core';
import { NODE_NAME_TABLE_FOOT, TABLE_ROLE_FOOT } from '../../common';

export interface TableFootOptions {
  HTMLAttributes: Record<string, any>;
}

export const TableFoot = Node.create<TableFootOptions>({
  name: NODE_NAME_TABLE_FOOT,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  content: 'tableRow+',

  tableRole: TABLE_ROLE_FOOT,

  parseHTML() {
    return [{ tag: 'tfoot' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'tfoot',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});
