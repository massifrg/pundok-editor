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
  [MARK_NAME_EMPH, 'emph'],
  [MARK_NAME_STRONG, 'strong'],
  [MARK_NAME_UNDERLINE, 'underline'],
  [MARK_NAME_STRIKEOUT, 'strikeout'],
  [MARK_NAME_SUPERSCRIPT, 'superscript'],
  [MARK_NAME_SUBSCRIPT, 'subscript'],
  [MARK_NAME_SMALLCAPS, 'smallcaps'], //'mdi-alpha-k-box'],
  [MARK_NAME_SINGLE_QUOTED, 'singlequoted'],
  [MARK_NAME_DOUBLE_QUOTED, 'doublequoted'],
  [MARK_NAME_MATH, 'math'],
  [MARK_NAME_LINK, 'link'],
  [MARK_NAME_CITE, 'cite'],
  [MARK_NAME_CODE, 'code'],
].map(([k, v]) => [k.toLowerCase(), v]))

export function iconFor(typename: string): string | undefined {
  if (typename)
    return TYPE_NAME_TO_ICON_NAME[typename.toLowerCase()]
}