/**
 * Kinds of feedback messages, from the backend to the frontend.
 */
export type FeedbackMessageType =
  'command-line' | 'error' | 'progress' | 'success' | 'warning';

export interface SoftwareAvailability {
  name: string;
  version?: string;
  url: string;
}

export interface SoftwareCheckResult {
  missing: SoftwareAvailability[];
  available: SoftwareAvailability[];
}

/**
 * A feedback message from the backend to the frontend.
 */
export interface FeedbackMessage {
  /** The kind of feedback message. */
  type: FeedbackMessageType;
  /** The text message. */
  message: string;
  /** The source of the message (can be 'out', 'err', etc.) */
  source?: string;
  /** The level of verbosity needed to show this message. */
  level?: number;
  software?: SoftwareCheckResult;
}
