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

const SEARCH_AND_REPLACE_EXT_NAME = 'searchAndReplace';

export interface SearchMarkSpec {
  typeName: string;
  attrs?: Record<string, any>;
}

export type SearchType = 'text' | 'marks';

export type MarkOperationType = 'none' | 'add' | 'remove' | 'remove all';

export interface MarkOperation {
  type: MarkOperationType;
  markspec: SearchMarkSpec;
}

export type MarksLogicalOperator = 'and' | 'or';

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
          ({ dispatch, tr }) => {
            if (dispatch) dispatch(setSearchState(tr, query));
            return true;
          },
      selectPrevFoundText:
        (wrap) =>
          ({ dispatch, state }) =>
            (wrap ? findPrev : findPrevNoWrap)(state, dispatch),
      selectNextFoundText:
        (wrap) =>
          ({ dispatch, state }) =>
            (wrap ? findNext : findNextNoWrap)(state, dispatch),
      replaceSelectedText:
        () =>
          ({ dispatch, state }) =>
            replaceCurrent(state, dispatch),
      replaceNextText:
        (wrap) =>
          ({ dispatch, state }) =>
            (wrap ? replaceNext : replaceNextNoWrap)(state, dispatch),
      replaceAll:
        () =>
          ({ dispatch, state }) =>
            replaceAll(state, dispatch),
      hideFoundTexts:
        () =>
          ({ dispatch, tr }) => {
            if (dispatch)
              dispatch(setSearchState(tr, new SearchQuery({ search: '' })));
            return true;
          },
    };
  },
});
