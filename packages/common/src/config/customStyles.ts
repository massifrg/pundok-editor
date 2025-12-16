import { Mark, MarkType, Node, NodeType } from '@tiptap/pm/model';
import { isArray, isString } from 'lodash';
import { CustomAttribute } from './customAttributes';
import { CustomClass } from './customClasses';
import {
  MARK_NAME_SPAN,
  NODE_NAME_DIV,
  NODE_NAME_FIGURE,
  NODE_NAME_HEADING,
  NODE_NAME_PANDOC_TABLE,
  NODE_NAME_PARAGRAPH,
  NODE_NAME_TABLE_CELL,
  NODE_NAME_TABLE_HEADER
} from '../prosemirrorNames';

/**
 * The Nodes and Marks that are customizable with the `customStyle` attribute.
 * Except for `Para`, the attributes sets the value of the `custom-style` attribute
 * in the `Attr` data structure.
 * In the case of paragraph:
 * - inside the editor, paragraphs have a `customStyle` attribute
 * - in Pandoc documents, there's a `Div` surrounding one or more paragraphs,
 *   that is used to carry the `custom-style` attribute in its `Attr`.
 */
export const CustomizableWithStyle: Record<string, string> = {
  [MARK_NAME_SPAN]: 'Span',
  [NODE_NAME_PARAGRAPH]: 'Para',
  [NODE_NAME_TABLE_CELL]: 'Cell',
  [NODE_NAME_TABLE_HEADER]: 'Cell',
  [NODE_NAME_HEADING]: 'Header',
  [NODE_NAME_PANDOC_TABLE]: 'Table',
} as const;

/**
 * Nodes that are customizable with custom classes.
 */
export const CustomizableWithClass: Record<string, string> = {
  [NODE_NAME_DIV]: 'Div',
  [NODE_NAME_FIGURE]: 'Figure',
} as const;

/**
 * The union of Node and Marks customizable with `customStyle` and with classes.
 */
export const CustomizableElements: Record<string, string> = {
  ...CustomizableWithStyle,
  ...CustomizableWithClass,
} as const;

/**
 * The name of an element, however defined.
 * @param el
 * @returns a string with the name of an element
 */
export function typeNameOfElement(
  el: string | Node | NodeType | Mark | MarkType,
): string {
  return isString(el)
    ? el
    : el instanceof Node || el instanceof Mark
      ? el.type.name
      : el.name;
}

const isCustomizable = (elements: Record<string, string>, name: string) =>
  !!elements[name];

/**
 * Check whether a Node, a Mark, a NodeType, a MarkType or a Node or Mark with a given name
  * is customizable with the `customStyle` attribute.
 * @param el
 * @returns 
 */
export function isCustomizableWithStyle(
  el: string | Node | NodeType | Mark | MarkType | undefined,
) {
  if (!el) return false;
  return isCustomizable(CustomizableWithStyle, typeNameOfElement(el));
}

/**
 * Check whether a Node, a Mark, a NodeType, a MarkType or a Node or Mark with a given name
 * is customizable with classes.
 * @param el
 * @returns 
 */
export function isCustomizableWithClass(
  el: string | Node | NodeType | Mark | MarkType | undefined,
) {
  if (!el) return false;
  return isCustomizable(CustomizableWithClass, typeNameOfElement(el));
}

/**
 * Check whether a Node, a Mark, a NodeType, a MarkType or a Node or Mark with a given name
 * is customizable with the `customStyle` attribute or classes.
 * @param el
 * @returns 
 */
export function isCustomizableElement(
  el: string | Node | NodeType | Mark | MarkType | undefined,
) {
  if (!el) return false;
  return isCustomizable(CustomizableElements, typeNameOfElement(el));
}

/**
 * The type names of `Node`s and `Mark`s
 * (representing Pandoc `Block`s or `Inline`s)
 * that can be customized through a custom style or a custom class.
 * The custom style will be stored in the `custom-style` attribute of the element `Attr`,
 * the custom class will be one of the `classes` of the element `Attr`.
 */
export type CustomizableElement = keyof typeof CustomizableElements;

const ContentTypes: Record<string, string> = {
  i: 'inline content',
  ib: 'block of inlines',
  bb: 'block of blocks',
  u: 'unknown',
} as const;
type ContentType = keyof typeof ContentTypes;

// function to check whether a node can be transformed into another leaving its content untouched
function contentTypeOfElement(element: CustomizableElement): ContentType {
  switch (element) {
    case 'span':
      return 'i'; // inline
    case 'heading':
    case 'paragraph':
    case 'plain':
      return 'ib'; // block of inlines
    case 'div':
    case 'figure':
    case 'table':
      return 'bb'; // block of blocks
    default:
      return 'u';
  }
}

