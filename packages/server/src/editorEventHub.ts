import type { Response } from 'express';
import type { IpcMainToRendererChannel, ServerMessage } from '../../common/src';
import type { RendererHub } from '../../backend/src';

const HEARTBEAT_INTERVAL_MS = 15_000;

/**
 * Delivers Main-to-Renderer messages to every connected browser for a user.
 *
 * Messages are intentionally not queued: a browser must be connected when a
 * backend operation emits an event, just as Electron's renderer must exist
 * before `webContents.send` can deliver one.
 */
export class EditorEventHub {
  private readonly connections = new Map<string, Set<Response>>();

  connect(username: string, response: Response): void {
    response.status(200);
    response.set({
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
      'X-Accel-Buffering': 'no',
    });
    response.flushHeaders();
    response.write(': connected\n\n');

    const userConnections =
      this.connections.get(username) || new Set<Response>();
    userConnections.add(response);
    this.connections.set(username, userConnections);

    const heartbeat = setInterval(
      () => response.write(': heartbeat\n\n'),
      HEARTBEAT_INTERVAL_MS,
    );
    response.on('close', () => {
      clearInterval(heartbeat);
      userConnections.delete(response);
      if (userConnections.size === 0) this.connections.delete(username);
    });
  }

  send(
    username: string,
    channel: IpcMainToRendererChannel,
    message: ServerMessage,
  ): void {
    const event = `event: ${channel}\ndata: ${JSON.stringify(message)}\n\n`;
    for (const response of this.connections.get(username) || []) {
      response.write(event);
    }
  }

  forUser(username: string): RendererHub {
    return new ServerRendererHub(this, username);
  }
}

class ServerRendererHub implements RendererHub {
  constructor(
    private readonly events: EditorEventHub,
    private readonly username: string,
  ) {}

  send(channel: IpcMainToRendererChannel, message: ServerMessage): void {
    this.events.send(this.username, channel, message);
  }
}
