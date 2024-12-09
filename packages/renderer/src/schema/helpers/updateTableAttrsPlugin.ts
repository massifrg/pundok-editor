import { Plugin, PluginKey, Transaction } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import {
  columnResizingPluginKey,
  TableMap,
} from '@massifrg/prosemirror-tables-sections';
import { PmColSpec } from './colSpec';
import { maxTableWidth, resizeColumnsFromColSpec } from '../nodes/PandocTable';
import { isTable } from './pandocTable';

const UPDATE_TABLE_ATTRS_PLUGIN_KEY = 'update-table-attrs-plugin';
export const updateTableAttrsPluginKey = new PluginKey(
  UPDATE_TABLE_ATTRS_PLUGIN_KEY,
);

class UpdateTableAttrsState {
  constructor(
    public state: 'idle' | 'dragging' | 'setWidth' = 'idle',
    public cellPos: number = -1,
  ) { }

  apply(tr: Transaction): UpdateTableAttrsState {
    const meta = tr.getMeta(updateTableAttrsPluginKey);
    if (meta) {
      const { reset, dragging } = meta;
      if (reset) return this.reset();
      if (dragging) return this.dragging(dragging);
    }
    const colresize = tr.getMeta(columnResizingPluginKey);
    // if dragging ended, set the state to "setWidth", to update
    // colSpec after columnResizingPlugin have resized the cells' widths.
    if (this.state === 'dragging' && colresize?.setDragging === null) {
      return new UpdateTableAttrsState('setWidth', this.cellPos);
    }
    return this;
  }

  reset(): UpdateTableAttrsState {
    return new UpdateTableAttrsState();
  }

  dragging(cellPos: number): UpdateTableAttrsState {
    return new UpdateTableAttrsState('dragging', cellPos);
  }
}

function getTableElementFromEvent(event: Event): HTMLTableElement | null {
  let tableElement: HTMLElement | null = event.target as HTMLElement;
  while (tableElement && tableElement.nodeName !== 'TABLE') {
    tableElement = tableElement.parentElement;
  }
  return tableElement as HTMLTableElement | null;
}

