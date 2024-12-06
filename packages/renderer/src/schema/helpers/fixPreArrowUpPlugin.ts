import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import { innerNodeDepth } from './nodeDepth';

const FIX_PRE_ARROWUP_PLUGIN_KEY = 'fix-pre-arrowup-plugin';
export const fixPreArrowUpPluginKey = new PluginKey(FIX_PRE_ARROWUP_PLUGIN_KEY);

interface PreCursor {
  cursorPos: number;
  lineIndex: number;
  lineStarts: number[];
}

class FixPreArrowUpState {
  constructor(
    public start: number = 0,
    public cursor: PreCursor | null = null,
  ) {}
}

export function fixPreArrowUpPlugin(nodeTypes: string[]) {
  return new Plugin({
    key: fixPreArrowUpPluginKey,
    state: {
      init(): FixPreArrowUpState {
        return new FixPreArrowUpState();
      },
      apply(tr, prev): FixPreArrowUpState {
        const meta = tr.getMeta(fixPreArrowUpPluginKey);
        let pluginState = prev;
        if (meta) {
          const { start, cursor } = meta;
          pluginState =
            start > 0
              ? new FixPreArrowUpState(start, cursor)
              : new FixPreArrowUpState();
        }
        return pluginState;
      },
    },
    props: {
      handleDOMEvents: {
        click: (view, event) => {
          const depth = innerNodeDepth(
            view.state.selection.$from,
            (n) => nodeTypes.indexOf(n.type.name) >= 0,
          );
          if (depth) getCursorPosInPre(view, depth);
        },
        keyup: (view, event) => {
          const depth = innerNodeDepth(
            view.state.selection.$from,
            (n) => nodeTypes.indexOf(n.type.name) >= 0,
          );
          if (depth) {
            if (event.key === 'ArrowUp') {
              const { start, cursor } = fixPreArrowUpPluginKey.getState(
                view.state,
              ) as FixPreArrowUpState;
              if (cursor) {
                const { cursorPos, lineIndex, lineStarts } = cursor;
                if (lineIndex === 0) return false;
                const column = cursorPos - lineStarts[lineIndex];
                const lineStart = lineStarts[lineIndex];
                const prevLineStart = lineStarts[lineIndex - 1];
                const newPos =
                  lineStart - prevLineStart < column
                    ? lineStart - 1
                    : prevLineStart + column;
                view.dispatch(
                  view.state.tr
                    .setSelection(
                      new TextSelection(view.state.doc.resolve(start + newPos)),
                    )
                    .setMeta(fixPreArrowUpPluginKey, {
                      start,
                      cursor: {
                        cursorPos: newPos,
                        lineIndex: lineIndex - 1,
                        lineStarts,
                      },
                    }),
                );
                event.preventDefault();
                return true;
              }
            } else {
              getCursorPosInPre(view, depth);
            }
            return true;
          }
          return false;
        },
      },
    },
  });
}

function getCursorPosInPre(view: EditorView, depth: number): boolean {
  const selection = view.state.selection;
  const { from, $from } = selection;
  const block = $from.node(depth);
  const lineStarts: number[] = block.textContent
    .split(/\n/)
    .map((line) => line.length)
    .reduce(
      (acc, v) => {
        acc.push(acc[acc.length - 1] + v + 1);
        return acc;
      },
      [0],
    );
  const start = $from.start(depth);
  const cursorPos = from - start;
  let lineIndex = lineStarts.length - 1;
  for (; lineIndex > 0; lineIndex--) {
    if (cursorPos >= lineStarts[lineIndex]) break;
  }
  view.dispatch(
    view.state.tr.setMeta(fixPreArrowUpPluginKey, {
      start,
      cursor: { cursorPos, lineIndex, lineStarts },
    }),
  );
  return false;
}
