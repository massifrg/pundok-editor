import { Attrs, Mark, Node } from '@tiptap/pm/model';
import Heading from '@tiptap/extension-heading';
import {
  CustomStyleInstance,
  isCustomizableWithClass,
  isCustomizableWithStyle,
  isCustomStyleActive,
  PandocEditorConfig,
} from '../../common';
import {
  addClass,
  removeClasses,
  setCustomStyleAttribute,
  unsetCustomStyleAttribute,
} from './attributes';
import {
  setAttributesOfCustomClass,
  setAttributesOfCustomStyle,
  unsetAttributesOfCustomClass,
  unsetAttributesOfCustomStyle,
} from './customAttribute';

/**
 * Returns the new `attrs` structure after setting a custom style.
 * @param el
 * @param cs
 * @returns
 */
export function setCustomStyleAttr(
  el: Node | Mark,
  cs: CustomStyleInstance,
): Attrs {
  if (isCustomizableWithStyle(el)) {
    let newAttrs = setCustomStyleAttribute(el.attrs, cs.attrs.customStyle);
    let kv: Record<string, string> = newAttrs.kv;
    cs.styleDef.classes?.forEach((cc) => {
      kv = setAttributesOfCustomClass(kv, cc);
    });
    kv = setAttributesOfCustomStyle(kv, cs.styleDef);
    return { ...newAttrs, kv };
  } else if (isCustomizableWithClass(el)) {
    const { className, level } = cs.attrs;
    let newAttrs = addClass(el.attrs, className);
    return level && el.type.name === Heading.name
      ? { ...newAttrs, level }
      : newAttrs;
  }
  return el.attrs;
}

/**
 * Returns the new `attrs` structure after unsetting a custom style.
 * @param el
 * @param cs
 * @returns
 */
export function unsetCustomStyleAttr(
  el: Node | Mark,
  cs: CustomStyleInstance,
): Attrs {
  if (isCustomizableWithStyle(el)) {
    let newAttrs = unsetCustomStyleAttribute(el.attrs);
    const csd = cs.styleDef;
    if (newAttrs.kv) {
      let kv: Record<string, string> = newAttrs.kv;
      csd.classes?.forEach((cc) => {
        kv = unsetAttributesOfCustomClass(kv, cc);
      });
      kv = unsetAttributesOfCustomStyle(kv, cs.styleDef);
      newAttrs = { ...newAttrs, kv };
    }
    return newAttrs;
  } else if (isCustomizableWithClass(el)) {
    const { className } = cs.attrs;
    let newAttrs = className ? removeClasses(el.attrs, [className]) : el.attrs;
    return { ...newAttrs, level: Heading.options.levels[0] || 1 };
  }
  return el.attrs;
}

/**
 * Returns the new `attrs` structure after toggling a custom style.
 * @param el
 * @param cs
 * @returns
 */
export function toggleCustomStyleAttr(
  el: Node | Mark,
  cs: CustomStyleInstance,
): Attrs {
  return isCustomStyleActive(cs, el)
    ? unsetCustomStyleAttr(el, cs)
    : setCustomStyleAttr(el, cs);
}
