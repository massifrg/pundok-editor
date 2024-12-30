import { Extension } from '@tiptap/core';

interface EdgeAttributes {
  leftEdge?: boolean,
  rightEdge?: boolean
}

const TABLE_EDGES_CLASSES_TO_ATTR: Record<string, EdgeAttributes> = {
  'edge-left': { leftEdge: true },
  'edge-right': { rightEdge: true },
}

export interface TableEdgesOptions {
  types: string[]
}

function classListToEdgeAttributes(cl: DOMTokenList): EdgeAttributes {
  let edgeAttrs: EdgeAttributes = {}
  cl.forEach((v, k) => {
    const a = TABLE_EDGES_CLASSES_TO_ATTR[k]
    if (a) edgeAttrs = { ...edgeAttrs, ...a }
  })
  return edgeAttrs
}

export const TableEdgesExtension = Extension.create<TableEdgesOptions>({
  name: 'tableEdges',

  addOptions() {
    return {
      types: ['tableCell', 'tableHeader'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          leftEdge: {
            default: false,
            parseHTML: e => !!classListToEdgeAttributes(e.classList).leftEdge,
            renderHTML: (a) => a.leftEdge ? { class: 'edge-left' } : {}
          },
          rightEdge: {
            default: false,
            parseHTML: e => !!classListToEdgeAttributes(e.classList).rightEdge,
            renderHTML: (a) => a.rightEdge ? { class: 'edge-right' } : {}
          },
        },
      },
    ];
  }
});
