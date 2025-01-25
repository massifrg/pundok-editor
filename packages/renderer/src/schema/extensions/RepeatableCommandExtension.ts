import { Node as ProsemirrorNode } from '@tiptap/pm/model';
import {
  EditorState,
  Plugin,
  PluginKey,
  Transaction,
  Command as ProsemirrorCommand,
} from '@tiptap/pm/state';
import { CommandManager, Extension } from '@tiptap/core';
import {
  AttrsChange,
  canApplyRepeatableChange,
  describeAttrsChange,
  getMarkRangesBetween,
  updateAttrsWithChanges,
} from '../helpers';
import { CellSelection } from '@massifrg/prosemirror-tables-sections';
import { NodeWithPos, RawCommands, UnionCommands } from '@tiptap/vue-3';
import {
  NODE_NAME_TABLE_CELL,
  NODE_NAME_TABLE_HEADER,
  NODE_NAME_TABLE_ROW,
  shortcutSuffix,
  SK_REPEAT_COMMAND
} from '../../common';
import { isString } from 'lodash';

const REPEATABLE_COMMAND_PLUGIN = 'repeatable-command-plugin';
const SET_REPEATABLE_COMMAND = 'set-repeatable-command';
const RESET_REPEATABLE_COMMAND = 'reset-repeatable-command';

const repeatableCommandPluginKey = new PluginKey(REPEATABLE_COMMAND_PLUGIN);

interface RepeatableSingleCommand {
  commandName: keyof UnionCommands;
  description?: string;
  args?: any[];
}

interface RepeatableCommandsChain {
  repeatableCommands: {
    commandName: keyof UnionCommands;
    args: any[];
  }[];
  description?: string;
}

type RepeatableCommand = RepeatableSingleCommand | RepeatableCommandsChain;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    repeatableChange: {
      setRepeatableCommand: (repeatable: RepeatableCommand) => ReturnType;
      resetRepeatableCommand: () => ReturnType;
      runRepeatableCommand: (
        command: keyof UnionCommands,
        description: string,
        ...args: any[]
      ) => ReturnType;
      runRepeatableCommandsChain: (
        commandsList: any[][],
        description: string,
      ) => ReturnType;
      repeatCommand: (...extraArgs: any[]) => ReturnType;
      setAttrsChange: (change: AttrsChange, pos?: number) => ReturnType;
      applyAttrsChange: (change: AttrsChange, pos?: number) => ReturnType;
    };
  }
}

