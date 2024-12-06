import { mergeAttributes, Node } from '@tiptap/core';

export interface TableHeadOptions {
  HTMLAttributes: Record<string, any>;
}

export const TableHead = Node.create<TableHeadOptions>({
  name: 'tableHead',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  content: 'tableRow+',

  tableRole: 'head',

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
