// copied and modified from tiptap sources

import { mergeAttributes, Node } from '@tiptap/core'
import { NODE_NAME_TABLE_CELL, TABLE_ROLE_CELL } from '../../common'

export interface TableCellOptions {
  HTMLAttributes: Record<string, any>
}

export const TableCell = Node.create<TableCellOptions>({
  name: NODE_NAME_TABLE_CELL,

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

          // if there is no colwidth attribute on the cell, try to get it from the colgroup
          if (!value) {
            const cols = element.closest('table')?.querySelectorAll('colgroup > col')
            const cellIndex = Array.from(element.parentElement?.children || []).indexOf(element)

            if (cellIndex && cellIndex > -1 && cols && cols[cellIndex]) {
              const colWidth = cols[cellIndex].getAttribute('width')
              return colWidth ? [parseInt(colWidth, 10)] : null
            }
          }

          return value
        },
      },
    }
  },

  tableRole: TABLE_ROLE_CELL,

  isolating: true,

  parseHTML() {
    return [{ tag: 'td' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['td', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },
})
