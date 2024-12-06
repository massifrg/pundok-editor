import { Mark, Node } from '@tiptap/pm/model';
import { CustomStyleInstance, activeCustomStyles } from './customStyles';
import { CustomClass, activeCustomClasses } from './customClasses';
import { appliesTo } from './appliesTo';

/**
 * A custom attribute for Pandoc's `Block`s and `Inline`s with an `Attr`
 * (`CodeBlock`, `Header`, `Table`, `Figure`, `TableHead`, `TableBody`,
 *  `TableFoot`, `Row`, `Cell`, `Code`, `Link`, `Image`, `Span`).
 */
export interface CustomAttribute {
  /** the name of the attribute (the key in the attributes of `Attr`) */
  name: string;
  /** optional description of the attribute */
  description?: string;
  /** the `Node`s and/or `Mark`s it's relevant to (when it's not present, it's relevant for any `Node` or `Mark`) */
  appliesTo?: string[];
  /** optional default value */
  default?: string;
  /** possible, but not compulsory, values */
  suggestions?: string[];
  /** fixed set of values, the attribute value MUST be among these */
  values?: string[];
  /**
   * attributes are usually edited in a text field, but you can customize
   * the editor for a different type (e.g. a date, an integer)
   */
  editAs?: string;
}

/**
 * All the custom attributes that are relevant to a `Node`/`Mark`.
 * @param nom the `Node`/`Mark`.
 * @param customAttributes all the attributes to be filtered to find the relevant ones.
 * @param customStyles all the custom styles, because they could have associated attributes.
 *                     (they are returned only when the style is active on the `Node`/`Mark`)
 * @param customClasses all the custom classes, because they could have associated attributes.
 *                     (they are returned only when the class is active on the `Node`/`Mark`)
 * @param modifiedClasses when provided, use these classes instead of `nom.attrs.classes`.
 * @returns an array of the relevant attributes.
 */
export function customAttributesForNodeOrMark(
  nom: Node | Mark,
  customAttributes: CustomAttribute[],
  customStyles: CustomStyleInstance[] = [],
  customClasses: CustomClass[] = [],
  modifiedClasses?: string[]
): CustomAttribute[] {
  const typeName = nom.type.name;
  const attrs: CustomAttribute[] = customAttributes.filter((a) =>
    appliesTo(a, typeName)
  );
  const activeStyles = activeCustomStyles(nom, customStyles);
  activeStyles.forEach((s) => {
    const styleAttrs: CustomAttribute[] = s.styleDef.attributes || [];
    styleAttrs.forEach((sa) => attrs.push(sa));
  });
  const activeClasses = activeCustomClasses(
    modifiedClasses || nom.attrs.classes,
    customClasses
  );
  activeClasses.forEach((c) => {
    console.log(`customAttributesForNodeOrMark: class ${c}`);
    const classAttrs: CustomAttribute[] = c.attributes || [];
    classAttrs.forEach((ca) => {
      attrs.push(ca);
    });
  });
  return attrs;
}
