import { mergeAttributes, Node } from '@tiptap/core';

export interface TableFootOptions {
  HTMLAttributes: Record<string, any>;
}

export const TableFoot = Node.create<TableFootOptions>({
  name: 'tableFoot',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  content: 'tableRow+',

  tableRole: 'foot',

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
