import type { EditorKeyType } from '../common';
import {
  commandLineFeedback as sendCommandLineFeedback,
  errorFeedback as sendErrorFeedback,
  feedbackSink,
  messageFeedback as sendMessageFeedback,
  progressFeedback as sendProgressFeedback,
  type RendererHub,
} from '../backend';

export function messageFeedback(
  events: RendererHub,
  message: string,
  editorKey?: EditorKeyType,
): void {
  sendMessageFeedback(feedbackSink(events), message, editorKey);
}

export function errorFeedback(
  events: RendererHub,
  message: string,
  editorKey?: EditorKeyType,
): void {
  sendErrorFeedback(feedbackSink(events), message, editorKey);
}

export function commandLineFeedback(
  events: RendererHub,
  commandLine: string,
  editorKey?: EditorKeyType,
): void {
  sendCommandLineFeedback(feedbackSink(events), commandLine, editorKey);
}

export function progressFeedback(
  events: RendererHub,
  source: 'out' | 'err' | 'end',
  message: string,
  editorKey?: EditorKeyType,
): void {
  sendProgressFeedback(feedbackSink(events), source, message, editorKey);
}
