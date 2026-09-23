import { Mark, mergeAttributes } from '@tiptap/core';
import type { Attrs } from '@tiptap/pm/model';
import type { Command } from '@tiptap/pm/state';
import { appliesTo, MARK_NAME_SPAN, SK } from '../../common';
import { getDocState, getSpanAttrs } from '../helpers';
import { asTiptapCommand } from '../helpers/command';
import { setMarkNoAtoms, toggleMarkNoAtoms, unsetMarkNoAtoms } from '../../commands';

export interface SpanOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    span: {
      setSpan: (attributes?: { customClasses: string[] }) => ReturnType;
      toggleSpan: (attributes?: { customClasses: string[] }) => ReturnType;
      unsetSpan: () => ReturnType;
      // unsetSpanIfUnsetAttrs: (options?: DefaultAttrValuesOptions, from?: number, to?: number) => ReturnType,
    };
  }
}

export const Span = Mark.create<SpanOptions>({
  name: MARK_NAME_SPAN,
  priority: 500,
  excludes: '',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: (e) => getSpanAttrs(this.name, e, this.editor?.state),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addMarkView() {
    // return VueMarkViewRenderer(SpanMarkView)
    return ({ mark, HTMLAttributes, view }) => {
      const dom = document.createElement('span')
      const docState = getDocState(view.state)
      const configuration = docState?.configuration
      let customStyle: string | undefined = undefined
      if (configuration) {
        const attrs = mark.attrs
        const { id, classes, kv } = attrs
        if (id)
          dom.setAttribute("id", id)
        customStyle = kv && kv['custom-style']
        if (customStyle) {
          const styleDef = configuration?.customStyles?.find(
            (d) => d.name == customStyle && appliesTo(d, MARK_NAME_SPAN)
          )
          if (styleDef && Array.isArray(styleDef.css) && styleDef.css.length > 0) {
            dom.setAttribute("style", styleDef.css
              .map(([prop, value]) => `${prop}: ${value}`)
              .join('; '))
          }
        }
        Object.entries({ ...HTMLAttributes, ...kv }).forEach(([k, v]) => {
          if (k === 'custom-style' || k === 'idref')
            dom.setAttribute(k, v as string)
          else
            dom.setAttribute('data-' + k, v as string)
        })
        const isCustomized = !!customStyle
          || !!configuration.customClasses?.find((cc) => !!(classes as string[]).find(c => c === cc.name))
        dom.setAttribute("class", [
          ...classes,
          isCustomized ? 'custom-style' : 'unstyled-custom-style'
        ].join(' '))
      }

      const contentDOM = document.createElement('span')
      dom.appendChild(contentDOM)
      return {
        dom,
        contentDOM,
      }
    }
  },

  addCommands() {
    return {
      setSpan: (attributes) => asTiptapCommand(setSpanCommand(attributes)),
      toggleSpan: (attributes) => asTiptapCommand(toggleSpanCommand(attributes)),
      unsetSpan: () => asTiptapCommand(unsetSpanCommand),
    };
  },

  addKeyboardShortcuts() {
    return {
      [SK.TOGGLE_SPAN]: () => this.editor.commands.toggleSpan(),
    };
  },
});

const setSpanCommand = (attributes?: Attrs): Command => (state, dispatch) => {
  const mark = state.schema.marks[MARK_NAME_SPAN];
  return !!mark && setMarkNoAtoms(mark, attributes, { excludeNonLeafAtoms: 'only-content' })(state, dispatch);
};
const toggleSpanCommand = (attributes?: Attrs): Command => (state, dispatch) => {
  const mark = state.schema.marks[MARK_NAME_SPAN];
  return !!mark && toggleMarkNoAtoms(mark, attributes, { excludeNonLeafAtoms: 'only-content', extendEmptyMarkRange: true })(state, dispatch);
};
const unsetSpanCommand: Command = (state, dispatch) => {
  const mark = state.schema.marks[MARK_NAME_SPAN];
  return !!mark && unsetMarkNoAtoms(mark, { excludeNonLeafAtoms: 'only-content' })(state, dispatch);
};
