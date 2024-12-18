import {
  callOrReturn,
  getExtensionField,
  mergeAttributes,
  Node,
  NodeWithPos,
  ParentConfig,
} from '@tiptap/core';
import { chainCommands } from '@tiptap/pm/commands';
import {
  AllSelection,
  EditorState,
  NodeSelection,
  Selection,
  Transaction,
} from '@tiptap/pm/state';
import {
  Fragment,
  NodeType,
  Node as PmNode,
  ResolvedPos,
} from '@tiptap/pm/model';
import {
  createPandocTable,
  isCellSelection,
  isTableSection,
} from '../helpers/pandocTable';
import {
  addBodyAfter,
  addBodyBefore,
  addCaption,
  addColSpan,
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  addTableFoot,
  addTableHead,
  CellSelection,
  columnResizing,
  deleteCaption,
  deleteColumn,
  deleteRow,
  deleteSection,
  deleteTable,
  goToNextCell,
  isInTable,
  makeBody,
  makeFoot,
  makeHead,
  mergeCells,
  removeColSpan,
  setCellAttr,
  splitCell,
  tableEditing,
  TableMap,
  tableNodeTypes,
  TableRole,
  toggleHeader,
  toggleHeaderCell,
  setComputedStyleColumnWidths,
} from '@massifrg/prosemirror-tables-sections';
import {
  COLSPEC_ALIGNMENT_FREQ_THRESHOLD,
  PmColSpec,
  pmColSpecsToString,
} from '../helpers/colSpec';
import { EditorView } from '@tiptap/pm/view';
import { TABLE_CELL_ALIGNMENTS, textAlignToPandocAlignment } from '../helpers';
import { Alignment } from '../../pandoc';
import TableRow from '@tiptap/extension-table-row';
import { fill, isEqual } from 'lodash';
import { updateTableAttrsPlugin } from '../helpers/updateTableAttrsPlugin';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pandoctable: {
      insertPandocTable: (options?: {
        rows?: number;
        cols?: number;
        caption?: string;
        headRowsCount?: number;
        footRowsCount?: number;
        rowHeadColumns?: number;
        cellContent?: string | Fragment | PmNode | Array<PmNode>;
        cellContainer?: 'plain' | 'paragraph';
      }) => ReturnType;
      deletePandocTable: () => ReturnType;
      addTableCaption: () => ReturnType;
      deleteTableCaption: () => ReturnType;
      addTableHead: () => ReturnType;
      addTableFoot: () => ReturnType;
      makeTableHead: () => ReturnType;
      makeTableBody: () => ReturnType;
      makeTableFoot: () => ReturnType;
      addTableBodyBefore: () => ReturnType;
      addTableBodyAfter: () => ReturnType;
      addColumnBefore: () => ReturnType;
      addColumnAfter: () => ReturnType;
      deleteColumn: () => ReturnType;
      addRowBefore: () => ReturnType;
      addRowAfter: () => ReturnType;
      deleteRow: () => ReturnType;
      deleteSection: () => ReturnType;
      deleteTable: () => ReturnType;
      increaseColspan: () => ReturnType;
      decreaseColspan: () => ReturnType;
      increaseRowspan: () => ReturnType;
      decreaseRowspan: () => ReturnType;
      mergeCells: () => ReturnType;
      splitCell: () => ReturnType;
      toggleHeaderColumn: () => ReturnType;
      toggleHeaderRow: () => ReturnType;
      toggleHeaderCell: () => ReturnType;
      mergeOrSplit: () => ReturnType;
      setCellAttribute: (name: string, value: any) => ReturnType;
      goToNextCell: () => ReturnType;
      goToPreviousCell: () => ReturnType;
      fixPandocTable: () => ReturnType;
      setComputedStyleColumnWidths: () => ReturnType;
      setCellContentType: (type: 'plain' | 'paragraph') => ReturnType;
      setCellSelection: (position: {
        anchorCell: number;
        headCell?: number;
      }) => ReturnType;
      fixPandocTables: (all_tables?: boolean) => ReturnType;
      increaseTableBodyHeaderRows: () => ReturnType;
      decreaseTableBodyHeaderRows: () => ReturnType;
      increaseTableBodyHeaderColumns: () => ReturnType;
      decreaseTableBodyHeaderColumns: () => ReturnType;
      updateColSpecs: () => ReturnType;
      tableToFullWidth: () => ReturnType;
      equalizeColumnWidths: () => ReturnType;
      secureColumnWidths: () => ReturnType;
    };
  }

  interface NodeConfig<Options, Storage> {
    /**
     * Table Role
     */
    tableRole?:
      | string
      | ((this: {
          name: string;
          options: Options;
          storage: Storage;
          parent: ParentConfig<NodeConfig<Options>>['tableRole'];
        }) => string);
  }
}

