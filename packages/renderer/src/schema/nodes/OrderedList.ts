import { mergeAttributes } from '@tiptap/core';
import type { OrderedListOptions as TiptapOrderedListOptions } from '@tiptap/extension-ordered-list';
import { OrderedList as TiptapOrderedList } from '@tiptap/extension-ordered-list';
import {
  domToListNumberDelim,
  domToListNumberStyle,
  pandocNumberDelimToHtmlClass,
  pandocNumberStyleToHtmlStyle,
  PANDOC_DEFAULT_NUMBER_DELIM,
  PANDOC_DEFAULT_NUMBER_STYLE,
  PANDOC_NUMBER_DELIMS,
  PANDOC_NUMBER_STYLES,
} from '../helpers/listAttributes';

export interface OrderedListOptions extends TiptapOrderedListOptions {
  numberStyles: string[];
  defaultNumberStyle: string | null;
  numberDelims: string[];
  defaultDelim: string | null;
}

export const OrderedList = TiptapOrderedList.extend<OrderedListOptions>({
  addOptions() {
    return {
      itemTypeName: 'listItem',
      HTMLAttributes: {},
      keepMarks: false,
      keepAttributes: false,
      numberStyles: PANDOC_NUMBER_STYLES,
      defaultNumberStyle: PANDOC_DEFAULT_NUMBER_STYLE,
      numberDelims: PANDOC_NUMBER_DELIMS,
      defaultDelim: PANDOC_DEFAULT_NUMBER_DELIM,
    };
  },

  addAttributes() {
    return {
      start: {
        default: 1,
        parseHTML: (element) =>
          element.hasAttribute('start') ? +element.getAttribute('start')! : 1,
        renderHTML: (attrs) => (attrs.start == 1 ? {} : { start: attrs.start }),
      },
      numberStyle: {
        default: this.options.defaultNumberStyle || PANDOC_DEFAULT_NUMBER_STYLE,
        parseHTML: (element) => domToListNumberStyle(element),
        renderHTML: (attrs) => ({
          ...pandocNumberStyleToHtmlStyle(attrs.numberStyle),
        }),
      },
      numberDelim: {
        default: this.options.defaultDelim || PANDOC_DEFAULT_NUMBER_DELIM,
        parseHTML: (element) => domToListNumberDelim(element),
        renderHTML: (attrs) => ({
          class: pandocNumberDelimToHtmlClass(attrs.numberDelim),
        }),
      },
    };
  },

  parseHTML: () => [{ tag: 'ol' }],

  renderHTML({ HTMLAttributes }) {
    return [
      'ol',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});
