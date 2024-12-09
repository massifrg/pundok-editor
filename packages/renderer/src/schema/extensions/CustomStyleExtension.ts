import { MarkType, Schema } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Extension } from '@tiptap/core';
import {
  CustomStyleInstance,
  CustomizableElement,
  areTypesCompatible,
  isCustomStyleActive,
  PundokEditorConfig,
  CustomClass,
  typeNameOfElement,
} from '../../common';
import {
  TypeOrNode,
  UpdateNodeOrMarkCallback,
  nodeTypeOf,
  updateAttributesCommand,
} from './HelperCommandsExtension';
import { CommandProps } from '@tiptap/vue-3';
import { isArray, isString } from 'lodash';
import {
  META_UPDATE_DOC_STATE,
  getDocState,
} from './PundokEditorUtilsExtension';
import { setMarkNoAtoms, toggleMarkNoAtoms } from '../../commands';
import {
  addClass,
  setCustomClassAttr,
  setCustomStyleAttr,
  setCustomStyleAttribute,
  toggleCustomClassAttr,
  toggleCustomStyleAttr,
  unsetCustomClassAttr,
  unsetCustomStyleAttr,
} from '../helpers';

export interface CustomStyleOptions {
  types: CustomizableElement[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customStyle: {
      setCustomStyle: (
        typeOrNode: TypeOrNode,
        style: CustomStyleInstance,
        pos?: number,
      ) => ReturnType;
      unsetCustomStyle: (
        typeOrNode: TypeOrNode,
        style: CustomStyleInstance,
        pos?: number,
      ) => ReturnType;
      toggleCustomStyle: (
        typeOrNode: TypeOrNode,
        style: CustomStyleInstance,
        pos?: number,
      ) => ReturnType;
      setCustomMark: (markName: string, cs: CustomStyleInstance) => ReturnType;
      unsetCustomMark: (
        markName: string,
        cs: CustomStyleInstance,
      ) => ReturnType;
      toggleCustomMark: (
        markName: string,
        cs: CustomStyleInstance,
      ) => ReturnType;
      updateMarkAttributes: (
        markName: string,
        newAttributes: Record<string, any>,
        oldAttributes: Record<string, any>,
      ) => ReturnType;
      setCustomClass: (
        cc: CustomClass,
        pos?: number,
        config?: PundokEditorConfig,
      ) => ReturnType;
      unsetCustomClass: (
        cc: CustomClass,
        pos?: number,
        config?: PundokEditorConfig,
      ) => ReturnType;
      toggleCustomClass: (
        cc: CustomClass,
        pos?: number,
        config?: PundokEditorConfig,
      ) => ReturnType;
    };
  }
}

const CUSTOM_STYLE_PLUGIN = 'custom-style-plugin';
const customStylePluginKey = new PluginKey(CUSTOM_STYLE_PLUGIN);

