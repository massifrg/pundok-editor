export const SK_REPEAT_COMMAND = 'Alt-r';
export const SK_MOVE_NODE_UP = 'Alt-ArrowUp';
export const SK_MOVE_NODE_DOWN = 'Alt-ArrowDown';
export const SK_MOVE_NODE_UP_INSIDE = 'Shift-Alt-ArrowUp';
export const SK_MOVE_NODE_DOWN_INSIDE = 'Shift-Alt-ArrowDown';
export const SK_SELECT_PREV = 'Alt-ArrowLeft';
export const SK_SELECT_NEXT = 'Alt-ArrowRight';
export const SK_REPLACE_AND_SELECT_NEXT = 'Shift-Alt-ArrowRight';

export const SK_SET_LINEBREAK = 'Mod-Enter';
export const SK_SET_LINEBREAK_ALT = 'Shift-Enter';
export const SK_SET_SOFTBREAK = 'Alt-Enter';
export const SK_TOGGLE_DIV = 'Mod-Shift-d';
export const SK_TOGGLE_FIGURE = 'Mod-Shift-f';
export const SK_TOGGLE_PLAIN = 'Mod-Alt-p';
export const SK_BREAK_PLAIN = 'Enter';
export const SK_CONVERT_TO_RAWBLOCK = 'Alt-Shift-w';
export const SK_TOGGLE_RAWINLINE = 'Alt-w';
export const SK_TOGGLE_LINK = 'Mod-l';
export const SK_INSERT_ANCHOR = 'Alt-l';
export const SK_INSERT_NOTE = 'Alt-n';
export const SK_INSERT_IMAGE = 'Mod-Shift-i';
export const SK_SET_INDEX_REF = 'Alt-x';
export const SK_EDIT_ATTRIBUTES = 'Alt-a';
export const SK_INCLUDE_DOC = 'Alt-i';
export const SK_SHOW_SEARCH_DIALOG = 'Mod-f';
export const SK_DUPLICATE_NODE = 'Alt-d';

export const SK_SET_ALTERNATIVE_0 = 'Alt-0';
export const SK_SET_ALTERNATIVE_1 = 'Alt-1';
export const SK_SET_ALTERNATIVE_2 = 'Alt-2';
export const SK_SET_ALTERNATIVE_3 = 'Alt-3';
export const SK_SET_ALTERNATIVE_4 = 'Alt-4';
export const SK_SET_ALTERNATIVE_5 = 'Alt-5';
export const SK_SET_ALTERNATIVE_6 = 'Alt-6';
export const SK_SET_ALTERNATIVE_7 = 'Alt-7';
export const SK_SET_ALTERNATIVE_8 = 'Alt-8';
export const SK_SET_ALTERNATIVE_9 = 'Alt-9';

// from tiptap
export const SK_UNDO = 'Mod-z';
export const SK_REDO = 'Shift-Mod-z';
export const SK_REDO_ALT = 'Mod-y';
// Mod-Alt-${level} = heading of level
export const SK_TOGGLE_PARAGRAPH = 'Mod-Alt-0';
export const SK_REMOVE_MARKS = 'Alt--';
export const SK_TOGGLE_EMPH = 'Mod-i';
export const SK_TOGGLE_STRONG = 'Mod-b';
export const SK_TOGGLE_UNDERLINE = 'Mod-u';
export const SK_TOGGLE_SUPERSCRIPT = 'Mod-.';
export const SK_TOGGLE_SUBSCRIPT = 'Mod-,';
export const SK_TOGGLE_STRIKEOUT = 'Mod-Shift-x'; // "Mod-Shift-s" is used for save-as
export const SK_TOGGLE_SMALLCAPS = 'Mod-k';
export const SK_TOGGLE_CODE = 'Mod-e';
export const SK_TOGGLE_SPAN = 'Mod-Shift-Space';
export const SK_TOGGLE_HIGHLIGHT = 'Mod-Shift-h';
export const SK_TOGGLE_SINGLEQUOTE = "Mod-'";
export const SK_TOGGLE_DOUBLEQUOTE = 'Mod-"';
export const SK_TOGGLE_MATH = 'Mod-Shift-m';
export const SK_TOGGLE_MATH_TYPE = 'Mod-Alt-m';
// capitalization
export const SK_LOWERCASE = 'Mod-_';
export const SK_UPPERCASE = 'Mod-^';
export const SK_UPPERCASEFIRST = "Mod-Shift-'";
// alignments
export const SK_ALIGN_LEFT = 'Mod-Shift-l';
export const SK_ALIGN_CENTER = 'Mod-Shift-e';
export const SK_ALIGN_RIGHT = 'Mod-Shift-r';
export const SK_ALIGN_DEFAULT = 'Mod-Shift-t';
export const SK_ALIGN_COLUMN_LEFT = 'Mod-Alt-l';
export const SK_ALIGN_COLUMN_CENTER = 'Mod-Alt-e';
export const SK_ALIGN_COLUMN_RIGHT = 'Mod-Alt-r';
export const SK_ALIGN_COLUMN_DEFAULT = 'Mod-Alt-t';
// export const SK_ALIGN_JUSTIFY = 'Mod-Shift-j';
export const SK_TOGGLE_BLOCKQUOTE = 'Mod-Shift-b';
export const SK_TOGGLE_CODEBLOCK = 'Mod-Alt-c';
export const SK_TOGGLE_ORDEREDLIST = 'Mod-Shift-7';
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

export function shortcut(sc: string) {
  const s = SHORTCUT[sc]
  return s
    ? s.replace(/Mod-/, 'Ctrl-')
      .replace(/(Alt|Ctrl|Shift)-/g, '$1 ')
      .replace(/([a-z])$/, (_, letter) => letter.toUpperCase())
    : ''
}

export function shortcutSuffix(sc: string) {
  const s = shortcut(sc)
  return s && s.length > 0 ? ` [${s}]` : ''
}