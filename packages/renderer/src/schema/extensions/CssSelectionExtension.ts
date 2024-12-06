import { EditorState, Plugin, PluginKey } from '@tiptap/pm/state';
import { Extension } from '@tiptap/core';
import { CssSelectOptions, SelectedNodeOrMark, cssSelect } from '../helpers';
import { Mapping } from '@tiptap/pm/transform';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    cssSelection: {
      cssSelect: (selector: string, options: CssSelectOptions) => ReturnType;
    };
  }
}

const CSS_SELECTION_PLUGIN = 'css-selection-plugin';
const cssSelectionPluginKey = new PluginKey(CSS_SELECTION_PLUGIN);
const META_SET_CSS_SELECTOR = 'set-css-selector';

export const CssSelectionExtension = Extension.create({
  name: 'cssSelection',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: cssSelectionPluginKey,
        state: {
          init(config, state) {
            return [] as SelectedNodeOrMark[];
          },
          apply(tr, selected, oldState, newState) {
            const setCssSelector = tr.getMeta(META_SET_CSS_SELECTOR);
            if (setCssSelector) {
              const { selector, options } = setCssSelector;
              return cssSelect(newState, selector, options);
            } else if (tr.docChanged) {
              const mapping = tr.mapping;
              return selected
                .map((s) => mapSelectedNodeOrMark(s, mapping))
                .filter((s) => !!s) as SelectedNodeOrMark[];
            }
            return selected;
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      cssSelect:
        (selector, options) =>
        ({ dispatch, tr }) => {
          if (dispatch) {
            dispatch(tr.setMeta(META_SET_CSS_SELECTOR, { selector, options }));
          }
          return true;
        },
    };
  },
});

function mapSelectedNodeOrMark(
  selected: SelectedNodeOrMark,
  mapping: Mapping
): SelectedNodeOrMark | undefined {
  const isNode = !!selected.node;
  const coords = isNode ? [selected.pos] : [selected.from, selected.to];
  const results = coords.map((c) => mapping.mapResult(c));
  if (results.find((r) => r.deleted)) return undefined;
  if (isNode) {
    const pos = results[0].pos;
    return { ...selected, pos, from: pos, to: pos };
  } else {
    const from = results[0].pos;
    const to = results[1].pos;
    return { ...selected, from, to, pos: from };
  }
}

export function getCssSelected(state: EditorState): SelectedNodeOrMark[] {
  return cssSelectionPluginKey.getState(state);
}