export type PandocTableOptions = {
  HTMLAttributes: Record<string, any>;
  defaultColumnsCount: number;
  defaultBodyRowsCount: number;
  defaultCaption?: string;
  defaultHeadRowsCount?: number;
  defaultFootRowsCount?: number;
  defaultBodyHeadRowColumnsCount?: number;
  defaultCellContainer?: 'plain' | 'paragraph';

  resizable: boolean;
  handleWidth: number;
  cellMinWidth: number;
  lastColumnResizable: boolean;
  allowTableNodeSelection: boolean;
  tableWidthShare: number;
  tableMinWidth: number;
};

export const TABLE_MIN_WIDTH = 400;
export const TABLE_WIDTH_SHARE = 0.95;

export const PandocTable = Node.create<PandocTableOptions>({
  name: 'pandocTable',
  content: 'caption? tableHead? tableBody* tableFoot?',
  tableRole: 'table',
  isolating: true,
  group: 'block',

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'pandoc-table',
      },
      defaultCaption: undefined,
      defaultBodyRowsCount: 3,
      defaultColumnsCount: 3,
      defaultHeadRowsCount: 1,
      defaultCellContainer: 'paragraph',
      resizable: true,
      handleWidth: 5,
      cellMinWidth: 25,
      lastColumnResizable: true,
      allowTableNodeSelection: false,
      tableWidthShare: TABLE_WIDTH_SHARE,
      tableMinWidth: TABLE_MIN_WIDTH,
    };
  },

  addAttributes() {
    return {
      colSpec: {
        default: [] as PmColSpec[],
        renderHTML: (attrs) => {
          return {
            colspec: pmColSpecsToString(attrs.colSpec),
          };
        },
      },
      tableWidth: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [{ tag: 'table' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'table',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    const options = this.options;
    return {
      insertPandocTable:
        ({
          rows = options.defaultBodyRowsCount,
          cols = options.defaultColumnsCount,
          caption = options.defaultCaption,
          headRowsCount = options.defaultHeadRowsCount,
          footRowsCount = options.defaultFootRowsCount,
          rowHeadColumns = options.defaultBodyHeadRowColumnsCount,
          cellContainer = options.defaultCellContainer,
        } = {}) =>
        ({ dispatch, editor, tr, view }) => {
          if (dispatch) {
            const node = createPandocTable(editor.schema, rows, cols, {
              caption,
              headRowsCount,
              footRowsCount,
              rowHeadColumns,
              enumerateCells: true,
              cellContainer,
            });
            if (!node) return false;
            tr.replaceSelectionWith(node).scrollIntoView();
          }
          return true;
        },
      deletePandocTable:
        () =>
        ({ dispatch, state, tr }) => {
          const { from, to } = state.selection;
          let innerTablePos: number = -1;
          tr.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type.name === PandocTable.name) innerTablePos = pos;
            return true;
          });
          if (innerTablePos < 0) return false;
          const tableSelection = NodeSelection.create(tr.doc, innerTablePos);
          if (!tableSelection) return false;
          if (dispatch)
            dispatch(tr.setSelection(tableSelection).deleteSelection());
          return true;
        },
      addTableCaption:
        () =>
        ({ state, dispatch }) => {
          return addCaption(state, dispatch);
        },
      deleteTableCaption:
        () =>
        ({ state, dispatch }) => {
          return deleteCaption(state, dispatch);
        },
      addTableHead:
        () =>
        ({ state, dispatch }) => {
          return addTableHead(state, dispatch);
        },
      addTableFoot:
        () =>
        ({ state, dispatch }) => {
          return addTableFoot(state, dispatch);
        },
      addTableBodyBefore:
        () =>
        ({ state, dispatch }) => {
          return addBodyBefore(state, dispatch);
        },
      addTableBodyAfter:
        () =>
        ({ state, dispatch }) => {
          return addBodyAfter(state, dispatch);
        },
      makeTableHead:
        () =>
        ({ state, dispatch }) => {
          return makeHead(state, dispatch);
        },
      makeTableBody:
        () =>
        ({ state, dispatch }) => {
          return chainCommands(makeBody, fixPandocTablesCommand)(
            state,
            dispatch,
          );
        },
      makeTableFoot:
        () =>
        ({ state, dispatch }) => {
          return makeFoot(state, dispatch);
        },
      addColumnBefore:
        () =>
        ({ state, dispatch }) => {
          return addColumnBefore(state, dispatch);
        },
      addColumnAfter:
        () =>
        ({ state, dispatch }) => {
          return addColumnAfter(state, dispatch);
        },
      deleteColumn:
        () =>
        ({ state, dispatch }) => {
          return deleteColumn(state, dispatch);
        },
      addRowBefore:
        () =>
        ({ state, dispatch }) => {
          return addRowBefore(state, dispatch);
        },
      addRowAfter:
        () =>
        ({ state, dispatch }) => {
          return addRowAfter(state, dispatch);
        },
      deleteRow:
        () =>
        ({ state, dispatch }) => {
          return deleteRow(state, dispatch);
        },
      deleteSection:
        () =>
        ({ state, dispatch }) => {
          return deleteSection(state, dispatch);
        },
      deleteTable:
        () =>
        ({ state, dispatch }) => {
          return deleteTable(state, dispatch);
        },
      decreaseColspan:
        () =>
        ({ state, dispatch, tr }) => {
          const selection = state.selection;
          // case cell selection
          if (selection instanceof CellSelection) {
            if (dispatch) {
              let modified = false;
              selection.forEachCell((node, pos) => {
                const attrs = node.attrs;
                if (attrs.colspan > 1) {
                  modified = true;
                  const cellAttrs = {
                    colspan: attrs.colspan,
                    rowspan: attrs.rowspan,
                    colwidth: attrs.colwidth,
                  };
                  tr.setNodeMarkup(pos, null, {
                    ...attrs,
                    ...removeColSpan(cellAttrs, pos),
                  });
                }
              });
              if (modified) dispatch(tr);
            }
          } else {
            // no cell selection
            const cell = getInnerCell(state);
            if (!cell) return false;
            const { node, pos } = cell;
            const attrs = node.attrs;
            if (attrs.colspan <= 1) return false;
            if (dispatch) {
              const cellAttrs = {
                colspan: attrs.colspan,
                rowspan: attrs.rowspan,
                colwidth: attrs.colwidth,
              };
              dispatch(
                tr.setNodeMarkup(pos, null, {
                  ...attrs,
                  ...removeColSpan(cellAttrs, pos),
                }),
              );
            }
          }
          return true;
        },
      increaseColspan:
        () =>
        ({ state, dispatch, tr }) => {
          const selection = state.selection;
          // case cell selection
          if (selection instanceof CellSelection) {
            if (dispatch) {
              selection.forEachCell((node, pos) => {
                const attrs = node.attrs;
                const cellAttrs = {
                  colspan: attrs.colspan,
                  rowspan: attrs.rowspan,
                  colwidth: attrs.colwidth,
                };
                tr.setNodeMarkup(pos, null, {
                  ...attrs,
                  ...addColSpan(cellAttrs, pos),
                });
              });
              dispatch(tr);
            }
          } else {
            // no cell selection
            const cell = getInnerCell(state);
            if (!cell) return false;
            const { node, pos } = cell;
            if (dispatch) {
              const attrs = node.attrs;
              const cellAttrs = {
                colspan: attrs.colspan,
                rowspan: attrs.rowspan,
                colwidth: attrs.colwidth,
              };
              dispatch(
                tr.setNodeMarkup(pos, null, {
                  ...attrs,
                  ...addColSpan(cellAttrs, pos),
                }),
              );
            }
          }
          return true;
        },
      decreaseRowspan:
        () =>
        ({ state, dispatch, tr }) => {
          const selection = state.selection;
          // case cell selection
          if (selection instanceof CellSelection) {
            if (dispatch) {
              let modified = false;
              selection.forEachCell((node, pos) => {
                const attrs = node.attrs;
                if (attrs.rowspan > 1) {
                  modified = true;
                  tr.setNodeMarkup(pos, null, {
                    ...attrs,
                    rowspan: attrs.rowspan - 1,
                  });
                }
              });
              if (modified) dispatch(tr);
            }
            return true;
          } else {
            // no cell selection
            const cell = getInnerCell(state);
            if (!cell) return false;
            const { node, pos } = cell;
            const attrs = node.attrs;
            if (attrs.rowspan <= 1) return false;
            if (dispatch) {
              dispatch(
                tr.setNodeMarkup(pos, null, {
                  ...attrs,
                  rowspan: attrs.rowspan - 1,
                }),
              );
            }
            return true;
          }
        },
      increaseRowspan:
        () =>
        ({ state, dispatch, tr }) => {
          const selection = state.selection;
          // case cell selection
          if (selection instanceof CellSelection) {
            if (dispatch) {
              selection.forEachCell((node, pos) => {
                const attrs = node.attrs;
                tr.setNodeMarkup(pos, null, {
                  ...attrs,
                  rowspan: attrs.rowspan + 1,
                });
              });
              dispatch(tr);
            }
          } else {
            // no cell selection
            const cell = getInnerCell(state);
            if (!cell) return false;
            const { node, pos } = cell;
            if (dispatch) {
              const attrs = node.attrs;
              dispatch(
                tr.setNodeMarkup(pos, null, {
                  ...attrs,
                  rowspan: attrs.rowspan + 1,
                }),
              );
            }
          }
          return true;
        },
      mergeCells:
        () =>
        ({ state, dispatch }) => {
          return mergeCells(state, dispatch);
        },
      splitCell:
        () =>
        ({ state, dispatch }) => {
          return splitCell(state, dispatch);
        },
      toggleHeaderColumn:
        () =>
        ({ state, dispatch }) => {
          return toggleHeader('column')(state, dispatch);
        },
      toggleHeaderRow:
        () =>
        ({ state, dispatch }) => {
          return toggleHeader('row')(state, dispatch);
        },
      toggleHeaderCell:
        () =>
        ({ state, dispatch }) => {
          return toggleHeaderCell(state, dispatch);
        },
      mergeOrSplit:
        () =>
        ({ state, dispatch }) => {
          if (mergeCells(state, dispatch)) {
            return true;
          }

          return splitCell(state, dispatch);
        },
      setCellAttribute:
        (name, value) =>
        ({ state, dispatch }) => {
          return setCellAttr(name, value)(state, dispatch);
        },
      goToNextCell:
        () =>
        ({ state, dispatch }) => {
          return goToNextCell(1)(state, dispatch);
        },
      goToPreviousCell:
        () =>
        ({ state, dispatch }) => {
          return goToNextCell(-1)(state, dispatch);
        },
      setCellContentType:
        (type: 'plain' | 'paragraph') =>
        ({ state, dispatch }) => {
          const blocktype = state.schema.nodes[type];
          if (!blocktype) return false;
          const sel = state.selection;
          if (isCellSelection(sel)) {
            if (dispatch) {
              const tr = state.tr;
              let count = 0;
              (sel as CellSelection).forEachCell((cell, pos) => {
                // console.log(
                //   `replace from ${pos + 1} to ${pos + 1 + cell.content.size}`
                // );
                if (
                  cell.childCount == 1 &&
                  blocktype !== cell.firstChild!.type
                ) {
                  count++;
                  tr.replaceRangeWith(
                    pos + 1,
                    pos + 1 + cell.content.size,
                    blocktype.create(null, cell.firstChild!.content),
                  );
                }
              });
              return count > 0 ? dispatch(tr) : false;
            }
            return true;
          }
          return false;
        },
      setCellSelection:
        (position) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            const selection = CellSelection.create(
              tr.doc,
              position.anchorCell,
              position.headCell,
            );

            // @ts-ignore
            tr.setSelection(selection);
          }

          return true;
        },
      fixPandocTables:
        (all_tables?: boolean) =>
        ({ dispatch, state, view }) =>
          fixPandocTablesCommand(state, dispatch, view, all_tables),
      fixPandocTable:
        () =>
        ({ dispatch, state, tr }) => {
          const table = singleTableNodeAtSelection(state.selection, 'table');
          if (!table) return false;
          const { node, pos } = table;
          if (dispatch) {
            node.descendants((n, p) => {
              fixTableSection(state, tr, n, pos + p + 1);
              return false;
            });
            dispatch(tr);
          }
          return true;
        },
      setComputedStyleColumnWidths:
        () =>
        ({ state, dispatch, view }) => {
          return setComputedStyleColumnWidths(state, dispatch, view);
        },
      increaseTableBodyHeaderRows:
        () =>
        ({ dispatch, state, tr }) => {
          const body = singleTableNodeAtSelection(state.selection, 'body');
          if (!body) return false;
          const { node, pos } = body;
          const attrs = node.attrs;
          let { headRows, rowHeadColumns } = attrs;
          const maxRows = node.childCount;
          if (headRows >= maxRows) return false;
          if (dispatch) {
            headRows++;
            tr.setNodeMarkup(pos, null, { ...attrs, headRows });
            // const { cell, header_cell } = tableNodeTypes(state.schema);
            fixTableBodyCells(state, tr, node, pos, headRows, rowHeadColumns);
            dispatch(tr);
          }
          return true;
        },
      decreaseTableBodyHeaderRows:
        () =>
        ({ dispatch, state, tr }) => {
          const body = singleTableNodeAtSelection(state.selection, 'body');
          if (!body) return false;
          const { node, pos } = body;
          const attrs = node.attrs;
          let { headRows, rowHeadColumns } = attrs;
          if (headRows <= 0) return false;
          if (dispatch) {
            headRows--;
            tr.setNodeMarkup(pos, null, { ...attrs, headRows });
            fixTableBodyCells(state, tr, node, pos, headRows, rowHeadColumns);
            dispatch(tr);
          }
          return true;
        },
      increaseTableBodyHeaderColumns:
        () =>
        ({ dispatch, state, tr }) => {
          const body = singleTableNodeAtSelection(state.selection, 'body');
          if (!body) return false;
          const { node, pos } = body;
          const attrs = node.attrs;
          let { headRows, rowHeadColumns } = attrs;
          if (rowHeadColumns >= tableBodyColumnsCount(node)) return false;
          if (dispatch) {
            rowHeadColumns++;
            tr.setNodeMarkup(pos, null, { ...attrs, rowHeadColumns });
            fixTableBodyCells(state, tr, node, pos, headRows, rowHeadColumns);
            dispatch(tr);
          }
          return true;
        },
      decreaseTableBodyHeaderColumns:
        () =>
        ({ dispatch, state, tr }) => {
          const body = singleTableNodeAtSelection(state.selection, 'body');
          if (!body) return false;
          const { node, pos } = body;
          const attrs = node.attrs;
          let { headRows, rowHeadColumns } = attrs;
          if (rowHeadColumns <= 0) return false;
          if (dispatch) {
            rowHeadColumns--;
            tr.setNodeMarkup(pos, null, { ...attrs, rowHeadColumns });
            fixTableBodyCells(state, tr, node, pos, headRows, rowHeadColumns);
            dispatch(tr);
          }
          return true;
        },
      tableToFullWidth:
        () =>
        ({ dispatch, state, view }) => {
          if (!isInTable(state)) return false;
          const selection = state.selection;
          const $from = selection.$from;
          let node: PmNode | null = null;
          let pos: number = -1;
          let d;
          for (d = $from.depth; d > 0; d--) {
            node = $from.node(d);
            if (node?.type.name === PandocTable.name) {
              pos = $from.start(d) - 1;
              break;
            }
          }
          if (!node || pos < 0) return false;
          if (dispatch) {
            let tableWidth: number | undefined = undefined;
            if (d == 1) {
              tableWidth = maxTableWidth(this.options.tableWidthShare);
            } else {
              const parentPos = $from.start(d) - 1;
              const domNode = view.domAtPos(parentPos);
              if (domNode)
                tableWidth = Math.round(
                  parseFloat(
                    window.getComputedStyle(domNode.node as Element).width,
                  ),
                );
            }
            resizeColumnsFromColSpec(
              state.tr,
              node,
              pos,
              this.options.cellMinWidth,
              {
                tableWidth,
                tableWidthShare: this.options.tableWidthShare,
                tableMinWidth: this.options.tableMinWidth,
              },
            );
          }
          return true;
        },
      equalizeColumnWidths:
        () =>
        ({ dispatch, state, tr, view }) => {
          if (!isInTable(state)) return false;
          const selection = state.selection;
          const $from = selection.$from;
          let node: PmNode | null = null;
          let pos: number = -1;
          let d;
          for (d = $from.depth; d > 0; d--) {
            node = $from.node(d);
            if (node?.type.name === PandocTable.name) {
              pos = $from.start(d) - 1;
              break;
            }
          }
          if (!node || pos < 0) return false;
          let tableWidth: number | undefined = undefined;
          const domNode = view.domAtPos(pos + 1);
          if (domNode)
            tableWidth = Math.round(
              parseFloat(
                window.getComputedStyle(domNode.node as Element).width,
              ),
            );
          else return false;
          if (dispatch) {
            const colSpec: PmColSpec[] = node.attrs.colSpec;
            const newColSpec: PmColSpec[] = colSpec.map(({ align }) => ({
              align,
              colWidth: 0,
            }));
            tr.setNodeAttribute(pos, 'colSpec', newColSpec);
            resizeColumnsFromColSpec(tr, node, pos, this.options.cellMinWidth, {
              tableWidth,
              relativeWidths: colSpec.map((cs) => 0),
              tableWidthShare: this.options.tableWidthShare,
              tableMinWidth: this.options.tableMinWidth,
            });
          }
          return true;
        },
      // secureColumnWidths:
      //   () =>
      //     ({ dispatch, state, tr, view }) => {
      //       if (!isInTable(state)) return false;
      //       const selection = state.selection;
      //       const $from = selection.$from;
      //       let node: PmNode | null = null;
      //       let pos: number = -1;
      //       let d;
      //       for (d = $from.depth; d > 0; d--) {
      //         node = $from.node(d);
      //         if (node?.type.name === PandocTable.name) {
      //           pos = $from.start(d) - 1;
      //           break;
      //         }
      //       }
      //       if (!node || pos < 0) return false;
      //       if (dispatch) {
      //         const relWidths = getComputedStyleRelColWidths(node, pos + 1, view);
      //         if (!relWidths) return false;
      //         const colSpec: PmColSpec[] = node.attrs.colSpec;
      //         if (relWidths.length !== colSpec.length) return false;
      //         const newColSpec: PmColSpec[] = colSpec.map(({ align }, i) => ({
      //           align,
      //           colWidth: relWidths[i],
      //         }));
      //         tr.setNodeAttribute(pos, 'colSpec', newColSpec);
      //       }
      //       return true;
      //     },
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.goToNextCell(),
      // Tab: () => {
      //   if (this.editor.commands.goToNextCell()) {
      //     return true;
      //   }

      //   if (!this.editor.can().addRowAfter()) {
      //     return false;
      //   }

      //   return this.editor.chain().addRowAfter().goToNextCell().run();
      // },
      'Shift-Tab': () => this.editor.commands.goToPreviousCell(),
      // Backspace: deleteTableWhenAllCellsSelected,
      // 'Mod-Backspace': deleteTableWhenAllCellsSelected,
      // Delete: deleteTableWhenAllCellsSelected,
      // 'Mod-Delete': deleteTableWhenAllCellsSelected,
    };
  },

  addProseMirrorPlugins() {
    const isResizable = this.options.resizable && this.editor.isEditable;
    const tableEditingPlugin = tableEditing({
      allowTableNodeSelection: this.options.allowTableNodeSelection,
    });
    const plugins = [
      tableEditingPlugin,
      updateTableAttrsPlugin(
        this.options.cellMinWidth,
        this.options.tableWidthShare,
        this.options.tableMinWidth,
      ),
    ];
    if (isResizable) {
      const columnResizingPlugin = columnResizing({
        handleWidth: this.options.handleWidth,
        cellMinWidth: this.options.cellMinWidth,
        lastColumnResizable: this.options.lastColumnResizable,
      });
      plugins.push(columnResizingPlugin);
    }
    return plugins;
  },

  extendNodeSchema(extension) {
    const context = {
      name: extension.name,
      options: extension.options,
      storage: extension.storage,
    };

    return {
      tableRole: callOrReturn(
        getExtensionField(extension, 'tableRole', context),
      ),
    };
  },
});

