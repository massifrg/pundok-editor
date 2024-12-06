import { Node, Slice } from '@tiptap/pm/model';
import {
  NodeSelection,
  Plugin,
  PluginKey,
  Transaction,
} from '@tiptap/pm/state';

export const META_COPY_AS_JSON = 'copy-as-json';

type JsonClipboardItemType = 'node' | 'slice';

class JsonClipboardItem {
  constructor(readonly type: JsonClipboardItemType, readonly content: string) {}
}

export const JsonPastePlugin = new Plugin({
  key: new PluginKey('JsonPaste'),
  props: {
    handlePaste(view, event, slice) {
      const item = this.getState(view.state);
      const copiedText = event.clipboardData?.getData('text/plain');
      if (item && item.content && item.content === copiedText) {
        const { dispatch, state } = view;
        if (dispatch) {
          const json = JSON.parse(item.content);
          let tr: Transaction;
          if (item.type === 'node') {
            tr = state.tr.replaceSelectionWith(
              Node.fromJSON(state.schema, json)
            );
          } else {
            tr = state.tr.replaceSelection(Slice.fromJSON(state.schema, json));
          }
          dispatch(tr);
          return true;
        }
      }
      return false;
    },
  },
  state: {
    init(): JsonClipboardItem | undefined {
      return undefined;
    },
    apply(tr, value, oldState, newState): JsonClipboardItem | undefined {
      const metaCopyAsJson = tr.getMeta(META_COPY_AS_JSON);
      let type: JsonClipboardItemType | undefined = undefined;
      let json: string | undefined = undefined;
      if (metaCopyAsJson === true) {
        const { selection } = newState;
        if (selection instanceof NodeSelection) {
          type = 'node';
          json = JSON.stringify(selection.node);
        } else {
          type = 'slice';
          json = JSON.stringify(selection.content);
        }
      } else if (metaCopyAsJson instanceof Node) {
        type = 'node';
        json = JSON.stringify(metaCopyAsJson);
      }
      if (type && json) {
        navigator.clipboard.writeText(json);
        return new JsonClipboardItem(type, json);
      }
      return value;
    },
  },
});
