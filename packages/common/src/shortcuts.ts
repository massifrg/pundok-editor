/** Shortcut key to repeat the last command. */
export const SK_REPEAT_COMMAND = 'Alt-r';
/** Shortcut key to move the current node before its previous sibling. */
export const SK_MOVE_NODE_UP = 'Alt-ArrowUp';
/** Shortcut key to move the current node after its next sibling. */
export const SK_MOVE_NODE_DOWN = 'Alt-ArrowDown';
/** Shortcut key to move the current node inside its previous sibling. */
export const SK_MOVE_NODE_UP_INSIDE = 'Shift-Alt-ArrowUp';
/** Shortcut key to move the current node inside its next sibling. */
export const SK_MOVE_NODE_DOWN_INSIDE = 'Shift-Alt-ArrowDown';
/** Shortcut key to select the previous item (it depends on current context). */
export const SK_SELECT_PREV = 'Alt-ArrowLeft';
/** Shortcut key to select the next item (it depends on current context). */
export const SK_SELECT_NEXT = 'Alt-ArrowRight';
/** Shortcut key to replace the selection and then select the next item (in search and replace). */
export const SK_REPLACE_AND_SELECT_NEXT = 'Shift-Alt-ArrowRight';


/** Shortcut key to insert a LineBreak (hard break). */
export const SK_SET_LINEBREAK = 'Mod-Enter';
/** Alternative shortcut key to insert a LineBreak (hard break). */
export const SK_SET_LINEBREAK_ALT = 'Shift-Enter';
/** Shortcut key to insert a SoftBreak. */
export const SK_SET_SOFTBREAK = 'Alt-Enter';
/** Shortcut key to create a Div around the current selection or paragraph. */
export const SK_TOGGLE_DIV = 'Mod-Shift-d';
/** Shortcut key to create a Figure around the current selection or paragraph. */
export const SK_TOGGLE_FIGURE = 'Mod-Shift-f';
/** Shortcut key to convert a Para into a Plain and vice versa. */
export const SK_TOGGLE_PLAIN = 'Mod-Alt-p';
/** Shortcut key to start a new paragraph. */
export const SK_BREAK_PLAIN = 'Enter';
/** Shortcut key to convert a CodeBlock into a RawBlock and vice versa. */
export const SK_CONVERT_TO_RAWBLOCK = 'Alt-Shift-w';
/** Shortcut key to convert the current selection into a RawInline. */
export const SK_TOGGLE_RAWINLINE = 'Alt-w';
/** Shortcut key to mark the current selection as a Link. */
export const SK_TOGGLE_LINK = 'Mod-l';
/** Shortcut key to insert an anchor. */
export const SK_INSERT_ANCHOR = 'Alt-l';
/** Shortcut key to insert a Note. */
export const SK_INSERT_NOTE = 'Alt-n';
/** Shortcut key to insert an Image. */
export const SK_INSERT_IMAGE = 'Mod-Shift-i';
/** Shortcut key to insert an index reference at the start or end of the current selection. */
export const SK_SET_INDEX_REF = 'Alt-x';
/** Shortcut key to open the attributes' editor of the inner Mark or Node having attributes. */
export const SK_EDIT_ATTRIBUTES = 'Alt-a';
/** Shortcut key to mark a Div as a document-inclusion Div. */
export const SK_INCLUDE_DOC = 'Alt-i';
/** Shortcut key to open the search and replace dialog. */
export const SK_SHOW_SEARCH_DIALOG = 'Mod-f';
/** Shortcut key to duplicate the current node. */
export const SK_DUPLICATE_NODE = 'Alt-d';

/** Shortcut key to select the "alternative 0" in a particular context. */
export const SK_SET_ALTERNATIVE_0 = 'Alt-0';
/** Shortcut key to select the first alternative in a particular context (e.g. add a reference to the first index). */
export const SK_SET_ALTERNATIVE_1 = 'Alt-1';
/** Shortcut key to select the second alternative in a particular context (e.g. add a reference to the second index). */
export const SK_SET_ALTERNATIVE_2 = 'Alt-2';
/** Shortcut key to select the third alternative in a particular context (e.g. add a reference to the third index). */
export const SK_SET_ALTERNATIVE_3 = 'Alt-3';
/** Shortcut key to select the fourth alternative in a particular context (e.g. add a reference to the fourth index). */
export const SK_SET_ALTERNATIVE_4 = 'Alt-4';
/** Shortcut key to select the fifth alternative in a particular context (e.g. add a reference to the fifth index). */
export const SK_SET_ALTERNATIVE_5 = 'Alt-5';
/** Shortcut key to select the sixth alternative in a particular context (e.g. add a reference to the sixth index). */
export const SK_SET_ALTERNATIVE_6 = 'Alt-6';
/** Shortcut key to select the seventh alternative in a particular context (e.g. add a reference to the seventh index). */
export const SK_SET_ALTERNATIVE_7 = 'Alt-7';
/** Shortcut key to select the eighth alternative in a particular context (e.g. add a reference to the eighth index). */
export const SK_SET_ALTERNATIVE_8 = 'Alt-8';
/** Shortcut key to select the ninth alternative in a particular context (e.g. add a reference to the ninth index). */
export const SK_SET_ALTERNATIVE_9 = 'Alt-9';

