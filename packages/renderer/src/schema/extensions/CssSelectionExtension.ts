import { Extension } from '@tiptap/core';
import { Fragment, Slice } from '@tiptap/pm/model';
import {
  Command,
  EditorState,
  NodeSelection,
  Plugin,
  PluginKey,
  Selection,
  TextSelection,
  Transaction
} from '@tiptap/pm/state';
import { Mapping } from '@tiptap/pm/transform';
import { NODE_NAME_PARAGRAPH } from '../../common';
import { CssSelectOptions, SelectedNodeOrMark, cssSelect } from '../helpers';
import { unwrapNodeCommand } from './HelperCommandsExtension';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    cssSelection: {
      cssSelect: (selector: string, options: CssSelectOptions) => ReturnType;
      selectPrevCss: (wrap?: boolean) => ReturnType;
      selectNextCss: (wrap?: boolean) => ReturnType;
      replaceWithText: (text: string) => ReturnType;
      deleteCssSelected: () => ReturnType;
      unwrapCssSelected: () => ReturnType;
    };
  }
}

const CSS_SELECTION_PLUGIN = 'css-selection-plugin';
const cssSelectionPluginKey = new PluginKey(CSS_SELECTION_PLUGIN);
const META_SET_CSS_SELECTOR = 'set-css-selector';
const SELECTION_MATCHER = '$&' // matches the current selection in CSS replacement

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
              const newdoc = newState.doc
              const mapping = tr.mapping;
              return selected
                .map((s) => mapSelectedNodeOrMark(s, mapping))
                .filter((s) => {
                  if (s) {
                    const { mark, from, to } = s
                    return !(mark && !newdoc.rangeHasMark(from, to, mark))
                  }
                  return false
                }) as SelectedNodeOrMark[];
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
        const { doc, schema, selection } = state
        if (selection.empty) return false
        if (dispatch) {
          const { from, to } = selection
          // 3rd argument is false: don't include parents (paragraph Node)
          const selectedContent = doc.slice(from, to, false)
          /*
          First we must prepare the replacing text.
          If it does not contain the `$&`, it's just a text node.
          Otherwise we must replace all the occurrencies of `$&` with
          the contents of the current selection.
           */
          let replacement: Fragment = Fragment.empty
          if (selection instanceof TextSelection) {
            // the "match" is the $& that identifies the selected text
            let matchIndex = text.indexOf(SELECTION_MATCHER)
            if (matchIndex < 0)
              replacement = replacement.addToEnd(schema.text(text))
            else {
              let textAfter = text
              while (matchIndex >= 0) {
                const textBefore = textAfter.substring(0, matchIndex)
                if (textBefore.length > 0)
                  replacement = replacement.addToEnd(schema.text(textBefore))
                textAfter = textAfter.substring(matchIndex + SELECTION_MATCHER.length)
                replacement = replacement.append(selectedContent.content)
                matchIndex = textAfter.indexOf(SELECTION_MATCHER)
              }
              if (textAfter.length > 0)
                replacement = replacement.addToEnd(schema.text(textAfter))
            }
            // tr.insertText(text)
            tr.replaceSelection(new Slice(replacement,
              selectedContent.openStart,
              selectedContent.openEnd)
            )
            const mapping = tr.mapping
            tr.setSelection(new TextSelection(
              tr.doc.resolve(mapping.map(from)),
              tr.doc.resolve(mapping.map(to)))
            )
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
      },
      deleteCssSelected: () =>
        ({ dispatch, state, view }) => deleteCssSelectedCommand(state, dispatch, view),
      unwrapCssSelected: () =>
        ({ dispatch, state, view }) => unwrapCssSelectedCommand(state, dispatch, view),
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

export function getCurrentCssSelected(state: EditorState): SelectedNodeOrMark | undefined {
  const index = getCssSelectionIndex(state)
  return index < 0
    ? undefined
    : getCssSelected(state)[index]
}

function setCssSelection(tr: Transaction, sel: SelectedNodeOrMark): Transaction {
  const selection: Selection = sel.mark
    ? TextSelection.create(tr.doc, sel.from, sel.to)
    : NodeSelection.create(tr.doc, sel.from)
  return tr.setSelection(selection)
}

export const deleteCssSelectedCommand: Command = (state, dispatch, view) => {
  const selected = getCurrentCssSelected(state)
  if (!selected) return false
  const { mark, from, to, node, pos } = selected
  if (node && pos) {
    if (dispatch) {
      const { doc, tr } = state
      dispatch(tr.setSelection(NodeSelection.create(doc, pos)).deleteSelection())
    }
    return true
  } else if (mark && from && to) {
    if (dispatch) {
      const { doc, tr } = state
      dispatch(tr.setSelection(TextSelection.create(doc, from, to)).deleteSelection())
    }
    return true
  }
  return false
}

export const unwrapCssSelectedCommand: Command = (state, dispatch, view) => {
  const selected = getCurrentCssSelected(state)
  if (!selected) return false
  const { mark, from, to, node, pos } = selected
  if (node && pos) {
    return unwrapNodeCommand(pos)(state, dispatch, view)
  } else if (mark && from && to) {
    if (dispatch) {
      dispatch(state.tr.removeMark(from, to, mark))
    }
    return true
  }
  return false
}