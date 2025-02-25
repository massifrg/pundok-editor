import { Extension } from '@tiptap/core';
import { Fragment, Node, ResolvedPos, Slice } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import { JsonPastePlugin, META_COPY_AS_JSON } from '../helpers/JsonPastePlugin';
import { NODE_NAME_BREAK, NODE_NAME_NOTE } from '../../common';
import { textNode } from '../helpers';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customPaste: {
      copyAsJson(node?: Node): ReturnType;
    };
  }
}

export const CustomPasteExtension = Extension.create({
  name: 'customPaste',

  addProseMirrorPlugins() {
    return [
      JsonPastePlugin,
      new Plugin({
        key: new PluginKey('customPaste'),
        props: {
          // handlePaste(view: EditorView, event: ClipboardEvent, slice: Slice) {
          //   // console.log(event)
          //   // console.log(slice)
          //   return false
          // },
          // transformPastedText(text: string, plain: boolean, view: EditorView) {
          //   console.log(text)
          //   console.log(plain)
          //   return text
          // },
          clipboardTextParser(
            text: string,
            $context: ResolvedPos,
            plain: boolean,
            view: EditorView
          ) {
            const lines = text.split(/[\r\n]+/);
            const schema = view.state.schema;
            const breakNode = schema.nodes[NODE_NAME_BREAK].create({ soft: true });
            // const paraType = schema.nodes[NODE_NAME_PARAGRAPH]
            let content = Fragment.empty;
            lines.forEach((line, i) => {
              if (i > 0) {
                if (!lines[i - 1].endsWith(' '))
                  content = content.append(Fragment.from(schema.text(' ')));
                content = content.append(Fragment.from(breakNode));
              }
              const node = textNode(schema, line)
              if (node)
                content = content.append(Fragment.from(node));
            });
            return new Slice(content, 0, 0);
          },
          handlePaste(view, event, slice) {
            const firstChild = slice.content.firstChild;
            if (firstChild && firstChild.type.name === NODE_NAME_NOTE) {
              console.log(slice.content);
              view.dispatch(
                view.state.tr.replaceSelection(
                  new Slice(firstChild.content, 0, 0)
                )
              );
              return true;
            }
          },
          transformPastedHTML(html, view) {
            // console.log(html);
            return html;
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      copyAsJson:
        (node?: Node) =>
          ({ dispatch, state, tr }) => {
            if (!node && state.selection.empty) return false;
            if (dispatch) dispatch(tr.setMeta(META_COPY_AS_JSON, node || true));
            return true;
          },
    };
  },
});
