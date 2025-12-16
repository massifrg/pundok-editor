import {
  EditorState,
  NodeSelection,
  Plugin,
  PluginKey,
  Selection,
  TextSelection,
  Transaction
} from '@tiptap/pm/state';
import { Extension } from '@tiptap/core';
import { CssSelectOptions, SelectedNodeOrMark, cssSelect } from '../helpers';
import { Mapping } from '@tiptap/pm/transform';
import { NODE_NAME_PARAGRAPH } from '../../common';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    cssSelection: {
      cssSelect: (selector: string, options: CssSelectOptions) => ReturnType;
      selectPrevCss: (wrap?: boolean) => ReturnType;
      selectNextCss: (wrap?: boolean) => ReturnType;
      replaceWithText: (text: string) => ReturnType;
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
            // console.log(selected)
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
      selectPrevCss: (wrap) => ({ dispatch, state, tr }) => {
        const selections = getCssSelected(state)
        const count = selections.length
        if (count === 0) return false
        const from = state.selection.$anchor.pos
        const lastIndex = count - 1
        let index = lastIndex
        while (index > 0 && selections[index].from >= from)
          index -= 1
        if (index === 0 && selections[0].from >= from)
          index = wrap ? lastIndex : -1
        if (index < 0 || index >= count) return false
        if (dispatch)
          dispatch(setCssSelection(tr, selections[index]))
        return true
      },
      selectNextCss: (wrap) => ({ dispatch, state, tr }) => {
        const selections = getCssSelected(state)
        const count = selections.length
        if (count === 0) return false
        const from = state.selection.$anchor.pos
        const lastIndex = count - 1
        let index = 0
        while (index < lastIndex && selections[index].from <= from)
          index += 1
        if (index === lastIndex && selections[lastIndex].from <= from)
          index = wrap ? 0 : count
        if (index < 0 || index >= count) return false
        if (dispatch)
          dispatch(setCssSelection(tr, selections[index]))
        return true
      },
      replaceWithText: (text: string) => ({ dispatch, state, tr }) => {
        const { selection } = state
        if (selection.empty) return false
        if (dispatch) {
          if (selection instanceof TextSelection) {
            tr.insertText(text)
          } else {
            const { $anchor } = selection
            const content = $anchor.node().type.spec.content
            if (content?.match(/\b(text|inline)\b/)) {
              tr.insertText(text)
            } else {
              if (text.length === 0)
                tr.deleteSelection()
              else {
                const { schema } = state
                const paragraph = schema.nodes[NODE_NAME_PARAGRAPH].createAndFill(null, schema.text(text))
                if (paragraph)
                  tr.replaceSelectionWith(paragraph, true)
              }
            }
          }
          if (tr.docChanged)
            dispatch(tr)
        }
        return true
      }
    };
  },
});

function mapSelectedNodeOrMark(
  selected: SelectedNodeOrMark,
  mapping: Mapping
): SelectedNodeOrMark | undefined {
  const coords = [selected.pos, selected.from, selected.to];
  const results = coords.map((c) => mapping.mapResult(c));
  if (results.find((r) => r.deleted)) return undefined;
  const pos = results[0].pos;
  const from = results[1].pos;
  const to = results[2].pos;
  return { ...selected, from, to, pos };
}

export function getCssSelected(state: EditorState): SelectedNodeOrMark[] {
  return cssSelectionPluginKey.getState(state) || [];
}

export function getCssSelectionCount(state: EditorState): number {
  return getCssSelected(state).length;
}

export function getCssSelectionIndex(state: EditorState): number {
  const { from, to } = state.selection
  return getCssSelected(state).findIndex(sel => sel.from === from && sel.to === to)
}

function setCssSelection(tr: Transaction, sel: SelectedNodeOrMark): Transaction {
  const selection: Selection = sel.mark
    ? TextSelection.create(tr.doc, sel.from, sel.to)
    : NodeSelection.create(tr.doc, sel.from)
  return tr.setSelection(selection)
}