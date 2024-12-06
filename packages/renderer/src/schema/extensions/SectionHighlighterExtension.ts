import { Extension } from '@tiptap/core';
import { Node as PmNode, NodeType } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { SelectedNodeOrMark } from '../helpers/selection';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    highlighter: {
      highlightSection: (section: SelectedNodeOrMark) => ReturnType;
      highlightNothing: () => ReturnType;
    };
  }
}

const HIGHLIGHT_KEY = 'highlight-section';
const HIGHLIGHTED_CLASS = 'highlighted';
const HIGHLIGHT_DECO_SPECS = { type: HIGHLIGHT_KEY };
const TABLE_BLOCKS: string[] = [
  'table',
  'tableHead',
  'tableBody',
  'tableFoot',
  'tableRow',
];
const isCell = (typeName: string) =>
  typeName === 'tableCell' || typeName === 'tableHeader';
const isTableBlock = (typeName: string) => TABLE_BLOCKS.includes(typeName);
const hasInlineContent = (type?: NodeType) =>
  (type && type.spec.content && type.spec.content.indexOf('inline') >= 0) ||
  false;
const isHighlighterDecoration = (spec: Record<string, any>) =>
  spec.type === HIGHLIGHT_KEY;
const domTagForNode = (node: PmNode) => {
  if (node.isInline || node.type.name === 'plain') return 'span';
  return undefined;
};

export const SectionHighlighterExtension = Extension.create({
  name: 'sectionHighlighter',

  addCommands() {
    return {
      highlightSection:
        (section: SelectedNodeOrMark) =>
        ({ tr, dispatch }) => {
          if (section && (section.mark || section.node)) {
            if (dispatch) dispatch(tr.setMeta(HIGHLIGHT_KEY, section));
            return true;
          }
          return false;
        },
      highlightNothing:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) dispatch(tr.setMeta(HIGHLIGHT_KEY, null));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('highlighter'),
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
        state: {
          init: (config, state) => {
            return DecorationSet.empty;
          },
          apply: (tr, decorationSet, oldState, newState) => {
            let transformedDecos: DecorationSet = decorationSet;
            const doc = tr.doc;
            const section: SelectedNodeOrMark = tr.getMeta(HIGHLIGHT_KEY);

            // Marks can be decorated with an inline
            if (section) {
              if (section.mark) {
                transformedDecos = transformedDecos.add(doc, [
                  Decoration.inline(
                    section.from,
                    section.to,
                    { nodeName: 'span', class: HIGHLIGHTED_CLASS },
                    HIGHLIGHT_DECO_SPECS
                  ),
                ]);
              } else if (section.node) {
                const node = section.node;
                if (hasInlineContent(node.type)) {
                  transformedDecos = transformedDecos.add(doc, [
                    Decoration.inline(
                      section.from + 1,
                      section.to + node.nodeSize,
                      { nodeName: 'span', class: HIGHLIGHTED_CLASS },
                      HIGHLIGHT_DECO_SPECS
                    ),
                  ]);
                } else {
                  const decos: Decoration[] = [];
                  // Nodes can be surrounded by a div, except for plains that are rendered as spans
                  const decoAttrs = {
                    nodeName: domTagForNode(node),
                    class: HIGHLIGHTED_CLASS,
                  };
                  const typeName = node.type.name;
                  let from = section.pos;
                  let to = section.pos + node.nodeSize;
                  if (isCell(typeName)) {
                    from = from + 1;
                    to = to - 1;
                  }
                  // console.log(`highlight node from ${from} to ${to}`);
                  // "table blocks" (table, thead, tbody, tfoot, tr) are not well with a div around them,
                  // so it's better creating div nodes around cell's (both th and td) contents
                  if (isTableBlock(typeName)) {
                    node.descendants((descendant, pos) => {
                      if (isCell(descendant.type.name)) {
                        const cellFrom = from + pos + 2;
                        const cellTo = cellFrom + descendant.content.size;
                        // console.log(`highlight ${descendant.type.name} from ${cellFrom} to ${cellTo} (pos=${pos})`);
                        decos.push(
                          Decoration.node(
                            cellFrom,
                            cellTo,
                            decoAttrs,
                            HIGHLIGHT_DECO_SPECS
                          )
                        );
                        return false;
                      }
                      return true;
                    });
                  } else {
                    decos.push(
                      Decoration.node(from, to, decoAttrs, HIGHLIGHT_DECO_SPECS)
                    );
                  }
                  transformedDecos = transformedDecos.add(doc, decos);
                }
              }
            } else {
              // console.log('highlight none');
              transformedDecos = transformedDecos.remove(
                transformedDecos.find(
                  undefined,
                  undefined,
                  isHighlighterDecoration
                )
              );
            }
            if (tr.docChanged) {
              transformedDecos = transformedDecos.map(tr.mapping, doc);
            }
            return transformedDecos;
          },
        },
      }),
    ];
  },
});