function tableNodeAt(
  $pos: ResolvedPos,
  role: TableRole,
): NodeWithPos | undefined {
  let d = 0;
  let node: PmNode | null = null;
  for (;;) {
    node = $pos.node(d);
    if (node) {
      if (node.type.spec.tableRole === role)
        return { node, pos: $pos.start(d) - 1 };
      else d--;
    } else {
      return;
    }
  }
}

function singleTableNodeAtSelection(
  selection: Selection,
  role: TableRole,
): NodeWithPos | undefined {
  const { $anchor, $head, empty } = selection;
  const tableNode = tableNodeAt($anchor, role);
  if (tableNode) {
    if (empty) return tableNode;
    else {
      const hTableNode = tableNodeAt($head, role);
      return hTableNode && hTableNode.node === tableNode.node
        ? tableNode
        : undefined;
    }
  }
  return undefined;
}

function tableBodyColumnsCount(body: PmNode): number {
  const firstRow = body.firstChild;
  if (!firstRow) return 0;
  let countColumns = 0;
  for (let c = 0; c < firstRow.childCount; c++)
    countColumns += firstRow.child(c).attrs.colspan || 1;
  return countColumns;
}

function fixTableBodyCells(
  state: EditorState,
  tr: Transaction,
  node: PmNode,
  bodyPos: number,
  headRows: number,
  rowHeadColumns: number,
): Transaction {
  let _tr: Transaction = tr || state.tr;
  const { cell, header_cell } = tableNodeTypes(state.schema);
  if (!cell || !header_cell) return tr;
  let pos = bodyPos + 1;
  for (let r = 0; r < node.childCount; r++) {
    const row = node.child(r);
    pos += 1; // row start
    for (let c = 0; c < row.childCount; c++) {
      const cellNode = row.child(c);
      const cellType: NodeType =
        c < rowHeadColumns || r < headRows ? header_cell : cell;
      if (cellNode.type !== cellType) {
        const fixedCell = cellType.createAndFill(
          cellNode.attrs,
          cellNode.content,
        );
        if (fixedCell) {
          _tr = _tr.replaceWith(pos, pos + cellNode.nodeSize, fixedCell);
        }
      }
      pos += cellNode.nodeSize;
    }
    pos += 1; // row end
  }
  return _tr;
}