// from tiptap
/** Shortcut key to undo the last change. */
export const SK_UNDO = 'Mod-z';
/** Shortcut key to redo the last change. */
export const SK_REDO = 'Shift-Mod-z';
/** Alternative shortcut key to redo the last change. */
export const SK_REDO_ALT = 'Mod-y';
/**
 * Shortcut key to set the current inlines' container (e.g. a Header) as a paragraph.
 * Mod-Alt-${level} is used to set a heading of level `level`
 */
export const SK_TOGGLE_PARAGRAPH = 'Mod-Alt-0';
/** Shortcut key to remove any Mark from the current selection. */
export const SK_REMOVE_MARKS = 'Alt--';
/** Shortcut key to toggle Emph in the current selection. */
export const SK_TOGGLE_EMPH = 'Mod-i';
/** Shortcut key to toggle Strong in the current selection. */
export const SK_TOGGLE_STRONG = 'Mod-b';
/** Shortcut key to toggle Underline in the current selection. */
export const SK_TOGGLE_UNDERLINE = 'Mod-u';
/** Shortcut key to toggle Superscript in the current selection. */
export const SK_TOGGLE_SUPERSCRIPT = 'Mod-.';
/** Shortcut key to toggle Subscript in the current selection. */
export const SK_TOGGLE_SUBSCRIPT = 'Mod-,';
/** Shortcut key to toggle Strikeout in the current selection. */
export const SK_TOGGLE_STRIKEOUT = 'Mod-Shift-x'; // "Mod-Shift-s" is used for save-as
/** Shortcut key to toggle SmallCaps in the current selection. */
export const SK_TOGGLE_SMALLCAPS = 'Mod-k';
/** Shortcut key to toggle Code in the current selection. */
export const SK_TOGGLE_CODE = 'Mod-e';
/** Shortcut key to toggle Span in the current selection. */
export const SK_TOGGLE_SPAN = 'Mod-Shift-Space';
/** Shortcut key to toggle highlighting (Span.mark) in the current selection. */
export const SK_TOGGLE_HIGHLIGHT = 'Mod-Shift-h';
/** Shortcut key to toggle SingleQuoted in the current selection. */
export const SK_TOGGLE_SINGLEQUOTE = "Mod-'";
/** Shortcut key to toggle DoubleQuoted in the current selection. */
export const SK_TOGGLE_DOUBLEQUOTE = 'Mod-"';
/** Shortcut key to toggle Math in the current selection. */
export const SK_TOGGLE_MATH = 'Mod-Shift-m';
/** Shortcut key to change the MathType in the current Math. */
export const SK_TOGGLE_MATH_TYPE = 'Mod-Alt-m';
/** Shortcut key to lowercase the current selection. */
export const SK_LOWERCASE = 'Mod-_';
/** Shortcut key to uppercase the current selection. */
export const SK_UPPERCASE = 'Mod-^';
/** Shortcut key to uppercase the initial letters of words in the current selection. */
export const SK_UPPERCASEFIRST = "Mod-Shift-'";
/** Shortcut key to align the selected table cells to the left. */
export const SK_ALIGN_LEFT = 'Mod-Shift-l';
/** Shortcut key to align the selected table cells to the center. */
export const SK_ALIGN_CENTER = 'Mod-Shift-e';
/** Shortcut key to align the selected table cells to the right. */
export const SK_ALIGN_RIGHT = 'Mod-Shift-r';
/** Shortcut key to give the default alignment to the selected table cells. */
export const SK_ALIGN_DEFAULT = 'Mod-Shift-t';
/** Shortcut key to align the selected table columns to the left. */
export const SK_ALIGN_COLUMN_LEFT = 'Mod-Alt-l';
/** Shortcut key to align the selected table columns to the center. */
export const SK_ALIGN_COLUMN_CENTER = 'Mod-Alt-e';
/** Shortcut key to align the selected table columns to the right. */
export const SK_ALIGN_COLUMN_RIGHT = 'Mod-Alt-r';
/** Shortcut key to give the default alignment to the selected table columns. */
export const SK_ALIGN_COLUMN_DEFAULT = 'Mod-Alt-t';
// export const SK_ALIGN_JUSTIFY = 'Mod-Shift-j';
/** Shortcut key to toggle a BlockQuote on the current selection. */
export const SK_TOGGLE_BLOCKQUOTE = 'Mod-Shift-b';
/** Shortcut key to toggle a CodeBlock on the current selection. */
export const SK_TOGGLE_CODEBLOCK = 'Mod-Alt-c';
/** Shortcut key to toggle an OrderedList on the current selection. */
export const SK_TOGGLE_ORDEREDLIST = 'Mod-Shift-7';
/** Shortcut key to toggle a BulletList on the current selection. */
export const SK_TOGGLE_BULLETLIST = 'Mod-Shift-8';