export function isInlineContent(
  el: string | Node | NodeType | Mark | MarkType,
) {
  return contentTypeOfElement(typeNameOfElement(el)) === 'i';
}
export function isBlockOfInlines(
  el: string | Node | NodeType | Mark | MarkType,
) {
  return contentTypeOfElement(typeNameOfElement(el)) === 'ib';
}
export function isBlockOfBlocks(
  el: string | Node | NodeType | Mark | MarkType,
) {
  return contentTypeOfElement(typeNameOfElement(el)) === 'bb';
}

/**
 * Check whether two {@link CustomizableElement} are compatible,
 * meaning that they can be transformed one into the other
 * leaving their content untouched.
 * @param e1
 * @param e2
 * @returns
 */
export const areElementsCompatible = (
  e1: CustomizableElement,
  e2: CustomizableElement,
) => contentTypeOfElement(e1) === contentTypeOfElement(e2);

/**
 * Like {@link areElementsCompatible}, but with types expressed
 * as a `string`, a {@link NodeType}, or a {@link MarkType}.
 * @param t1
 * @param t2
 * @returns
 */
export const areTypesCompatible = (
  t1: string | NodeType | MarkType,
  t2: string | NodeType | MarkType,
) =>
  areElementsCompatible(
    (isString(t1) ? t1 : t1.name) as CustomizableElement,
    (isString(t2) ? t2 : t2.name) as CustomizableElement,
  );

export const compatiblesWithElement = (e: CustomizableElement) =>
  Object.keys(CustomizableElements).filter((ce) =>
    areElementsCompatible(ce as CustomizableElement, e),
  );

export const compatiblesWithType = (t: string | NodeType | MarkType) =>
  Object.keys(CustomizableElements).filter((ce) =>
    areElementsCompatible(
      ce as CustomizableElement,
      (isString(t) ? t : t.name) as CustomizableElement,
    ),
  );

/**
 * The definition of a custom style in the configuration files of the editor;
 * a style definition can be shared by many customizable elements:
 * `{ appliesTo: ["span", "paragraph", "div"] }` means that the style is appliable to:
 * - `span` Marks (via the `customStyle` attr),
 * - `paragraph` Nodes (through the same attr),
 * - `div` Nodes (through a class in the `classes` attribute)
 */
export interface CustomStyleDef {
  /** This becomes the value of the `custom-style` property or a class name. */
  name: string;
  /** A description of this style. */
  description?: string;
  /** Elements to which this style applies. */
  appliesTo: CustomizableElement[];
  /** Only for custom headings. */
  levels?: number[];
  /** In case a style is deprecated, at least for a particular {@link CustomizableElement}. */
  deprecatedFor?: CustomizableElement[];
  /** CSS properties of this style (alternative to using a CSS stylesheet in the configuration). */
  css?: [propertyName: string, propertyValue: string][];
  /** Custom classes that are meaningful only when this custom style is set (only for elements with an `Attr`). */
  classes?: CustomClass[];
  /** Custom attributes that are meaningful only when this custom style is set (only for elements with an `Attr`). */
  attributes?: CustomAttribute[];
}

export interface CustomStyleInstance {
  element: string;
  styleDef: CustomStyleDef;
  deprecated: boolean;
  key: string;
  attrs: {
    customStyle?: string;
    className?: string;
    level?: number;
  };
  // markTypeName: string,
  // markTypePriority: number,
}

const customStyleKey = (name: string, type: string, level?: number) =>
  `${type.charAt(0)}${level || ''}_${name}`;

// creates CustomStyles from a custom style definition
export function customStylesFromDef(
  styleDef: CustomStyleDef,
  levelsCount: number = 6,
): CustomStyleInstance[] {
  const styles: CustomStyleInstance[] = [];
  const { appliesTo, deprecatedFor, levels, name } = styleDef;
  if (appliesTo) {
    (isArray(appliesTo) ? appliesTo : [appliesTo]).forEach((element) => {
      let key = customStyleKey(name, element);
      const deprecated =
        (deprecatedFor && deprecatedFor.includes(element)) || false;
      if (isCustomizableWithStyle(element)) {
        if (element === NODE_NAME_HEADING) {
          const ll: number[] = levels || [];
          if (ll.length === 0)
            for (let l = 1; l <= levelsCount; l++) ll.push(l)
          ll.forEach(l => {
            styles.push({
              element,
              styleDef,
              deprecated,
              key: customStyleKey(name, element, l),
              attrs: { customStyle: name, level: l },
            });
          })
        } else {
          styles.push({
            element,
            styleDef,
            deprecated,
            key,
            attrs: { customStyle: name },
          });
        }
      } else if (isCustomizableWithClass(element)) {
        styles.push({
          element,
          styleDef,
          deprecated,
          key,
          attrs: { className: name },
        });
      }
    });
  }
  return styles;
}

