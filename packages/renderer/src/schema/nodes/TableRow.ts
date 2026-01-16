// copied and modified from tiptap sources

import { mergeAttributes, Node } from '@tiptap/core'
import {
  NODE_NAME_TABLE_CELL,
  NODE_NAME_TABLE_HEADER,
  NODE_NAME_TABLE_ROW,
  TABLE_ROLE_ROW
} from '../../common'

export interface TableRowOptions {
  HTMLAttributes: Record<string, any>
}

export const TableRow = Node.create<TableRowOptions>({
  name: NODE_NAME_TABLE_ROW,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  content: `(${NODE_NAME_TABLE_CELL} | ${NODE_NAME_TABLE_HEADER})*`,

  tableRole: TABLE_ROLE_ROW,

  parseHTML() {
    return [{ tag: 'tr' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['tr', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },
})
