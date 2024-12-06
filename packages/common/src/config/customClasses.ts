import { Mark, Node } from '@tiptap/pm/model';
import { CustomAttribute } from './customAttributes';
import { CustomStyleInstance, activeCustomStyles } from './customStyles';
import { appliesTo } from './appliesTo';
import { isString } from 'lodash';

/**
 * A custom class for Pandoc's `Block`s and `Inline`s with an `Attr`
 * (`CodeBlock`, `Header`, `Table`, `Figure`, `TableHead`, `TableBody`,
 *  `TableFoot`, `Row`, `Cell`, `Code`, `Link`, `Image`, `Span`).
 */
export interface CustomClass {
  /** the name and value of the class */
  name: string;
  /** an optional description */
  description?: string;
  /** the `Node`s and/or `Mark`s it's relevant to (when it's not present, it's relevant for any `Node` or `Mark`) */
  appliesTo?: string[];
  /**
   * optional attributes that are meaningful only in relation with this class (only for elements with an `Attr`);
   * they work as a further specification of the class meaning.
   */
  attributes?: CustomAttribute[];
}

/**
 * All the custom classes that are currently carried by a Prosemirror
 * `Node` or `Mark` (representing a Pandoc `Block` or `Inline`),
 * from the list passed as second argument.
 * @param classes The Prosemirror attr.classes of the `Node` or `Mark` to test.
 * @param customClasses
 * @returns
 */
export function activeCustomClasses(
  classes: string[],
  customClasses: CustomClass[],
): CustomClass[] {
  if (!classes) return [];
  return customClasses.filter((c) => classes.includes(c.name));
}

/**
 * All the custom classes that are relevant to a `Node`/`Mark`.
 * @param nom the `Node`/`Mark`.
 * @param customClasses all the classes to be filtered to find the relevant ones.
 * @param customStyles all the custom styles, because they could have associated classes.
 *                     (they are returned only when the style is active on the `Node`/`Mark`)
 * @returns an array of the relevant classes.
 */
export function customClassesForNodeOrMark(
  nom: Node | Mark,
  customClasses: CustomClass[],
  customStyles: CustomStyleInstance[] = [],
): CustomClass[] {
  let classes: CustomClass[] = customClasses.filter((c) => appliesTo(c, nom));
  const activeStyles = activeCustomStyles(nom, customStyles);
  activeStyles.forEach((s) => {
    const styleClasses: CustomClass[] = s.styleDef.classes || [];
    styleClasses.forEach((sc) => classes.push(sc));
  });
  return classes;
}

/**
 * Checks whether a `Node` or `Mark` has a (custom) class.
 * @param nom
 * @param c
 * @returns
 */
export function hasCustomClass(nom: Node | Mark, c: string | CustomClass) {
  const classes = nom.attrs?.classes;
  if (!classes) return false;
  const className = isString(c) ? c : c.name;
  return classes.indexOf(className) >= 0;
}
