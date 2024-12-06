import {
  EditorKeyType,
  FeedbackMessage,
  ServerMessageFeedback,
} from '../common';
import { IpcHub } from './ipcHub';

/**
 * Send a message from `main` to `renderer` on the `feedback` channel.
 * @param hub       the sender hub
 * @param fbMessage the messate to be sent
 */
function feedback(
  hub: IpcHub,
  fbMessage: FeedbackMessage,
  editorKey?: EditorKeyType
) {
  const message: ServerMessageFeedback = {
    type: 'feedback',
    feedback: fbMessage,
    editorKey,
  };
  hub.send('feedback', message);
}

/**
 *
 */
export function messageFeedback(
  hub: IpcHub,
  message: string,
  editorKey?: EditorKeyType
) {
  feedback(hub, { type: 'success', message, level: 1 }, editorKey);
}

/**
 * Send an error message from `main` to `renderer` on the `feedback` channel.
 * @param hub     the sender hub
 * @param message the text message to be sent
 */
export function errorFeedback(
  hub: IpcHub,
  message: string,
  editorKey?: EditorKeyType
) {
  feedback(hub, { type: 'error', message, level: 1 }, editorKey);
}

/**
 * Send a message from `main` to `renderer` on the `feedback` channel
 * about the command line used to run an external program.
 * @param hub     the sender hub
 * @param cmdline the command line used to run the external command
 */
export function commandLineFeedback(
  hub: IpcHub,
  cmdline: string,
  editorKey?: EditorKeyType
) {
  feedback(
    hub,
    { type: 'command-line', message: cmdline, level: 1 },
    editorKey
  );
}

export function progressFeedback(
  hub: IpcHub,
  source: 'out' | 'err' | 'end',
  data: any,
  editorKey?: EditorKeyType
) {
  feedback(
    hub,
    { type: 'progress', source, message: data, level: 1 },
    editorKey
  );
}