function fixTableHeadFootCells(
  state: EditorState,
  tr: Transaction,
  node: PmNode,
  sectionPos: number,
): Transaction {
  let _tr = tr || state.tr;
  const header_cell = tableNodeTypes(state.schema).header_cell;
  if (!header_cell) return tr;
  let pos = sectionPos + 1;
  for (let r = 0; r < node.childCount; r++) {
    const row = node.child(r);
    pos += 1; // row start
    for (let c = 0; c < row.childCount; c++) {
      const cellNode = row.child(c);
      if (cellNode.type !== header_cell) {
        const fixedCell = header_cell.createAndFill(
          cellNode.attrs,
          cellNode.content,
        );
        if (fixedCell) {
          _tr = _tr.replaceWith(pos, pos + cellNode.nodeSize, fixedCell);
        }
      }
      pos += cellNode.nodeSize;
    }
    pos += 1; // row end
  }
  return _tr;
}

function fixTableSection(
  state: EditorState,
  tr: Transaction,
  node: PmNode,
  pos: number,
): Transaction {
  let _tr = tr || state.tr;
  const role = node.type.spec.tableRole;
  if (role === 'body') {
    let { headRows, rowHeadColumns } = node.attrs;
    const maxRows = node.childCount;
    const maxCols = tableBodyColumnsCount(node);
    let modifiedAttrs: Record<string, any> = {};
    if (headRows < 0) modifiedAttrs = { headRows: 0 };
    if (rowHeadColumns < 0) modifiedAttrs = { rowHeadColumns: 0 };
    if (headRows > maxRows) modifiedAttrs = { headRows: maxRows };
    if (rowHeadColumns > maxCols) modifiedAttrs = { rowHeadColumns: maxCols };
    if (Object.keys(modifiedAttrs).length > 0) {
      _tr = _tr.setNodeMarkup(pos, null, { ...node.attrs, ...modifiedAttrs });
    }
    _tr = fixTableBodyCells(state, _tr, node, pos, headRows, rowHeadColumns);
  } else if (role === 'head' || role === 'foot') {
    _tr = fixTableHeadFootCells(state, _tr, node, pos);
  }
  return _tr;
}