export const CustomStyleExtension = Extension.create<CustomStyleOptions>({
  name: 'customStyle',

  addOptions() {
    return {
      types: ['paragraph', 'span'],
    };
  },

  addStorage() {
    return {
      styleAttrForCustomStyle: undefined as Record<string, string> | undefined,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          customStyle: {
            default: null,
            parseHTML: (e) => e.getAttribute('custom-style') || null,
            renderHTML: (attrs) => {
              let customStyle: string | undefined =
                attrs.kv && attrs.kv['custom-style'];
              attrs.customStyle = attrs.customStyle || customStyle;
              customStyle = attrs.customStyle;
              if (!customStyle) return {};
              const style: string =
                this.storage?.styleAttrForCustomStyle[customStyle];
              const styleAttr = style ? { style } : {};
              return {
                class: style ? 'custom-style' : 'unknown-custom-style',
                'custom-style': customStyle,
                ...styleAttr,
              };
            },
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    const storage = this.storage;
    return [
      new Plugin({
        key: customStylePluginKey,
        state: {
          init(config, state) { },
          apply(tr, pluginState, oldState, newState) {
            const updateDocState = tr.getMeta(META_UPDATE_DOC_STATE);
            if (
              !storage.styleAttrForCustomStyle ||
              updateDocState?.configuration
            ) {
              const configuration: PundokEditorConfig | undefined =
                updateDocState?.configuration ||
                getDocState(newState)?.configuration;
              if (configuration) {
                const cs2style: Record<string, string> = {};
                configuration?.customStyles?.forEach((styleDef) => {
                  const cssProps = styleDef && styleDef.css;
                  if (isArray(cssProps)) {
                    cs2style[styleDef.name] = cssProps
                      .map(([prop, value]) => `${prop}: ${value}`)
                      .join('; ');
                  }
                });
                storage.styleAttrForCustomStyle = cs2style;
              }
            }
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      setCustomStyle:
        (typeOrNode: TypeOrNode, cs: CustomStyleInstance, pos?: number) =>
          (cp: CommandProps) => {
            let { dispatch, state, tr } = cp;
            if (pos) {
              const typeName = typeNameOfElement(typeOrNode);
              if (typeName !== cs.element) return false;
              const node = state.doc.nodeAt(pos);
              if (!node) return false;
              if (typeName !== node?.type.name) return false;
              if (dispatch)
                dispatch(
                  tr.setNodeMarkup(pos, null, setCustomStyleAttr(node, cs)),
                );
              return true;
            }
            const schema = state.schema;
            const { customStyle } = cs.attrs;
            let markType: MarkType | undefined =
              typeOrNode instanceof MarkType
                ? typeOrNode
                : (isString(typeOrNode) && schema.marks[typeOrNode]) || undefined;
            if (markType) {
              const { from, to } = state.selection;
              tr = tr.addMark(
                from,
                to,
                markType.create({
                  customStyle,
                  kv: { 'custom-style': customStyle },
                }),
              );
            }
            return updateAttributesCommand(
              typeOrNode,
              setNodeCustomStyleCallback(typeOrNode, cs, schema),
            )({ ...cp, tr });
          },
      unsetCustomStyle:
        (typeOrNode: TypeOrNode, cs: CustomStyleInstance, pos?: number) =>
          (cp: CommandProps) => {
            const { dispatch, state, tr } = cp;
            if (pos) {
              const typeName = typeNameOfElement(typeOrNode);
              if (typeName !== cs.element) return false;
              const node = state.doc.nodeAt(pos);
              if (!node) return false;
              if (typeName !== node?.type.name) return false;
              if (dispatch)
                dispatch(
                  tr.setNodeMarkup(pos, null, unsetCustomStyleAttr(node, cs)),
                );
              return true;
            }
            let markType: MarkType | undefined =
              typeOrNode instanceof MarkType
                ? typeOrNode
                : (isString(typeOrNode) && state.schema.marks[typeOrNode]) ||
                undefined;
            if (markType) {
              const { from, to } = state.selection;
              if (dispatch) {
                tr.removeMark(from, to, markType);
              }
              return true;
            } else {
              const schema = cp.state.schema;
              return updateAttributesCommand(
                typeOrNode,
                unsetNodeCustomStyleCallback(typeOrNode, cs, schema),
              )(cp);
            }
          },
      toggleCustomStyle:
        (typeOrNode: TypeOrNode, cs: CustomStyleInstance, pos?: number) =>
          (cp: CommandProps) => {
            if (pos) {
              const { dispatch, state, tr } = cp;
              const typeName = typeNameOfElement(typeOrNode);
              if (typeName !== cs.element) return false;
              const node = state.doc.nodeAt(pos);
              if (!node) return false;
              if (typeName !== node?.type.name) return false;
              if (dispatch)
                dispatch(
                  tr.setNodeMarkup(pos, null, toggleCustomStyleAttr(node, cs)),
                );
              return true;
            }
            const schema = cp.state.schema;
            const setCallback = setNodeCustomStyleCallback(
              typeOrNode,
              cs,
              schema,
            );
            const unsetCallback = unsetNodeCustomStyleCallback(
              typeOrNode,
              cs,
              schema,
            );
            return updateAttributesCommand(typeOrNode, (n) =>
              isCustomStyleActive(cs, n) ? unsetCallback(n) : setCallback(n),
            )(cp);
          },
      setCustomMark:
        (markName: string, cs: CustomStyleInstance) => (cp: CommandProps) => {
          let { dispatch, state } = cp;
          const { customStyle } = cs.attrs;
          if (state.selection.empty) return false;
          const markType = state.schema.marks[markName];
          if (!markType) return false;
          const markAttrs = {
            customStyle,
            kv: { 'custom-style': customStyle },
          };
          // const mark = markType.create(markAttrs);
          return setMarkNoAtoms(markType, markAttrs, {
            excludeNonLeafAtoms: 'only-content',
            includeSpaces: true,
          })(state, dispatch);
        },
      unsetCustomMark:
        (markName: string, cs: CustomStyleInstance) => (cp: CommandProps) => {
          let { dispatch, state, tr } = cp;
          const { customStyle } = cs.attrs;
          const { empty, from, to } = state.selection;
          if (empty) return false;
          const markType = state.schema.marks[markName];
          if (!markType) return false;
          const mark = markType.create({
            customStyle,
            kv: { 'custom-style': customStyle },
          });
          if (dispatch) {
            tr.removeMark(from, to, mark);
            dispatch(tr);
          }
          return true;
        },
      toggleCustomMark:
        (markName: string, cs: CustomStyleInstance) => (cp: CommandProps) => {
          let { dispatch, state } = cp;
          const { customStyle } = cs.attrs;
          const { empty } = state.selection;
          if (empty) return false;
          const markType = state.schema.marks[markName];
          if (!markType) return false;
          const markAttrs = {
            customStyle,
            kv: { 'custom-style': customStyle },
          };
          return toggleMarkNoAtoms(markType, markAttrs, {
            excludeNonLeafAtoms: 'only-content',
            extendEmptyMarkRange: true,
            includeSpaces: true,
          })(state, dispatch);
        },
      updateMarkAttributes:
        (markName: string, newAttributes: Record<string, any>) =>
          (cp: CommandProps) => {
            let { dispatch, state, tr } = cp;
            const { empty, from, to } = state.selection;
            if (empty) return false;
            const markType = state.schema.marks[markName];
            if (!markType) return false;
            const hasMark = state.doc.rangeHasMark(from, to, markType);
            if (!hasMark) return false;
            const newMark = markType.create(newAttributes);
            if (dispatch) {
              tr.removeMark(from, to, markType);
              tr.addMark(from, to, newMark);
              dispatch(tr);
            }
            return true;
          },

      setCustomClass:
        (cc: CustomClass, pos?: number, config?: PundokEditorConfig) =>
          ({ dispatch, state, tr }) => {
            if (pos) {
              const node = state.doc.nodeAt(pos);
              if (!node) return false;
              if (dispatch) {
                dispatch(
                  tr.setNodeMarkup(
                    pos,
                    null,
                    setCustomClassAttr(node, cc, config),
                  ),
                );
              }
              return true;
            }
            // TODO:
            return false;
          },
      unsetCustomClass:
        (cc: CustomClass, pos?: number, config?: PundokEditorConfig) =>
          ({ dispatch, state, tr }) => {
            if (pos) {
              const node = state.doc.nodeAt(pos);
              if (!node) return false;
              if (dispatch) {
                dispatch(
                  tr.setNodeMarkup(
                    pos,
                    null,
                    unsetCustomClassAttr(node, cc, config),
                  ),
                );
              }
              return true;
            }
            // TODO:
            return false;
          },
      toggleCustomClass:
        (cc: CustomClass, pos?: number, config?: PundokEditorConfig) =>
          ({ dispatch, state, tr }) => {
            if (pos) {
              const node = state.doc.nodeAt(pos);
              if (!node) return false;
              if (dispatch) {
                dispatch(
                  tr.setNodeMarkup(
                    pos,
                    null,
                    toggleCustomClassAttr(node, cc, config),
                  ),
                );
              }
              return true;
            }
            // TODO:
            return false;
          },
    };
  },
});

function setNodeCustomStyleCallback(
  typeOrNode: TypeOrNode,
  cs: CustomStyleInstance,
  schema: Schema,
): UpdateNodeOrMarkCallback {
  const { customStyle, className, level } = cs.attrs;
  return (n) => {
    const attrs = n.attrs;
    const newType = schema.nodes[cs.element];
    const oldType = nodeTypeOf(typeOrNode, schema);
    const nodeType =
      newType && oldType && areTypesCompatible(newType, oldType)
        ? newType
        : undefined;
    let newAttrs = addClass({ ...attrs, level }, className);
    newAttrs = setCustomStyleAttribute(newAttrs, customStyle);
    return { nodeType, attrs: newAttrs };
  };
}

function unsetNodeCustomStyleCallback(
  typeOrNode: TypeOrNode,
  cs: CustomStyleInstance,
  schema: Schema,
): UpdateNodeOrMarkCallback {
  return (n) => {
    if (typeOrNode && nodeTypeOf(typeOrNode, schema) != n.type)
      return undefined;
    return { attrs: unsetCustomStyleAttr(n, cs) };
  };
}