export function updateTableAttrsPlugin(
  cellMinWidth: number,
  tableWidthShare: number,
  tableMinWidth: number,
) {
  return new Plugin({
    key: updateTableAttrsPluginKey,
    // mutationObserver: null,
    // view(view) {
    //   const plugin = this
    //   return {
    //     update(view, prevState) {
    //       // see https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver#specifications
    //       const observer = new MutationObserver((mutationList, observer) => {
    //         for (const mutation of mutationList) {
    //           let tablesAdded = false
    //           if (mutation.addedNodes) {
    //             for (const node of mutation.addedNodes) {
    //               if (node.ELEMENT_NODE && (node as HTMLElement).classList.contains('tableWrapper')) {
    //                 console.log(mutation.oldValue)
    //                 tablesAdded = true
    //                 break
    //               }
    //             }
    //           }
    //           if (tablesAdded) {
    //             console.log(`observer found added tables`)
    //             view.dispatch(
    //               view.state.tr.setMeta(updateTableAttrsPluginKey, { fixTables: true })
    //             )
    //           }
    //         }
    //       });
    //       observer.observe(view.dom, { childList: true, subtree: true })
    //       plugin.mutationObserver = observer
    //     },
    //     destroy() {
    //       if (plugin.mutationObserver)
    //         plugin.mutationObserver.disconnect()
    //     }
    //   }
    // },
    state: {
      init() {
        return new UpdateTableAttrsState();
      },
      apply(tr, prev, oldState, newState): UpdateTableAttrsState {
        return prev.apply(tr);
      },
    },
    props: {
      handleDOMEvents: {
        mousemove: (view, event) => {
          const state = view.state;
          const colresize = columnResizingPluginKey.getState(state);
          if (colresize?.dragging) {
            view.dispatch(
              state.tr.setMeta(updateTableAttrsPluginKey, {
                dragging: colresize.activeHandle,
              }),
            );
          }
          return false;
        },

        mouseover: (view, event) => {
          const tableElement = getTableElementFromEvent(event);
          if (tableElement) {
            const pluginState = updateTableAttrsPluginKey.getState(view.state);
            const dragging = pluginState.state === 'dragging';
            const tr = view.state.tr;

            const pos = view.posAtDOM(tableElement, 0) - 1;
            const doc = view.state.doc;
            const pandocTable = doc.nodeAt(pos);
            if (pandocTable && isTable(pandocTable)) {
              let width = getHTMLElementComputedWidth(tableElement);
              // if the calculated width is not valid, take a share (tableWidthShare)
              // of its container width
              const container = tableElement.parentElement;
              const containerWidth = container
                ? getHTMLElementComputedWidth(container)
                : maxTableWidth(tableWidthShare, tableMinWidth);
              const share =
                tableWidthShare > 1 || tableWidthShare < 0
                  ? 1
                  : tableWidthShare;
              if (
                (!width || isNaN(width) || width < share * containerWidth) &&
                !pandocTable.attrs.tableWidth
              ) {
                width = Math.round(share * containerWidth);
              }

              // set the table width if it has a different value from the stored one
              const tableWidth = pandocTable.attrs.tableWidth;
              if (!dragging && width && width != tableWidth) {
                // console.log(
                //   `updateTableAttrsPlugin, setting tableWidth to ${tableWidth}`,
                // );
                tr.setNodeAttribute(pos, 'tableWidth', width);
                if (!tableWidth) {
                  let colSpec: PmColSpec[] = pandocTable.attrs.colSpec;
                  const columnsCount = TableMap.get(pandocTable).width;
                  if (!colSpec || colSpec.length !== columnsCount) {
                    colSpec = [];
                    for (let i = 0; i < columnsCount; i++) {
                      colSpec.push(new PmColSpec('AlignDefault', 0));
                    }
                    tr.setNodeAttribute(pos, 'colSpec', colSpec);
                  }
                  const relWidths = colSpec.map((cs) => cs.colWidth);
                  resizeColumnsFromColSpec(tr, pandocTable, pos, cellMinWidth, {
                    tableWidth: width,
                    relativeWidths: relWidths,
                    tableWidthShare,
                    tableMinWidth,
                  });
                }
              }

              const pluginState: UpdateTableAttrsState = updateTableAttrsPluginKey.getState(view.state);
              if (pluginState.state === 'setWidth' && pluginState.cellPos > 0) {
                setColumnColSpec(view, pluginState.cellPos, width, tr);
                // reset the plugin state
                tr.setMeta(updateTableAttrsPluginKey, { reset: true });
              }

              if (tr.steps.length > 0) {
                view.dispatch(tr);
                return true;
              }
            }
          }
          return false;
        },
      },
    },
  });
}

function getHTMLElementComputedWidth(e: HTMLElement): number {
  return Math.round(parseFloat(window.getComputedStyle(e).width));
}

function setColumnColSpec(
  view: EditorView,
  cellPos: number,
  tableWidth: number,
  tr?: Transaction,
): void {
  if (cellPos > 0) {
    const doc = view.state.doc;
    const cell = doc.nodeAt(cellPos);
    if (cell) {
      const $cell = doc.resolve(cellPos);
      const table = $cell.node(-2);
      if (table.type.spec.tableRole === 'table') {
        const map = TableMap.get(table);
        const column = map.findCell(cellPos - $cell.start(-2)).right - 1;
        const colSpec = table.attrs.colSpec as PmColSpec[];
        if (tableWidth > 0) {
          const columns = map.width;
          const tableStart = $cell.start(-2);
          const newColSpec: PmColSpec[] = Array(columns);
          for (let i = 0; i < columns;) {
            const c = doc.nodeAt(tableStart + map.map[i]);
            const colspan = c?.attrs.colspan || 1;
            for (let span = 0; span < colspan; span++) {
              const col = i + span;
              const { align, colWidth } = colSpec[col];
              const relwidth =
                col === column || (col !== column && colWidth !== 0)
                  ? (c?.attrs.colwidth[span] || 0) / tableWidth
                  : 0;
              newColSpec[col] = new PmColSpec(align, relwidth);
            }
            i += colspan;
          }
          const tablePos = $cell.start(-2) - 1;
          if (tr) tr.setNodeAttribute(tablePos, 'colSpec', newColSpec);
          else
            view.dispatch(
              view.state.tr.setNodeAttribute(tablePos, 'colSpec', newColSpec),
            );
        }
      }
    }
  }
}