function fixPandocTablesCommand(
  state: EditorState,
  dispatch?: (tr: Transaction) => void,
  view?: EditorView,
  all_tables?: boolean,
): boolean {
  const { cell, header_cell } = tableNodeTypes(state.schema);
  if (!cell || !header_cell) return false;
  let modified = false;
  const { from, to } = state.selection;
  if (dispatch) {
    const selectionBookmark = all_tables
      ? state.selection.getBookmark()
      : undefined;
    let tr = state.tr;
    if (all_tables) tr = tr.setSelection(new AllSelection(state.doc));
    state.doc.nodesBetween(from, to, (node, pos) => {
      // fix table body header cells and make all the head's and foot's cells as header_cell
      if (isTableSection(node)) {
        const newTr = fixTableSection(state, tr, node, pos);
        modified ||= newTr !== tr;
        tr = newTr;
      }
      return true;
    });
    if (modified) {
      if (selectionBookmark)
        tr = tr.setSelection(selectionBookmark.resolve(tr.doc));
      dispatch(tr);
    }
  }
  return true;
}

function getInnerCell(state: EditorState): NodeWithPos | null {
  const { $anchor } = state.selection;
  if ($anchor) {
    for (let d = $anchor.depth; d > 0; d--) {
      const node = $anchor.node(d);
      if (!node) break;
      const role: TableRole = node.type.spec.tableRole;
      if (role === 'cell' || role === 'header_cell') {
        return { node, pos: $anchor.start(d) - 1 };
      }
    }
  }
  return null;
}

