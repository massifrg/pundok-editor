import { Extension } from '@tiptap/core';
import { innerNodeDepth } from '../helpers';
import { CustomClass, NODE_NAME_DIV } from '../../common';

export const INCLUDE_DOC_CLASS = 'include-doc';
export const INCLUDE_FORMAT_ATTR = 'include-format';
export const INCLUDE_SRC_ATTR = 'include-src';
export const INCLUDE_ID_ATTR = 'included-id';

export interface IncludeDivAttrs {
  src: string;
  format: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    includeDiv: {
      setIncludeDiv: (
        inclAttrs?: Partial<IncludeDivAttrs>,
        divPos?: number
      ) => ReturnType;
    };
  }
}

export const IncludeDivExtension = Extension.create({
  name: 'includeDiv',

  addCommands() {
    return {
      setIncludeDiv:
        (inclAttrs?: Partial<IncludeDivAttrs>, divPos?: number) =>
          ({ dispatch, editor, state, tr }) => {
            let pos = divPos;
            if (!pos) {
              const { $from } = state.selection;
              const d = innerNodeDepth($from, (n) => n.type.name === NODE_NAME_DIV);
              if (!d) return false;
              pos = $from.start(d) - 1;
            }
            if (!pos) return false;
            const div = state.doc.nodeAt(pos);
            if (!div || div.type.name !== NODE_NAME_DIV) return false;
            if (dispatch) {
              const classes = div.attrs.classes || [];
              if (!classes.includes(INCLUDE_DOC_CLASS))
                classes.push(INCLUDE_DOC_CLASS);
              tr.setNodeMarkup(pos, undefined, {
                ...div.attrs,
                classes,
                [INCLUDE_SRC_ATTR]: inclAttrs?.src,
                [INCLUDE_FORMAT_ATTR]: inclAttrs?.format,
              });
            }
            return true;
          },
    };
  },
});

export const IncludeDocCustomClass: CustomClass = {
  name: INCLUDE_DOC_CLASS,
  appliesTo: ['div'],
  description: `Replace the contents of this Div with the contents of the document in "${INCLUDE_SRC_ATTR}"`,
  attributes: [{ name: INCLUDE_FORMAT_ATTR }, { name: INCLUDE_SRC_ATTR }],
};