export const RepeatableCommandExtension = Extension.create({
  name: 'repeatableCommand',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: repeatableCommandPluginKey,
        state: {
          init(config, state): RepeatableCommand | undefined {
            return undefined;
          },
          apply(
            tr,
            current,
            oldState,
            newState,
          ): RepeatableCommand | undefined {
            const rc: RepeatableCommand =
              tr.getMeta(SET_REPEATABLE_COMMAND) || current;
            if (tr.getMeta(RESET_REPEATABLE_COMMAND)) return undefined;
            // console.log(rc)
            return rc;
          },
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      [SK_REPEAT_COMMAND]: () => {
        // console.log(`repeat last change`);
        return this.editor.commands.repeatCommand();
      },
    };
  },

  addCommands() {
    return {
      setRepeatableCommand:
        (repeatable: RepeatableCommand) =>
          ({ dispatch, tr }) => {
            if (dispatch)
              dispatch(tr.setMeta(SET_REPEATABLE_COMMAND, repeatable));
            return true;
          },
      resetRepeatableCommand:
        () =>
          ({ dispatch, tr }) => {
            if (dispatch) dispatch(tr.setMeta(RESET_REPEATABLE_COMMAND, true));
            return true;
          },
      runRepeatableCommand:
        (
          commandName: keyof RawCommands,
          description: string = '',
          ...args: any[]
        ) =>
          ({ can, commands, dispatch, tr }) => {
            const command = commands[commandName];
            if (!command) {
              console.log(`command "${commandName}" not repeatable`);
              return false;
            }
            // @ts-expect-error
            const ret = dispatch ? command(...args) : can()[commandName](...args);
            // console.log(
            //   `runRepeatableCommand, ret=${ret}, dispatch=${!!dispatch}`,
            // );
            if (ret && dispatch)
              dispatch(
                tr.setMeta(SET_REPEATABLE_COMMAND, {
                  type: 'tiptap',
                  commandName,
                  description,
                  args,
                } as RepeatableSingleCommand),
              );
            return ret;
          },
      runRepeatableCommandsChain:
        (commandsList: any[][], description: string = '') =>
          ({ commands, dispatch, editor, state }) => {
            const cmdNames: (keyof UnionCommands)[] = [];
            const cmdArgs: any[][] = [];
            for (let i = 0; i < commandsList.length; i++) {
              const cmd = commandsList[i];
              const cmdName = cmd[0] as keyof UnionCommands;
              if (!isString(cmdName)) return false;
              if (!commands[cmdName]) return false;
              cmdNames.push(cmdName);
              cmdArgs.push((cmd.slice(1) || []) as any[]);
            }
            const repeatableCommands: {
              commandName: keyof UnionCommands;
              args: any[];
            }[] = [];
            const cm = new CommandManager({ editor, state });
            let chain = dispatch ? cm.createChain() : cm.createCan().chain();
            for (let i = 0; i < cmdNames.length; i++) {
              const commandName = cmdNames[i];
              const args = cmdArgs[i];
              // @ts-expect-error
              chain = chain[commandName](...args);
              repeatableCommands.push({ commandName, args });
            }
            // console.log(repeatableCommands)
            chain = chain.setRepeatableCommand({
              repeatableCommands,
              description,
            });
            return chain.run();
          },

      repeatCommand:
        (...extraArgs) =>
          ({ commands, can, editor, dispatch, state }) => {
            const repeatable = repeatableCommandPluginKey.getState(
              state,
            ) as RepeatableCommand;
            if (!repeatable) return false;
            const isSingle = !!(repeatable as RepeatableSingleCommand)
              .commandName;
            if (isSingle) {
              let { commandName, args } = repeatable as RepeatableSingleCommand;
              args = args || [];
              args = extraArgs ? [...args, ...extraArgs] : args;
              // console.log(repeatable)
              const command = commands[commandName];
              if (!command) {
                console.log(`command "${commandName}" not repeatable`);
                return false;
              }
              // console.log(args)
              // @ts-expect-error
              return dispatch ? command(...args) : can()[commandName](...args);
            } else {
              const { repeatableCommands } =
                repeatable as RepeatableCommandsChain;
              if (!repeatableCommands) return false;
              const cm = new CommandManager({ editor, state });
              let chain = dispatch ? cm.createChain() : cm.createCan().chain();
              repeatableCommands.forEach((rcmd) => {
                const { commandName, args } = rcmd;
                // @ts-expect-error
                chain = chain[commandName](...args);
              });
              return chain.run();
            }
          },
      setAttrsChange:
        (change: AttrsChange, pos?: number) =>
          ({ dispatch, tr }) => {
            if (dispatch)
              dispatch(
                tr.setMeta(SET_REPEATABLE_COMMAND, {
                  type: 'tiptap',
                  commandName: 'applyAttrsChange',
                  args: [change, pos],
                } as RepeatableSingleCommand),
              );
            return true;
          },
      applyAttrsChange:
        (change: AttrsChange, _pos?: number) =>
          ({ dispatch, state }) =>
            applyAttrsChangeCommand(change, _pos)(state, dispatch),
    };
  },
});

