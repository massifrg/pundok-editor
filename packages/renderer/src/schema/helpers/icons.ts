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

const TYPE_NAME_TO_ICON_NAME: Record<string, string> = {
  [MARK_NAME_EMPH]: 'mdi-format-italic',
  [MARK_NAME_STRONG]: 'mdi-format-bold',
  [MARK_NAME_UNDERLINE]: 'mdi-format-underline',
  [MARK_NAME_STRIKEOUT]: '',
  [MARK_NAME_SUPERSCRIPT]: '',
  [MARK_NAME_SUBSCRIPT]: '',
  [MARK_NAME_SMALLCAPS]: '',
  [MARK_NAME_SINGLE_QUOTED]: '',
  [MARK_NAME_DOUBLE_QUOTED]: '',
  [MARK_NAME_MATH]: '',
  [MARK_NAME_LINK]: '',
  [MARK_NAME_CITE]: '',
  [MARK_NAME_CODE]: '',
}

export function iconFor(typename: string): string | undefined {
  if (typename)
    return TYPE_NAME_TO_ICON_NAME[typename.toLowerCase()]
}