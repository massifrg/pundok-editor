import { Attrs, Mark, Node } from '@tiptap/pm/model';
import {
  appliesTo,
  CustomClass,
  hasCustomClass,
  isCustomStyleActive,
  PundokEditorConfig,
} from '../../common';
import { addClass, removeClasses } from './attributes';
import {
  setAttributesOfCustomClass,
  unsetAttributesOfCustomClass,
} from './customAttribute';

/**
 * Returns the new `attrs` structure after setting a custom class.
 * @param el
 * @param cc
 * @returns
 */
export function setCustomClassAttr(
  el: Node | Mark,
  cc: CustomClass,
  config?: PundokEditorConfig,
): Attrs {
  if (customClassAppliesTo(cc, el, config)) {
    let newAttrs = addClass(el.attrs, cc.name);
    if (cc.attributes && newAttrs.kv)
      newAttrs = {
        ...newAttrs,
        kv: setAttributesOfCustomClass(newAttrs.kv, cc),
      };
    return newAttrs;
  }
  return el.attrs;
}

/**
 * Returns the new `attrs` structure after unsetting a custom class.
 * @param el
 * @param cc
 * @returns
 */
export function unsetCustomClassAttr(
  el: Node | Mark,
  cc: CustomClass,
  config?: PundokEditorConfig,
): Attrs {
  if (customClassAppliesTo(cc, el, config)) {
    let newAttrs = removeClasses(el.attrs, [cc.name]);
    if (cc.attributes && newAttrs.kv)
      newAttrs = {
        ...newAttrs,
        kv: unsetAttributesOfCustomClass(newAttrs.kv, cc),
      };
    return newAttrs;
  }
  return el.attrs;
}

/**
 * Returns the new `attrs` structure after toggling a custom class.
 * @param el
 * @param cc
 * @returns
 */
export function toggleCustomClassAttr(
  el: Node | Mark,
  cc: CustomClass,
  config?: PundokEditorConfig,
): Attrs {
  return hasCustomClass(el, cc)
    ? unsetCustomClassAttr(el, cc, config)
    : setCustomClassAttr(el, cc, config);
}

function customClassAppliesTo(
  cc: CustomClass,
  el: Node | Mark,
  config?: PundokEditorConfig,
) {
  if (appliesTo(cc, el)) return true;
  const cs = config?.customStylesInstances?.find((cs) =>
    isCustomStyleActive(cs, el),
  );
  return cs && cs.styleDef.classes?.find((scc) => scc.name === cc.name);
}
