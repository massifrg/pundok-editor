import { mergeAttributes, Node } from '@tiptap/core';
import {
  DEFAULT_RAW_INLINE_FORMAT,
  NODE_NAME_RAW_INLINE,
  SK_TOGGLE_RAWINLINE
} from '../../common';
import { Mark, Node as ProsemirrorNode } from '@tiptap/pm/model';
import { NodeSelection } from '@tiptap/pm/state';
import { getEditorConfiguration, marksEnding, marksStarting, textNode } from '../helpers';
import { intersection } from 'lodash';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    rawInline: {
      insertRawInline: (
        format?: string,
        text?: string | string[],
      ) => ReturnType;
      rawInlineToText: () => ReturnType;
      toggleRawInline: () => ReturnType;
    };
  }
}

export interface RawInlineOptions {
  defaultFormat: string;
  HTMLAttributes: Record<string, any>;
}

export const RawInline = Node.create<RawInlineOptions>({
  name: NODE_NAME_RAW_INLINE,
  group: 'inline',
  inline: true,
  atom: true,
  draggable: true,
  marks: '_',

  addOptions() {
    return {
      defaultFormat: DEFAULT_RAW_INLINE_FORMAT,
      HTMLAttributes: {
        class: 'raw-inline',
        spellcheck: false,
      },
    };
  },

  addAttributes() {
    return {
      format: {
        default: this.options.defaultFormat,
        parseHTML(element: HTMLElement) {
          return element.getAttribute('data-format') || '';
        },
        renderHTML(attrs) {
          return attrs.format
            ? {
              class: `format-${attrs.format}`,
              'data-format': attrs.format,
            }
            : {};
        },
      },
      text: {
        default: '',
        parseHTML(element: HTMLElement) {
          return element.textContent;
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'samp.raw-inline',
        preserveWhitespace: 'full',
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'samp',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      node.attrs.text,
    ];
  },

  addCommands() {
    return {
      insertRawInline:
        (rawformat?: string, rawtext?: string | string[]) =>
          ({ state, dispatch }) => {
            const rawInlineType = state.schema.nodes[NODE_NAME_RAW_INLINE];
            const { empty, from, to } = state.selection;
            if (empty && !rawtext) return false;
            const isarray = Array.isArray(rawtext);
            if (isarray && rawtext.length < 1) return false;
            const raw1: string | undefined = isarray ? rawtext[0] : rawtext;
            const raw2: string | undefined = isarray ? rawtext[1] : undefined;
            const doc = state.doc;
            if (dispatch) {
              const config = getEditorConfiguration(state);
              const format =
                rawformat ||
                config?.defaultRawFormat ||
                this.options.defaultFormat ||
                DEFAULT_RAW_INLINE_FORMAT;

              // the first RawInline to be inserted
              let rawInline1: ProsemirrorNode | null;
              // the marks for the first RawInline
              let marks1: readonly Mark[] = doc.resolve(from).marks();

              let tr = state.tr;

              if (raw2) {
                let marks2 = doc.resolve(to).marks();

                // when a mark range matches the selection, the ending RawInline
                // could have the mark while the starting RawInline has not
                const sameRangeMarks = intersection(
                  marksEnding(doc, to),
                  marksStarting(doc, from),
                );
                // remove the marks matching the selection range from the second RawInline
                if (sameRangeMarks.length > 0)
                  marks2 = marks2.filter((m) => sameRangeMarks.indexOf(m) < 0);

                // do the same with marks starting at selection.from, that are already
                // present at selection.to, to prevent the first RawInline from having
                // the starting marks
                const marksStartingAtFrom = intersection(
                  marksStarting(doc, from),
                  marks2,
                );
                if (marksStarting.length > 0)
                  marks1 = [...marks1, ...marksStartingAtFrom];

                const rawInline2 = rawInlineType.create(
                  { format, text: raw2 },
                  null,
                  marks2,
                );
                if (rawInline2) tr = tr.insert(to, rawInline2);
              }

              rawInline1 =
                (raw1 &&
                  rawInlineType.create({ format, text: raw1 }, null, marks1)) ||
                null;

              if (rawInline1) {
                tr = tr.insert(from, rawInline1);
              } else {
                const text = doc.textBetween(from, to, ' ', (node) =>
                  node.type.name === NODE_NAME_RAW_INLINE ? node.attrs.text : '',
                );
                const rawInline = rawInlineType.create({ format, text });
                tr = tr.replaceSelectionWith(rawInline, true);
              }
              dispatch(tr);
            }
            return true;
          },
      rawInlineToText:
        () =>
          ({ state, dispatch }) => {
            const { empty, from, to } = state.selection;
            if (empty) return false;
            const { doc, schema, tr } = state;
            const positions: number[] = [];
            const texts: string[] = [];
            doc.nodesBetween(from, to, (node, pos) => {
              if (node.type.name == NODE_NAME_RAW_INLINE) {
                positions.push(pos);
                texts.push(node.attrs.text);
              }
            });
            if (positions.length === 0) return false;
            if (dispatch) {
              positions.sort();
              positions.forEach((p, i) => {
                tr.replaceWith(p, p + 1, textNode(schema, texts[i]) || []);
              });
              dispatch(tr);
            }
            return true;
          },
      toggleRawInline:
        () =>
          ({ dispatch, editor, state }) => {
            const { selection } = state;
            if (
              selection instanceof NodeSelection &&
              selection.node.type.name === NODE_NAME_RAW_INLINE
            )
              return dispatch
                ? editor.commands.rawInlineToText()
                : editor.can().rawInlineToText();
            else
              return dispatch
                ? editor.commands.insertRawInline()
                : editor.can().insertRawInline();
          },
    };
  },

  addKeyboardShortcuts() {
    return {
      [SK_TOGGLE_RAWINLINE]: () => this.editor.commands.toggleRawInline(),
    };
  },
});
