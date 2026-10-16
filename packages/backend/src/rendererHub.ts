import type { IpcMainToRendererChannel, ServerMessage } from '../../common/src';

/**
 * Sends an event from a backend implementation to its renderer.
 *
 * Desktop implementations deliver events through Electron IPC; server
 * implementations deliver them to the authenticated user's browser session.
 */
export interface RendererHub {
  send(channel: IpcMainToRendererChannel, message: ServerMessage): void;
}
