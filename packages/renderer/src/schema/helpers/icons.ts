import {
  MARK_NAME_CITE,
  MARK_NAME_CODE,
  MARK_NAME_DOUBLE_QUOTED,
  MARK_NAME_EMPH,
  MARK_NAME_LINK,
  MARK_NAME_MATH,
  MARK_NAME_SINGLE_QUOTED,
  MARK_NAME_SMALLCAPS,
  MARK_NAME_STRIKEOUT,
  MARK_NAME_STRONG,
  MARK_NAME_SUBSCRIPT,
  MARK_NAME_SUPERSCRIPT,
  MARK_NAME_UNDERLINE
} from "../../common";

const TYPE_NAME_TO_ICON_NAME: Record<string, string> = Object.fromEntries([
  [MARK_NAME_EMPH, 'mdi-format-italic'],
  [MARK_NAME_STRONG, 'mdi-format-bold'],
  [MARK_NAME_UNDERLINE, 'mdi-format-underline'],
  [MARK_NAME_STRIKEOUT, 'mdi-format-strikethrough'],
  [MARK_NAME_SUPERSCRIPT, 'mdi-format-superscript'],
  [MARK_NAME_SUBSCRIPT, 'mdi-format-subscript'],
  [MARK_NAME_SMALLCAPS, 'smallcaps'], //'mdi-alpha-k-box'],
  [MARK_NAME_SINGLE_QUOTED, 'singlequoted'],
  [MARK_NAME_DOUBLE_QUOTED, 'doublequoted'],
  [MARK_NAME_MATH, 'mdi-sigma'],
  [MARK_NAME_LINK, 'mdi-link'],
  [MARK_NAME_CITE, 'mdi-book-account'],
  [MARK_NAME_CODE, 'mdi-language-c'],
].map(([k, v]) => [k.toLowerCase(), v]))

export function iconFor(typename: string): string | undefined {
  if (typename)
    return TYPE_NAME_TO_ICON_NAME[typename.toLowerCase()]
}