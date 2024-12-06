import { mergeAttributes, Node } from '@tiptap/core';
import { Fragment, Node as PmNode } from '@tiptap/pm/model';
import {
  NodeSelection,
  Plugin,
  PluginKey,
  TextSelection,
} from '@tiptap/pm/state';
import { DEFAULT_RAW_BLOCK_FORMAT, SK_CONVERT_TO_RAWBLOCK } from '../../common';
import { CodeBlock, getEditorConfiguration, PandocTable, RawInline } from '..';
import {
  depthOfInnerNodeType,
  innerBlockDepth,
  isCellSelection,
} from '../helpers';
import { RawBlockView } from '../../components';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import { CellSelection } from '@massifrg/prosemirror-tables-sections';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    rawBlock: {
      insertRawBlock: (format?: string, text?: string | string[]) => ReturnType;
      convertToRawBlock: (format?: string) => ReturnType;
      rawBlockToText: () => ReturnType;
    };
  }
}

export interface RawBlockOptions {
  defaultFormat: string;
  exitOnTripleEnter: boolean;
  HTMLAttributes: Record<string, any>;
}

export const RawBlock = Node.create<RawBlockOptions>({
  name: 'rawBlock',
  content: 'text*',
  group: 'block',
  code: true,
  // atom: true,
  marks: '',

  addOptions() {
    return {
      defaultFormat: DEFAULT_RAW_BLOCK_FORMAT,
      exitOnTripleEnter: true,
      HTMLAttributes: {
        class: 'raw-block',
        spellcheck: false,
      },
    };
  },

  addAttributes() {
    const options = this.options;
    return {
      format: {
        default: this.options.defaultFormat,
        parseHTML(element: HTMLElement) {
          return element.getAttribute('data-format') || '';
        },
        renderHTML(attrs) {
          return attrs.format
            ? {
                class: `format-${attrs.format}`,
                'data-format': attrs.format,
              }
            : {
                'data-format': options.defaultFormat,
              };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'pre.raw-block',
        preserveWhitespace: 'full',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'pre',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      ['code', 0],
    ];
  },

  addNodeView() {
    return VueNodeViewRenderer(RawBlockView);
  },

  addKeyboardShortcuts() {
    return {
      // this code is taken and slightly modified from:
      // https://github.com/ueberdosis/tiptap/blob/main/packages/extension-code-block/src/code-block.ts

      // remove rawBlock when at start of document or rawBlock is empty
      Backspace: () => {
        const { empty, $anchor } = this.editor.state.selection;
        const isAtStart = $anchor.pos === 1;

        if (!empty || $anchor.parent.type.name !== this.name) {
          return false;
        }

        if (isAtStart || !$anchor.parent.textContent.length) {
          return this.editor.commands.clearNodes();
        }

        return false;
      },

      // exit node on triple enter
      Enter: ({ editor }) => {
        if (!this.options.exitOnTripleEnter) {
          return false;
        }

        const { state } = editor;
        const { selection } = state;
        const { $from, empty } = selection;

        if (!empty || $from.parent.type !== this.type) {
          return false;
        }

        const isAtEnd = $from.parentOffset === $from.parent.nodeSize - 2;
        const endsWithDoubleNewline = $from.parent.textContent.endsWith('\n\n');

        if (!isAtEnd || !endsWithDoubleNewline) {
          return false;
        }

        return editor
          .chain()
          .command(({ tr }) => {
            tr.delete($from.pos - 2, $from.pos);

            return true;
          })
          .exitCode()
          .run();
      },

      [SK_CONVERT_TO_RAWBLOCK]: () => this.editor.commands.convertToRawBlock(),
    };
  },

  addProseMirrorPlugins() {
    return [
      // this code is taken and slightly modified from:
      // https://github.com/ueberdosis/tiptap/blob/main/packages/extension-code-block/src/code-block.ts
      // this plugin creates a code block for pasted content from VS Code
      // we can also detect the copied code language
      new Plugin({
        key: new PluginKey('rawBlockPasteHandler'),
        props: {
          handlePaste: (view, event) => {
            if (!event.clipboardData) {
              return false;
            }

            // don’t create a new code block within code blocks
            if (this.editor.isActive(this.type.name)) {
              return false;
            }

            const text = event.clipboardData.getData('text/plain');
            const vscode = event.clipboardData.getData('vscode-editor-data');
            const vscodeData = vscode ? JSON.parse(vscode) : undefined;
            const format = vscodeData?.mode;

            if (!text || !format) {
              return false;
            }

            const { tr } = view.state;

            // create an empty code block
            tr.replaceSelectionWith(this.type.create({ format }));

            // put cursor inside the newly created code block
            tr.setSelection(
              TextSelection.near(
                tr.doc.resolve(Math.max(0, tr.selection.from - 2)),
              ),
            );

            // add text to code block
            // strip carriage return chars from text pasted as code
            // see: https://github.com/ProseMirror/prosemirror-view/commit/a50a6bcceb4ce52ac8fcc6162488d8875613aacd
            tr.insertText(text.replace(/\r\n?/g, '\n'));

            // store meta information
            // this is useful for other plugins that depends on the paste event
            // like the paste rule plugin
            tr.setMeta('paste', true);

            view.dispatch(tr);

            return true;
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      insertRawBlock:
        (rawformat?: string, rawtext?: string | string[]) =>
        ({ state, dispatch, tr }) => {
          const rawBlockType = state.schema.nodes.rawBlock;
          const { doc, selection, schema } = state;
          const { empty, from, to, $from, $to } = selection;
          const isarray = Array.isArray(rawtext);
          if (isarray && rawtext.length < 1) return false;
          const rt1: string | undefined = isarray ? rawtext[0] : rawtext;
          const rt2: string | undefined = isarray ? rawtext[1] : undefined;

          // the selection is a Block or a table CellSelection
          const isBlockSelection =
            selection instanceof NodeSelection && selection.node.isBlock;
          const isCellSelection = selection instanceof CellSelection;
          if (isBlockSelection || isCellSelection) {
            let selectedNode: PmNode | null = null;
            let insertPos1 = from;
            if (isCellSelection) {
              let d = $from.depth + 1;
              do {
                d--;
                selectedNode = $from.node(d);
              } while (
                d > 0 &&
                selectedNode &&
                selectedNode.type.name !== PandocTable.name
              );
              insertPos1 = $from.start(d) - 1;
            } else {
              selectedNode = selection.node;
              insertPos1 = from;
            }
            if (!selectedNode) return false;
            const insertPos2 = insertPos1 + selectedNode.nodeSize;
            if (dispatch) {
              // console.log(selectedNode);
              const config = getEditorConfiguration(state);
              const format =
                rawformat ||
                config?.defaultRawFormat ||
                this.options.defaultFormat ||
                DEFAULT_RAW_BLOCK_FORMAT;
              const rawBlock1 =
                (rt1 && rawBlockType.create({ format }, schema.text(rt1))) ||
                null;
              const rawBlock2 =
                (rt2 && rawBlockType.create({ format }, schema.text(rt2))) ||
                null;
              if (rawBlock2) tr.insert(insertPos2, rawBlock2);
              if (rawBlock1) tr.insert(insertPos1, rawBlock1);
              dispatch(tr);
            }
            return true;
          }

          const depth1 = innerBlockDepth($from);
          const depth2 = innerBlockDepth($to);
          // console.log(`depth1: ${depth1}, depth2: ${depth2}`);
          if (depth1 < 0 || depth2 < 0) return false;
          if (dispatch) {
            const config = getEditorConfiguration(state);
            const depth = Math.min(depth1, depth2);
            const pos1 = $from.start(depth) - 1;
            const pos2 = $to.start(depth) + $to.node(depth).nodeSize - 1;
            const format =
              rawformat ||
              config?.defaultRawFormat ||
              this.options.defaultFormat ||
              DEFAULT_RAW_BLOCK_FORMAT;
            if (isarray) {
              // two texts
              const rawBlock1 =
                (rt1 && rawBlockType.create({ format }, schema.text(rt1))) ||
                null;
              const rawBlock2 =
                (rt2 && rawBlockType.create({ format }, schema.text(rt2))) ||
                null;
              if (rawBlock2) tr.insert(pos2, rawBlock2);
              if (rawBlock1) tr.insert(pos1, rawBlock1);
            } else if (!rt1) {
              // no text
              if (empty) {
                // no text and empty selection
                const text = $from.node(depth1).textContent;
                const rawBlock = rawBlockType.create(
                  { format },
                  schema.text(text),
                );
                if (!rawBlock) return false;
                const pos = $from.start(depth1) - 1;
                tr.setSelection(
                  new NodeSelection(doc.resolve(pos)),
                ).replaceSelectionWith(rawBlock);
              } else {
                // no text and range selected
                const text = doc.textBetween(from, to, '\n', toRawBlockText);
                const rawBlock = rawBlockType.create(
                  { format },
                  schema.text(text),
                );
                tr.replaceRangeWith(from, to, rawBlock);
              }
            } else {
              // one text
              if (empty) {
                // one text and empty selection
                const rawBlock = rawBlockType.create(
                  { format },
                  schema.text(rt1),
                );
                const splitDepth = $from.depth - depth1;
                const offset = splitDepth;
                const isAtStart = $from.start() === from;
                const insertionPos = isAtStart ? from - 1 : from + offset;
                if (!isAtStart) tr = tr.split(from, splitDepth);
                tr.insert(insertionPos, rawBlock);
              } else {
                // one text and range selected
                const text = doc.textBetween(from, to, '\n', toRawBlockText);
                const rawBlock = rawBlockType.create(
                  { format },
                  schema.text(rawtext + text),
                );
                tr.replaceRangeWith(from, to, rawBlock);
              }
            }
            dispatch(tr);
          }
          return true;
        },
      convertToRawBlock:
        (format) =>
        ({ state, dispatch }) => {
          const { empty, $from } = state.selection;
          if (!empty) return false;
          const depth = depthOfInnerNodeType($from, [
            RawBlock.name,
            CodeBlock.name,
          ]);
          if (!depth) return false;
          if (dispatch) {
            const node = $from.node(depth);
            const config = getEditorConfiguration(state);
            const currentFormat =
              node.attrs?.format ||
              node.attrs?.kv?.format ||
              config?.defaultRawFormat ||
              this.options.defaultFormat ||
              DEFAULT_RAW_BLOCK_FORMAT;
            const rawBlock = state.schema.nodes[this.name].create(
              { format: format || currentFormat },
              node.content,
            );
            const sel = NodeSelection.create(state.doc, $from.before(depth));
            dispatch(state.tr.setSelection(sel).replaceSelectionWith(rawBlock));
          }
          return true;
        },
      rawBlockToText:
        () =>
        ({ state, dispatch }) => {
          const { empty, $from } = state.selection;
          if (!empty) return false;
          const depth = depthOfInnerNodeType($from, [RawBlock.name]);
          if (!depth) return false;
          const node = $from.node(depth);
          if (node.childCount !== 1) return false;
          if (dispatch) {
            const lines = node
              .firstChild!.textContent.split(/\r?\n/)
              .map((t) => state.schema.text(t))
              .map((t) =>
                state.schema.nodes.paragraph.createAndFill(null, t),
              ) as PmNode[];
            dispatch(
              state.tr.replaceWith(
                $from.before(depth),
                $from.after(depth),
                Fragment.from(lines),
              ),
            );
          }
          return true;
        },
    };
  },
});

function toRawBlockText(node: PmNode): string {
  return node.type.name === RawInline.name ? node.attrs.text : '';
}