export function resizeColumnsFromColSpec(
  tr: Transaction,
  node: PmNode,
  pos: number,
  minWidth: number,
  options?: {
    tableWidth?: number;
    relativeWidths?: number[];
    tableWidthShare?: number;
    tableMinWidth?: number;
  },
): boolean {
  let modified = false;
  // set cell widths according to colSpec
  const visited: boolean[] = [];
  const relcw =
    options?.relativeWidths ||
    (node.attrs.colSpec as PmColSpec[]).map((cs) => cs.colWidth);
  const tw =
    options?.tableWidth ||
    maxTableWidth(options?.tableWidthShare, options?.tableMinWidth);
  // how many columns have default width
  const defaultWidthCount = relcw.reduce(
    (count, rw) => (rw === 0 ? count + 1 : count),
    0,
  );

  const assignedWidth = relcw.reduce((sum, w) => sum + w * tw, 0);
  const neededWidth = Math.round(defaultWidthCount * minWidth + assignedWidth);
  const defaultWidth =
    (Math.max(neededWidth, tw) - assignedWidth) / defaultWidthCount;
  // console.log(`tw=${tw}, neededWidth=${neededWidth}`);
  if (neededWidth > tw) tr.setNodeAttribute(pos, 'tableWidth', null);

  const cw = relcw.map((rw) => Math.round(rw === 0 ? defaultWidth : rw * tw));
  // console.log(`cw: ${cw.join()}`);
  // console.log(`def cols = ${ defaultWidthCount } / ${ relcw.length }, free %= ${ freeWidthShare }, free width: ${ freeWidthShare * tw}, default col width = ${ defaultColWidth }, tw = ${ tw }, [${ cw.join() }]`)
  const map = TableMap.get(node);
  const columns = map.width;
  for (let r = 0; r < map.height; r++) {
    for (let c = 0; c < columns; c++) {
      const cellPos = pos + map.map[r * columns + c] + 1;
      if (!visited[cellPos]) {
        const cell = tr.doc.nodeAt(cellPos);
        if (cell) {
          const colspan = cell.attrs.colspan;
          const colwidth = cw.slice(c, c + colspan);
          if (!modified) {
            if (!isEqual(colwidth, cell.attrs.colwidth)) {
              modified = true;
              tr.setNodeAttribute(cellPos, 'colwidth', colwidth);
            }
          } else {
            tr.setNodeAttribute(cellPos, 'colwidth', colwidth);
          }
          c += colspan - 1;
        }
        visited[cellPos] = true;
      }
    }
  }
  return modified;
}

