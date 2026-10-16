import { Extension } from '@tiptap/core';
import {
  SearchQuery,
  findNext,
  findNextNoWrap,
  findPrev,
  findPrevNoWrap,
  replaceAll,
  replaceCurrent,
  replaceNext,
  replaceNextNoWrap,
  search,
  setSearchState,
} from '../helpers';
import { SK } from '../../common';
import {
  ACTION_REPLACE_AND_SELECT_NEXT,
  ACTION_SELECT_NEXT,
  ACTION_SELECT_PREV,
  setActionCommand
} from '../../actions';
import { asTiptapCommand } from '../helpers';
import type { Command } from '@tiptap/pm/state';

const SEARCH_AND_REPLACE_EXT_NAME = 'searchAndReplace';

export interface FoundTextRange {
  from: number;
  to: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    searchAndReplace: {
      startSearch: (query: SearchQuery) => ReturnType;
      selectPrevFoundText: (wrap: boolean) => ReturnType;
      selectNextFoundText: (wrap: boolean) => ReturnType;
      replaceSelectedText: () => ReturnType;
      replaceNextText: (wrap: boolean) => ReturnType;
      replaceAll: () => ReturnType;
      hideFoundTexts: () => ReturnType;
    };
  }
}

export const SearchAndReplaceExtension = Extension.create({
  name: SEARCH_AND_REPLACE_EXT_NAME,

  addProseMirrorPlugins() {
    return [search()];
  },

  addCommands() {
    return {
      startSearch:
        (query) =>
          asTiptapCommand(startSearchCommand(query)),
      selectPrevFoundText:
        (wrap) =>
          asTiptapCommand(selectPrevFoundTextCommand(wrap)),
      selectNextFoundText:
        (wrap) =>
          asTiptapCommand(selectNextFoundTextCommand(wrap)),
      replaceSelectedText:
        () =>
          asTiptapCommand(replaceSelectedTextCommand()),
      replaceNextText:
        (wrap) =>
          asTiptapCommand(replaceNextTextCommand(wrap)),
      replaceAll:
        () =>
          asTiptapCommand(replaceAllCommand()),
      hideFoundTexts:
        () =>
          asTiptapCommand(hideFoundTextsCommand()),
    };
  },

  addKeyboardShortcuts() {
    return {
      [SK.SELECT_PREV]: () => setActionCommand(this.editor.state, ACTION_SELECT_PREV),
      [SK.SELECT_NEXT]: () => setActionCommand(this.editor.state, ACTION_SELECT_NEXT),
      [SK.REPLACE_AND_SELECT_NEXT]: () => setActionCommand(this.editor.state, ACTION_REPLACE_AND_SELECT_NEXT),
    }
  }
});

const startSearchCommand = (query: SearchQuery): Command => (state, dispatch) => {
  if (dispatch) dispatch(setSearchState(state.tr, query));
  return true;
};

const selectPrevFoundTextCommand = (wrap?: boolean): Command => (state, dispatch) =>
  (wrap ? findPrev : findPrevNoWrap)(state, dispatch);

const selectNextFoundTextCommand = (wrap?: boolean): Command => (state, dispatch) =>
  (wrap ? findNext : findNextNoWrap)(state, dispatch);

const replaceSelectedTextCommand = (): Command => (state, dispatch) =>
  replaceCurrent(state, dispatch);

const replaceNextTextCommand = (wrap?: boolean): Command => (state, dispatch) =>
  (wrap ? replaceNext : replaceNextNoWrap)(state, dispatch);

const replaceAllCommand = (): Command => (state, dispatch) =>
  replaceAll(state, dispatch);

const hideFoundTextsCommand = (): Command =>
  startSearchCommand(new SearchQuery({ search: '' }));
