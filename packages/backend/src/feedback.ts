import type {
  EditorKeyType,
  FeedbackMessage,
  ServerMessageFeedback,
} from '../../common/src';
import type { RendererHub } from './rendererHub';

export interface FeedbackSink {
  report(feedback: FeedbackMessage, editorKey?: EditorKeyType): void;
}

export function feedbackSink(events: RendererHub): FeedbackSink {
  return {
    report(feedback, editorKey) {
      const message: ServerMessageFeedback = {
        type: 'feedback',
        feedback,
        editorKey,
      };
      events.send('feedback', message);
    },
  };
}

export function messageFeedback(
  feedback: FeedbackSink,
  message: string,
  editorKey?: EditorKeyType,
): void {
  feedback.report({ type: 'success', message, level: 1 }, editorKey);
}

export function errorFeedback(
  feedback: FeedbackSink,
  message: string,
  editorKey?: EditorKeyType,
): void {
  feedback.report({ type: 'error', message, level: 1 }, editorKey);
}

export function commandLineFeedback(
  feedback: FeedbackSink,
  commandLine: string,
  editorKey?: EditorKeyType,
): void {
  feedback.report(
    { type: 'command-line', message: commandLine, level: 1 },
    editorKey,
  );
}

export function progressFeedback(
  feedback: FeedbackSink,
  source: 'out' | 'err' | 'end',
  message: string,
  editorKey?: EditorKeyType,
): void {
  feedback.report({ type: 'progress', source, message, level: 1 }, editorKey);
}