type AlignmentFrequency = number[];
export function colAlignmentsFromSections(table: PmNode): Alignment[] {
  const map = TableMap.get(table);
  const maxColumns = map.width;
  const colAlignStat: AlignmentFrequency[] = Array(maxColumns);
  for (let i = 0; i < maxColumns; i++) {
    colAlignStat[i] = Array(TABLE_CELL_ALIGNMENTS.length);
    fill(colAlignStat[i], 0);
  }
  const rows = map.height;
  table.descendants((row) => {
    if (row.type.name === TableRow.name) {
      let col = 0;
      for (let i = 0; i < row.childCount; i++) {
        const cell = row.child(i);
        const { textAlign, colspan } = cell.attrs;
        let alignIndex = TABLE_CELL_ALIGNMENTS.indexOf(textAlign);
        if (alignIndex < 0) alignIndex = 0;
        const span = colspan || 1;
        for (let c = 0; c < span; c++) {
          const colIndex = col + c;
          try {
            if (colIndex < colAlignStat.length) {
              colAlignStat[colIndex][alignIndex] += 1 / span;
            }
          } catch {}
        }
        col = col + span;
      }
    }
  });
  if (rows > 0) {
    return colAlignStat.map((colStat) => {
      const [mostFrequentAlignIndex /*, mostFrequentAlignFreq */] = colStat
        .map((count) => (100 * count) / rows)
        .reduce(
          ([mostFreqIndex, maxFreq], freq, index) =>
            freq >= COLSPEC_ALIGNMENT_FREQ_THRESHOLD && freq >= maxFreq
              ? [index, freq]
              : [mostFreqIndex, maxFreq],
          [0, 0],
        );
      return textAlignToPandocAlignment(
        TABLE_CELL_ALIGNMENTS[mostFrequentAlignIndex],
      );
    });
  }
  return colAlignStat.map((c) => 'AlignDefault');
}

/**
 * Return the maximum possible width of a table, as a share of the window current width.
 * @param share a number between 0 and 1.
 * @param min_width table minimum width.
 */
export function maxTableWidth(
  share: number = TABLE_WIDTH_SHARE,
  min_width: number = TABLE_MIN_WIDTH,
) {
  return Math.max(min_width, window.innerWidth * Math.min(share, 1));
}