const applyAttrsChangeCommand: (
  change: AttrsChange,
  _pos?: number,
) => ProsemirrorCommand = (change, _pos) => (state, dispatch) => {
  const elemType = change.elemType;
  // console.log(`elemType=${elemType}`);
  let pos = _pos;
  let canApply = false;
  let _tr: Transaction | undefined = undefined;
  const { doc, schema, selection } = state;

  const isNodeChange = !!schema.nodes[elemType];
  const isMarkChange = !!schema.marks[elemType];

  // NODES
  if (isNodeChange) {
    const nodesWithPos: NodeWithPos[] = [];

    function addNodeIfChangeAppliable(
      n: ProsemirrorNode | null,
      p: number,
    ): boolean {
      if (n && canApplyRepeatableChange(n, change)) {
        nodesWithPos.push({ node: n, pos: p });
        return true;
      }
      return false;
    }

    if (!pos) {
      if (selection instanceof CellSelection) {
        const { $anchorCell, $headCell } = selection;
        const tableStart = $anchorCell.start(-1);
        switch (elemType) {
          case NODE_NAME_TABLE_CELL:
          case NODE_NAME_TABLE_HEADER:
            selection.forEachCell((cell, cellpos) => {
              addNodeIfChangeAppliable(cell, cellpos);
            });
            break;
          case NODE_NAME_TABLE_ROW:
            const startRowPos = $anchorCell.start() - 1;
            const endRowPos = $headCell.start() - 1;
            let rowpos = startRowPos;
            while (rowpos <= endRowPos) {
              const row = doc.nodeAt(rowpos);
              addNodeIfChangeAppliable(row, rowpos);
              if (!row) break;
              rowpos += row.nodeSize;
            }
            break;
          default:
            selection.forEachCell((cell, cpos) => {
              const from = tableStart + cpos;
              const to = from + cell.content.size;
              doc.nodesBetween(from, to, (node, pos) => {
                addNodeIfChangeAppliable(node, pos);
              });
            });
        }
      } else {
        const { from, to, empty, $from } = selection;
        if (empty) {
          // no pos, empty selection
          for (let d = $from.depth; d > 0; d--) {
            if (addNodeIfChangeAppliable($from.node(d), $from.start(d) - 1))
              break;
          }
        } else {
          // no pos, some text selection
          state.doc.nodesBetween(from, to, (n, p) => {
            addNodeIfChangeAppliable(n, p);
          });
        }
      }
    } else {
      // pos!
      addNodeIfChangeAppliable(doc.nodeAt(pos), pos);
    }
    canApply = nodesWithPos.length > 0;
    if (dispatch) {
      nodesWithPos.forEach(({ node, pos }) => {
        _tr = applyRepeatableChangeToNode(change, state, node, pos, _tr);
      });
    }
  } else if (isMarkChange) {
    // MARKS
    const { from, to } = selection;
    const ranges = getMarkRangesBetween(from, to, doc);
    ranges.forEach((r) => {
      if (canApplyRepeatableChange(r.mark, change)) {
        canApply = true;
        if (dispatch) {
          const updatedMark = schema.marks[elemType].create(
            updateAttrsWithChanges(r.mark, change),
          );
          _tr = (_tr || state.tr)
            .removeMark(r.from, r.to, r.mark)
            .addMark(r.from, r.to, updatedMark);
        }
      }
    });
  } else {
    return false;
  }

  if (canApply && dispatch && _tr) dispatch(_tr);
  return canApply;
};

function applyRepeatableChangeToNode(
  change: AttrsChange,
  state: EditorState,
  node: ProsemirrorNode,
  pos: number,
  tr?: Transaction,
): Transaction | undefined {
  if (!node) return tr;
  if (!canApplyRepeatableChange(node, change)) return tr;
  const attrs = updateAttrsWithChanges(node, change);
  return (tr || state.tr).setNodeMarkup(pos, undefined, attrs);
}

export function getCurrentRepeatableCommand(
  state: EditorState,
): RepeatableSingleCommand | undefined {
  return repeatableCommandPluginKey.getState(state);
}

export function currentRepeatableCommandTooltip(state: EditorState): string {
  let tooltip = 'repeat last command' + shortcutSuffix('SK_REPEAT_COMMAND');
  const repeatable = getCurrentRepeatableCommand(state);
  if (repeatable) tooltip += `: ${describeRepeatableCommand(repeatable)}`;
  return tooltip;
}

function describeRepeatableCommand(rep: RepeatableSingleCommand): string {
  const { commandName, description, args } = rep;
  if (commandName === 'applyAttrsChange') {
    const change = args && args[0];
    return change
      ? `change attributes of a "${change.elemType}":\n${describeAttrsChange(
        change,
      )}`
      : '';
  }
  return description || commandName;
}
