import { CustomStyleDef, CustomStyleInstance } from './customStyles';
import { CustomClass } from './customClasses';
import { CustomAttribute } from './customAttributes';
import { Mark, MarkType, Node, NodeType } from '@tiptap/pm/model';
import { isString } from 'lodash';

/**
 * Check if a custom style definition/instance, or a custom class, or a custom attribute,
 * is pertinent to a Prosemirror `Node`/`NodeType` or a `Mark`/`MarkType`.
 * It's used to select all the customizations available for a particular
 * Prosemirror `Node` or `Mark` representing a Pandoc `Block` or `Inline`.
 * @param what
 * @param to
 * @returns
 */
export function appliesTo(
  what: CustomStyleDef | CustomStyleInstance | CustomClass | CustomAttribute,
  to: Node | Mark | NodeType | MarkType | string
): boolean {
  if (!what || !to) return false;
  let property: string | string[] | undefined = undefined;
  let name: string | undefined = undefined;
  if ((what as CustomStyleInstance).styleDef) {
    const styleDef = (what as CustomStyleInstance).styleDef;
    property = styleDef.appliesTo;
    name = styleDef.name;
  } else {
    property = (what as CustomStyleDef | CustomClass | CustomAttribute)
      .appliesTo;
    name = (what as CustomStyleDef | CustomClass | CustomAttribute).name;
  }
  if (!property || !name) return false;
  let objname: string | undefined = undefined;
  if (isString(to)) objname = to;
  else if (to instanceof Node || to instanceof Mark) objname = to.type.name;
  else objname = to.name;
  const ret = isString(property)
    ? property === objname
    : property.includes(objname);
  // console.log(`${name} applies to ${objname}: ${ret}`);
  return ret;
}
