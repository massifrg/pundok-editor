// copied from tiptap sources

import { mergeAttributes, Node } from '@tiptap/core'
import { NODE_NAME_TABLE_HEADER, TABLE_ROLE_HEADER_CELL } from '../../common'

export interface TableHeaderOptions {
  HTMLAttributes: Record<string, any>
}

export const TableHeader = Node.create<TableHeaderOptions>({
  name: NODE_NAME_TABLE_HEADER,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  content: 'block+',

  addAttributes() {
    return {
      colspan: {
        default: 1,
      },
      rowspan: {
        default: 1,
      },
      colwidth: {
        default: null,
        parseHTML: element => {
          const colwidth = element.getAttribute('colwidth')
          const value = colwidth ? colwidth.split(',').map(width => parseInt(width, 10)) : null

          return value
        },
      },
    }
  },

  tableRole: TABLE_ROLE_HEADER_CELL,

  isolating: true,

  parseHTML() {
    return [{ tag: 'th' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['th', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },
})
