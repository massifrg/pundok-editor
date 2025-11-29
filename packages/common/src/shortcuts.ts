interface ShortcutKey {
  shortcut: string,
  description: string,
}

export const SHORTCUT_KEYS: Record<string, ShortcutKey> = {
  REPEAT_COMMAND: {
    shortcut: 'Alt-r',
    description: "repeat the last command"
  },

  MOVE_NODE_UP: {
    shortcut: 'Alt-ArrowUp',
    description: "move the current node before its previous sibling"
  },

  MOVE_NODE_DOWN: {
    shortcut: 'Alt-ArrowDown',
    description: "move the current node after its next sibling"
  },

  MOVE_NODE_UP_INSIDE: {
    shortcut: 'Shift-Alt-ArrowUp',
    description: "move the current node inside its previous sibling"
  },

  MOVE_NODE_DOWN_INSIDE: {
    shortcut: 'Shift-Alt-ArrowDown',
    description: "move the current node inside its next sibling"
  },

  SELECT_PREV: {
    shortcut: 'Alt-ArrowLeft',
    description: "select the previous item (it depends on current context)"
  },

  SELECT_NEXT: {
    shortcut: 'Alt-ArrowRight',
    description: "select the next item (it depends on current context)"
  },

  REPLACE_AND_SELECT_NEXT: {
    shortcut: 'Shift-Alt-ArrowRight',
    description: "replace the selection and then select the next item (in search and replace)"
  },

  INCREMENT: {
    shortcut: 'Alt-+',
    description: "increment a value"
  },

  DECREMENT: {
    shortcut: 'Alt--',
    description: "decrement a value"
  },

  SET_LINEBREAK: {
    shortcut: 'Mod-Enter',
    description: "insert a LineBreak (hard break)"
  },

  SET_LINEBREAK_ALT: {
    shortcut: 'Shift-Enter',
    description: "Alternative shortcut key to insert a LineBreak (hard break)."
  },

  SET_SOFTBREAK: {
    shortcut: 'Alt-Enter',
    description: "insert a SoftBreak"
  },

  TOGGLE_DIV: {
    shortcut: 'Mod-Shift-d',
    description: "create a Div around the current selection or paragraph"
  },

  TOGGLE_FIGURE: {
    shortcut: 'Mod-Shift-f',
    description: "create a Figure around the current selection or paragraph"
  },

  TOGGLE_PLAIN: {
    shortcut: 'Mod-Alt-p',
    description: "convert a Para into a Plain and vice versa"
  },

  BREAK_PLAIN: {
    shortcut: 'Enter',
    description: "start a new paragraph"
  },

  CONVERT_TO_RAWBLOCK: {
    shortcut: 'Alt-Shift-w',
    description: "convert a CodeBlock into a RawBlock and vice versa"
  },

  TOGGLE_RAWINLINE: {
    shortcut: 'Alt-w',
    description: "convert the current selection into a RawInline"
  },

  TOGGLE_LINK: {
    shortcut: 'Mod-l',
    description: "mark the current selection as a Link"
  },

  INSERT_ANCHOR: {
    shortcut: 'Alt-l',
    description: "insert an anchor"
  },

  INSERT_NOTE: {
    shortcut: 'Alt-n',
    description: "insert a Note"
  },

  INSERT_IMAGE: {
    shortcut: 'Mod-Shift-i',
    description: "insert an Image"
  },

  SET_INDEX_REF: {
    shortcut: 'Alt-x',
    description: "insert an index reference at the start or end of the current selection"
  },

  EDIT_ATTRIBUTES: {
    shortcut: 'Alt-a',
    description: "open the attributes' editor of the inner Mark or Node having attributes"
  },

  INCLUDE_DOC: {
    shortcut: 'Alt-i',
    description: "mark a Div as a document-inclusion Div"
  },

  SHOW_SEARCH_DIALOG: {
    shortcut: 'Mod-f',
    description: "open the search and replace dialog"
  },

  DUPLICATE_NODE: {
    shortcut: 'Alt-d',
    description: "duplicate the current node"
  },

  UNWRAP_NODE: {
    shortcut: 'Alt-u',
    description: "unwrap the current or selected node"
  },

  SET_ALTERNATIVE_0: {
    shortcut: 'Alt-0',
    description: "select the \"alternative 0\" in a particular context."
  },

  SET_ALTERNATIVE_1: {
    shortcut: 'Alt-1',
    description: "select the first alternative in a particular context (e.g. add a reference to the first index)"
  },

  SET_ALTERNATIVE_2: {
    shortcut: 'Alt-2',
    description: "select the second alternative in a particular context (e.g. add a reference to the second index)"
  },

  SET_ALTERNATIVE_3: {
    shortcut: 'Alt-3',
    description: "select the third alternative in a particular context (e.g. add a reference to the third index)"
  },

  SET_ALTERNATIVE_4: {
    shortcut: 'Alt-4',
    description: "select the fourth alternative in a particular context (e.g. add a reference to the fourth index)"
  },

  SET_ALTERNATIVE_5: {
    shortcut: 'Alt-5',
    description: "select the fifth alternative in a particular context (e.g. add a reference to the fifth index)"
  },

  SET_ALTERNATIVE_6: {
    shortcut: 'Alt-6',
    description: "select the sixth alternative in a particular context (e.g. add a reference to the sixth index)"
  },

  SET_ALTERNATIVE_7: {
    shortcut: 'Alt-7',
    description: "select the seventh alternative in a particular context (e.g. add a reference to the seventh index)"
  },

  SET_ALTERNATIVE_8: {
    shortcut: 'Alt-8',
    description: "select the eighth alternative in a particular context (e.g. add a reference to the eighth index)"
  },

  SET_ALTERNATIVE_9: {
    shortcut: 'Alt-9',
    description: "select the ninth alternative in a particular context (e.g. add a reference to the ninth index)"
  },


  // from tiptap
  UNDO: {
    shortcut: 'Mod-z',
    description: "undo the last change"
  },

  REDO: {
    shortcut: 'Shift-Mod-z',
    description: "redo the last change"
  },

  REDO_ALT: {
    shortcut: 'Mod-y',
    description: "Alternative shortcut key to redo the last change."
  },

  TOGGLE_PARAGRAPH: {
    shortcut: 'Mod-Alt-0',
    description: "set the current inlines' container (e.g. a Header) as a paragraph. Mod-Alt-${level} is used to set a heading of level `level`"
  },

  REMOVE_MARKS: {
    shortcut: 'Alt--',
    description: "remove any Mark from the current selection"
  },

  TOGGLE_EMPH: {
    shortcut: 'Mod-i',
    description: "toggle Emph in the current selection"
  },

  TOGGLE_STRONG: {
    shortcut: 'Mod-b',
    description: "toggle Strong in the current selection"
  },

  TOGGLE_UNDERLINE: {
    shortcut: 'Mod-u',
    description: "toggle Underline in the current selection"
  },

  TOGGLE_SUPERSCRIPT: {
    shortcut: 'Mod-.',
    description: "toggle Superscript in the current selection"
  },

  TOGGLE_SUBSCRIPT: {
    shortcut: 'Mod-,',
    description: "toggle Subscript in the current selection"
  },

  TOGGLE_STRIKEOUT: {
    shortcut: 'Mod-Shift-x',
    description: "toggle Strikeout in the current selection"
  },
  // "Mod-Shift-s" is used for save-as
  TOGGLE_SMALLCAPS: {
    shortcut: 'Mod-k',
    description: "toggle SmallCaps in the current selection"
  },

  TOGGLE_CODE: {
    shortcut: 'Mod-e',
    description: "toggle Code in the current selection"
  },

  TOGGLE_SPAN: {
    shortcut: 'Mod-Shift-Space',
    description: "toggle Span in the current selection"
  },

  TOGGLE_HIGHLIGHT: {
    shortcut: 'Mod-Shift-h',
    description: "toggle highlighting (Span.mark) in the current selection"
  },

  TOGGLE_SINGLEQUOTE: {
    shortcut: "Mod-'",
    description: "toggle SingleQuoted in the current selection"
  },

  TOGGLE_DOUBLEQUOTE: {
    shortcut: 'Mod-"',
    description: "toggle DoubleQuoted in the current selection"
  },

  TOGGLE_MATH: {
    shortcut: 'Mod-Shift-m',
    description: "toggle Math in the current selection"
  },

  TOGGLE_MATH_TYPE: {
    shortcut: 'Mod-Alt-m',
    description: "change the MathType in the current Math"
  },

  LOWERCASE: {
    shortcut: 'Mod-_',
    description: "lowercase the current selection"
  },

  UPPERCASE: {
    shortcut: 'Mod-^',
    description: "uppercase the current selection"
  },

  UPPERCASEFIRST: {
    shortcut: "Mod-Shift-'",
    description: "uppercase the initial letters of words in the current selection"
  },

  ALIGN_LEFT: {
    shortcut: 'Mod-Shift-l',
    description: "align the selected table cells to the left"
  },

  ALIGN_CENTER: {
    shortcut: 'Mod-Shift-e',
    description: "align the selected table cells to the center"
  },

  ALIGN_RIGHT: {
    shortcut: 'Mod-Shift-r',
    description: "align the selected table cells to the right"
  },

  ALIGN_DEFAULT: {
    shortcut: 'Mod-Shift-t',
    description: "give the default alignment to the selected table cells"
  },

  ALIGN_COLUMN_LEFT: {
    shortcut: 'Mod-Alt-l',
    description: "align the selected table columns to the left"
  },

  ALIGN_COLUMN_CENTER: {
    shortcut: 'Mod-Alt-e',
    description: "align the selected table columns to the center"
  },

  ALIGN_COLUMN_RIGHT: {
    shortcut: 'Mod-Alt-r',
    description: "align the selected table columns to the right"
  },

  ALIGN_COLUMN_DEFAULT: {
    shortcut: 'Mod-Alt-t',
    description: "give the default alignment to the selected table columns"
  },

  TOGGLE_BLOCKQUOTE: {
    shortcut: 'Mod-Shift-b',
    description: "toggle a BlockQuote on the current selection"
  },

  TOGGLE_CODEBLOCK: {
    shortcut: 'Mod-Alt-c',
    description: "toggle a CodeBlock on the current selection"
  },

  TOGGLE_ORDEREDLIST: {
    shortcut: 'Mod-Shift-7',
    description: "toggle an OrderedList on the current selection"
  },

  TOGGLE_BULLETLIST: {
    shortcut: 'Mod-Shift-8',
    description: "toggle a BulletList on the current selection"
  },
}

export const SK = Object.fromEntries(Object.entries(SHORTCUT_KEYS).map(([name, sk]) => [name, sk.shortcut]))

/**
 * Return the keys of the shortcut with the name passed as argument.
 * @param sc The shortcut name, e.g. "SK_SET_ALTERNATIVE_1".
 * @returns 
 */
export function shortcut(sc: string) {
  const s = SK[sc]
  return s
    ? s.replace(/Mod-/, 'Ctrl-')
      .replace(/(Alt|Ctrl|Shift)-/g, '$1 ')
      .replace(/([a-z])$/, (_, letter) => letter.toUpperCase())
    : ''
}

/**
 * In the description of a command, the suffix specifying its shortcut.
 * @param sc The shortcut name, e.g. "SK_SET_ALTERNATIVE_1".
 * @returns 
 */
export function shortcutSuffix(sc: string) {
  const s = shortcut(sc)
  return s && s.length > 0 ? ` [${s}]` : ''
}

