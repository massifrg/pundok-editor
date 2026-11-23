const NOTIFY_MESSAGE_DURATION_MS = 40
const MIN_NOTIFY_TIMEOUT_MS = 1500
const MAX_NOTIFY_TIMEOUT_MS = 10000

/**
 * Compute the duration time of a notification message according to the message length,
 * with min and max thresholds.
 * @param message The notification message.
 * @returns 
 */
export function notifyTimeout(message: string): number {
  return Math.min(
    MAX_NOTIFY_TIMEOUT_MS,
    Math.max(MIN_NOTIFY_TIMEOUT_MS, message.length * NOTIFY_MESSAGE_DURATION_MS),
  )
}