export const SHORTCUT: Record<string, string> = {
  SK_REPEAT_COMMAND,
  SK_MOVE_NODE_UP,
  SK_MOVE_NODE_DOWN,
  SK_SELECT_PREV,
  SK_SELECT_NEXT,
  SK_REPLACE_AND_SELECT_NEXT,
  SK_SET_LINEBREAK,
  SK_SET_LINEBREAK_ALT,
  SK_SET_SOFTBREAK,
  SK_TOGGLE_STRIKEOUT,
  SK_TOGGLE_DIV,
  SK_TOGGLE_FIGURE,
  SK_TOGGLE_PLAIN,
  SK_BREAK_PLAIN,
  SK_CONVERT_TO_RAWBLOCK,
  SK_TOGGLE_RAWINLINE,
  SK_TOGGLE_LINK,
  SK_INSERT_ANCHOR,
  SK_INSERT_NOTE,
  SK_INSERT_IMAGE,
  SK_SET_INDEX_REF,
  SK_EDIT_ATTRIBUTES,
  SK_INCLUDE_DOC,
  SK_SHOW_SEARCH_DIALOG,
  SK_DUPLICATE_NODE,
  SK_UNDO,
  SK_REDO,
  SK_REDO_ALT,
  SK_TOGGLE_PARAGRAPH,
  SK_REMOVE_MARKS,
  SK_TOGGLE_EMPH,
  SK_TOGGLE_STRONG,
  SK_TOGGLE_UNDERLINE,
  SK_TOGGLE_SUPERSCRIPT,
  SK_TOGGLE_SUBSCRIPT,
  SK_TOGGLE_SMALLCAPS,
  SK_TOGGLE_CODE,
  SK_TOGGLE_SPAN,
  SK_TOGGLE_HIGHLIGHT,
  SK_TOGGLE_SINGLEQUOTE,
  SK_TOGGLE_DOUBLEQUOTE,
  SK_TOGGLE_MATH,
  SK_TOGGLE_MATH_TYPE,
  SK_LOWERCASE,
  SK_UPPERCASE,
  SK_UPPERCASEFIRST,
  SK_ALIGN_LEFT,
  SK_ALIGN_CENTER,
  SK_ALIGN_RIGHT,
  SK_ALIGN_DEFAULT,
  SK_ALIGN_COLUMN_LEFT,
  SK_ALIGN_COLUMN_CENTER,
  SK_ALIGN_COLUMN_RIGHT,
  SK_ALIGN_COLUMN_DEFAULT,
  SK_TOGGLE_BLOCKQUOTE,
  SK_TOGGLE_CODEBLOCK,
  SK_TOGGLE_ORDEREDLIST,
  SK_TOGGLE_BULLETLIST,
  SK_SET_ALTERNATIVE_0,
  SK_SET_ALTERNATIVE_1,
  SK_SET_ALTERNATIVE_2,
  SK_SET_ALTERNATIVE_3,
  SK_SET_ALTERNATIVE_4,
  SK_SET_ALTERNATIVE_5,
  SK_SET_ALTERNATIVE_6,
  SK_SET_ALTERNATIVE_7,
  SK_SET_ALTERNATIVE_8,
  SK_SET_ALTERNATIVE_9,
}

/**
 * Return the keys of the shortcut with the name passed as argument.
 * @param sc The shortcut name, e.g. "SK_SET_ALTERNATIVE_1".
 * @returns 
 */
export function shortcut(sc: string) {
  const s = SHORTCUT[sc]
  return s
    ? s.replace(/Mod-/, 'Ctrl-')
      .replace(/(Alt|Ctrl|Shift)-/g, '$1 ')
      .replace(/([a-z])$/, (_, letter) => letter.toUpperCase())
    : ''
}

/**
 * In the description of a command, the suffix specifying the its shortcut.
 * @param sc The shortcut name, e.g. "SK_SET_ALTERNATIVE_1".
 * @returns 
 */
export function shortcutSuffix(sc: string) {
  const s = shortcut(sc)
  return s && s.length > 0 ? ` [${s}]` : ''
}