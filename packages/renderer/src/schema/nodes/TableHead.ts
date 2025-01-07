import { mergeAttributes, Node } from '@tiptap/core';
import { NODE_NAME_TABLE_HEAD, TABLE_ROLE_HEAD } from '../../common';

export interface TableHeadOptions {
  HTMLAttributes: Record<string, any>;
}

export const TableHead = Node.create<TableHeadOptions>({
  name: NODE_NAME_TABLE_HEAD,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  content: 'tableRow+',

  tableRole: TABLE_ROLE_HEAD,

  parseHTML() {
    return [{ tag: 'thead' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'thead',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});
