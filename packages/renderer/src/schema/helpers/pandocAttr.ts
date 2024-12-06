import type { Attrs as PMAttrs } from '@tiptap/pm/model';
import type { Attributes } from '@tiptap/core';

const PANDOC_PREFIX = ''; // 'pandoc-';
const PANDOC_ATTR_PREFIX = `data-${PANDOC_PREFIX}`;
const PANDOC_ID = 'data-id'; // `${PANDOC_PREFIX}id`;

export type AttrId = string;
export type AttrClasses = string[];
export type AttrKV = Record<string, string>;

export interface PandocAttr {
  id: AttrId;
  classes: AttrClasses;
  kv: AttrKV;
}

export function getPandocAttr(e: HTMLElement) {
  const id = e.getAttribute('id');
  const classes = Array.from(e.classList);
  const kv: Record<string, string> = {};
  e.getAttributeNames()
    .filter((an) => an.startsWith('data-'))
    .forEach((an) => {
      kv[an.substring(5)] = e.getAttribute(an) || '';
    });
  return { id, classes, kv };
}

export function pandocAttrIdToHtmlAttrs(attrId: AttrId) {
  const a: Record<string, string> = {};
  a[PANDOC_ID] = attrId;
  return a;
}

export function pandocAttrClassesToHtmlAttrs(attrClasses: AttrClasses) {
  return {
    class: attrClasses
      .filter((c) => c.length > 0)
      .map((c) => `${PANDOC_PREFIX}${c}`)
      .join(' '),
  };
}

export function pandocAttrKvToHtmlAttrs(attrKV: AttrKV) {
  const otherAttrs: Record<string, string> = {};
  for (const k in attrKV) {
    otherAttrs[`${PANDOC_ATTR_PREFIX}${k}`] = attrKV[k];
  }
  return otherAttrs;
}

export function pandocAttrToHtmlAttrs(attr: PandocAttr) {
  return {
    ...pandocAttrIdToHtmlAttrs(attr.id),
    ...pandocAttrClassesToHtmlAttrs(attr.classes),
    ...pandocAttrKvToHtmlAttrs(attr.kv),
  };
}

export function pmPandocAttrToHtmlAttrs(attrs: PMAttrs) {
  let htmlAttrs: Record<string, string> = {};
  if (attrs.id)
    htmlAttrs = { ...htmlAttrs, ...pandocAttrIdToHtmlAttrs(attrs.id) };
  if (attrs.classes)
    htmlAttrs = {
      ...htmlAttrs,
      ...pandocAttrClassesToHtmlAttrs(attrs.classes),
    };
  if (attrs.kv)
    htmlAttrs = { ...htmlAttrs, ...pandocAttrKvToHtmlAttrs(attrs.kv) };
  return htmlAttrs;
}

export const pandocAttrAsPmAttrs = {
  id: { default: null as string | null },
  classes: { default: [] as string[] },
  kv: { default: {} as Record<string, string> },
};

export function pandocAttrsAsTiptapAttrs(): Attributes {
  return {
    id: {
      default: null,
      renderHTML: (attr) => pandocAttrIdToHtmlAttrs(attr.id),
      keepOnSplit: false,
    },
    classes: {
      default: [],
      renderHTML: (attr) => pandocAttrClassesToHtmlAttrs(attr.classes),
      keepOnSplit: false,
    },
    kv: {
      default: {},
      renderHTML: (attr) => pandocAttrKvToHtmlAttrs(attr.kv),
      keepOnSplit: false,
    },
  };
}

export function isCustomStyleOnly(attr: PandocAttr) {
  return (
    (attr.id || '') === '' &&
    attr.classes.length === 0 &&
    attr.kv['custom-style'] &&
    Object.keys(attr.kv).length === 1
  );
}