export function customStylesFromDefs(
  styleDefs: CustomStyleDef[],
  levelsCount: number = 6,
): CustomStyleInstance[] {
  let styles: CustomStyleInstance[] = [];
  styleDefs?.forEach((sdef) => {
    styles = styles.concat(customStylesFromDef(sdef, levelsCount));
  });
  return styles;
}

export function isCustomStyleForType(
  cs: CustomStyleInstance,
  type: string | MarkType | NodeType,
): boolean {
  const typeName = isString(type) ? type : type.name;
  return cs.element == 'span'
    ? !!typeName.match(/^span\d*$/)
    : typeName === cs.element;
}

export function isCompatibleCustomStyleForType(
  cs: CustomStyleInstance,
  type: string | MarkType | NodeType,
): boolean {
  const typeName = isString(type) ? type : type.name;
  return cs.element == 'span'
    ? !!typeName.match(/^span\d*$/)
    : areTypesCompatible(type, cs.element);
}

export const customStylesForType = (
  cstyles: CustomStyleInstance[],
  type: string | MarkType | NodeType,
) => cstyles.filter((cs) => isCustomStyleForType(cs, type));

export const compatibleCustomStylesForType = (
  cstyles: CustomStyleInstance[],
  type: string | MarkType | NodeType,
) => cstyles.filter((cs) => isCompatibleCustomStyleForType(cs, type));

export const customStylesForBlocks = (cstyles: CustomStyleInstance[]) =>
  cstyles.filter((cs) => !cs.element.match(/^span\d*$/));

export function customStylesPerTypeName(
  cstyles: CustomStyleInstance[],
  withCompatibles: boolean = false,
): Record<string, CustomStyleInstance[]> {
  const tnToStyles: Record<string, CustomStyleInstance[]> = {};
  cstyles.forEach((cs) => {
    const type = cs.element.match(/^span\d*$/) ? 'span' : cs.element;
    const styles = tnToStyles[type];
    if (!styles) {
      tnToStyles[type] = [cs];
    } else {
      styles.push(cs);
    }
  });
  if (withCompatibles) {
    const types = Object.keys(tnToStyles);
    const tnToCompStyles: Record<string, CustomStyleInstance[]> = {};
    types.forEach((t) => {
      let compStyles: CustomStyleInstance[] = tnToStyles[t];
      compatiblesWithType(t).forEach((ct) => {
        if (t != ct) compStyles = compStyles.concat(tnToStyles[ct] || []);
      });
      tnToCompStyles[t] = compStyles;
    });
    return tnToCompStyles;
  }
  return tnToStyles;
}

export function compatibleCustomStylesPerTypeName(
  cstyles: CustomStyleInstance[],
) {
  return customStylesPerTypeName(cstyles, true);
}

export function isCustomStyleActive(
  cs: CustomStyleInstance,
  nom: Node | Mark,
): boolean {
  const nomType = nom.type;
  if (!isCustomStyleForType(cs, nomType)) return false;
  const attrs = nom.attrs;
  if (!attrs) return false;
  if (isCustomizableWithStyle(nom)) {
    const { customStyle, level } = cs.attrs;
    if (nom.type.name === NODE_NAME_HEADING && nom.attrs.level !== level)
      return false
    return !(customStyle && attrs.customStyle !== customStyle);
  } else if (isCustomizableWithClass(nom)) {
    const { className, level } = cs.attrs;
    if (className && attrs?.classes?.indexOf(className) < 0) return false;
    if (level && attrs.level != level) return false;
    return true;
  }
  return false;
}

export function activeCustomStyles(
  node: Node | Mark,
  styles: CustomStyleInstance[] | Record<string, CustomStyleInstance[]>,
): CustomStyleInstance[] {
  const type = node.type;
  const pertinent = isArray(styles)
    ? styles.filter((cs) => isCustomStyleForType(cs, type))
    : styles[node.type.name] || [];
  return pertinent.filter((cs) => isCustomStyleActive(cs, node));
}

const ELEMENT_LABELS: Record<string, string> = {
  paragraph: 'P',
  heading: 'H',
  div: 'D',
  figure: 'F',
  table: 'T',
} as const;

export function labelForStyle(cs: CustomStyleInstance): string {
  const { attrs, element, styleDef } = cs;
  return `${ELEMENT_LABELS[element] || '?'}${attrs.level || ''} ${styleDef.name}`;
}
