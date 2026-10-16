import type { CommandProps } from '@tiptap/core';
import type { Command } from '@tiptap/pm/state';

export type TiptapCommand = (props: CommandProps) => boolean;

export function asTiptapCommand(command: Command): TiptapCommand {
  return ({ state, dispatch, view }) => command(state, dispatch, view);
}
