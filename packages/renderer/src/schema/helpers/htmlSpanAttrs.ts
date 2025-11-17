import { Attrs } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { getIndexingState } from "../extensions";
import { getPandocAttr } from "./pandocAttr";
import { INDEX_NAME_ATTR, MARK_LINK_CLASS, MARK_NAME_LINK, NODE_BREAK_CLASS, NODE_BREAK_SOFT_CLASS, NODE_NAME_BREAK, NODE_NAME_EMPTY_SPAN, NODE_NAME_INDEX_REF, NODE_NAME_PLAIN, NODE_PLAIN_CLASS, typeNameOfElement } from "../../common";

export function getSpanAttrs(typeName: string, e: HTMLElement, state?: EditorState): Attrs | false | null {
  console.log(`getSpanAttrs called for type name "${typeName}"`)
  let pAttr = undefined
  if (e.hasAttribute('class')) {
    // index references
    const indexingState = getIndexingState(state)
    if (indexingState) {
      const refClasses = indexingState.indices?.map(i => i.refClass)
      if (refClasses) {
        const classes = e.classList
        const refClass = refClasses.find(rc => classes.contains(rc))
        if (refClass) {
          if (typeName !== NODE_NAME_INDEX_REF)
            return false
          pAttr = getPandocAttr(e)
          const indexName = pAttr?.kv[INDEX_NAME_ATTR] ||
            indexingState.indices?.find(i => i.refClass === refClass)?.indexName
          return {
            classes: pAttr.classes,
            kv: {
              ...pAttr.kv,
              idref: e.getAttribute('idref'),
              [INDEX_NAME_ATTR]: indexName,
            }
          }
        }
      }
    }
    // breaks
    if (e.classList.contains(NODE_BREAK_CLASS))
      return typeName === NODE_NAME_BREAK
        ? { soft: e.classList.contains(NODE_BREAK_SOFT_CLASS) }
        : false
    // Links
    if (e.classList.contains(MARK_LINK_CLASS)) {
      if (typeName === MARK_NAME_LINK) {
        pAttr = pAttr || getPandocAttr(e)
        const classes = pAttr.classes.filter(c => c !== MARK_LINK_CLASS)
        return { ...pAttr, classes }
      } else
        return false
    }
    // Pandoc Plain
    if (e.classList.contains(NODE_PLAIN_CLASS))
      return typeName === NODE_NAME_PLAIN ? null : false
  }
  // emptySpan
  if (e.childElementCount === 0 && typeName !== NODE_NAME_EMPTY_SPAN)
    return false
  // generic span
  return pAttr || getPandocAttr(e)
}