import { mergeAttributes, Node } from '@tiptap/core';

export interface TableBodyOptions {
  HTMLAttributes: Record<string, any>;
}

export const TableBody = Node.create<TableBodyOptions>({
  name: 'tableBody',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  content: 'tableRow+',

  tableRole: 'body',

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
