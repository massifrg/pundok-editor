import { Extension, Node } from '@tiptap/core';
import { Mark } from '@tiptap/pm/model';
import { NodeWithPos, mergeAttributes } from '@tiptap/vue-3';
import {
  AUTO_DELIMITER_CLASS,
  AUTO_DELIMITER_CLOSE_CLASS,
  AUTO_DELIMITER_OPEN_CLASS,
  NODE_NAME_AUTO_DELIMITER
} from '../../common';
import {
  REGISTER_AUTO_DELIMITER,
  autoDelimitersPlugin,
  defaultDelimiterForMark,
  fixAutoDelimitersTransaction,
  getAutoDelimitersState
} from '../helpers';
import { Command } from '@tiptap/pm/state';

export interface AutoDelimitersOptions {
  HTMLAttributes: Record<string, any>;
}

export const AutoDelimiter = Node.create<AutoDelimitersOptions>({
  name: NODE_NAME_AUTO_DELIMITER,
  group: 'inline',
  inline: true,
  atom: true,
  draggable: false,
  // marks: '_',

  addOptions() {
    return {
      HTMLAttributes: {
        class: AUTO_DELIMITER_CLASS,
      },
    };
  },

  addAttributes() {
    return {
      isOpen: {
        default: true,
        parseHTML: (e: HTMLElement) =>
          e.classList.contains(AUTO_DELIMITER_CLOSE_CLASS) ? false : true,
        renderHTML: ({ isOpen }) =>
          isOpen
            ? { class: AUTO_DELIMITER_OPEN_CLASS }
            : { class: AUTO_DELIMITER_CLOSE_CLASS },
      },
      markType: {
        default: null,
        parseHTML: (e: HTMLElement) => e.getAttribute('mark-type'),
        renderHTML: ({ markType }) =>
          markType ? { 'mark-type': markType } : {},
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: (n) => {
          const e = n as HTMLElement;
          const classList = e.classList;
          if (classList.contains(this.options.HTMLAttributes.class)) {
            let content = e.getAttribute('mark-type');
            if (!content || content.length === 0) content = e.textContent;
            if (!content || content.length === 0) content = '"';
            return {
              isOpen: !classList.contains('delimiter-close'),
              content,
            };
          }
          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const { isOpen, markType } = node.attrs;
    const state = this.editor?.state
    const delimiterForMark = state
      ? getAutoDelimitersState(state).delimiterForMark
      : defaultDelimiterForMark
    const content = delimiterForMark ? delimiterForMark(markType, isOpen) : '"';
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      content,
    ];
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    autoDelimiters: {
      registerAutoDelimiters: (delimiters: Record<string, string[]>) => ReturnType,
      fixAutoDelimiters: (fixFrom?: number, fixTo?: number) => ReturnType;
      fixAllAutoDelimiters: () => ReturnType;
    };
  }
}

export const AutoDelimitersExtension = Extension.create<AutoDelimitersOptions>({
  name: 'autoDelimiters',

  addOptions() {
    return {
      HTMLAttributes: {
        class: AUTO_DELIMITER_CLASS,
      },
    };
  },

  addProseMirrorPlugins() {
    return [autoDelimitersPlugin];
  },

  addCommands() {
    return {
      registerAutoDelimiters: (delimiters: Record<string, string[]>) => ({ dispatch, tr }) => {
        if (dispatch) {
          dispatch(tr.setMeta(REGISTER_AUTO_DELIMITER, delimiters))
        }
        return true
      },
      fixAutoDelimiters: (fixFrom?: number, fixTo?: number) => ({ dispatch, state }) =>
        fixAutoDelimitersInRange(fixFrom, fixTo)(state, dispatch),
      fixAllAutoDelimiters: () => ({ dispatch, state }) =>
        fixAutoDelimitersInRange(0, state.doc.nodeSize)(state, dispatch),
    };
  },
});

export const fixAutoDelimitersInRange: (fixFrom?: number, fixTo?: number) => Command =
  (fixFrom, fixTo) => (state, dispatch, view) => {
    const { doc, selection } = state;
    let from, to;
    if (fixFrom && fixTo && fixTo >= fixFrom) {
      from = fixFrom;
      to = fixTo;
    } else {
      let { empty, $from } = selection;
      if (empty) {
        from = $from.start(0);
        to = $from.end(0);
      } else {
        (from = selection.from), (to = selection.to);
      }
    }
    const autodelimitedMarks: Mark[] = getAutoDelimitersState(state).marks || [];
    if (autodelimitedMarks.length === 0) return false;
    if (dispatch) {
      const paraLikes: NodeWithPos[] = [];
      try {
        doc.nodesBetween(from, to, (node, pos) => {
          if (node.inlineContent) paraLikes.push({ node, pos });
          return true;
        });
      } catch {
        return false;
      }
      if (paraLikes.length === 0) return false;
      dispatch(
        fixAutoDelimitersTransaction(
          state,
          paraLikes,
          autodelimitedMarks,
        ),
      );
    }
    return true;
  }