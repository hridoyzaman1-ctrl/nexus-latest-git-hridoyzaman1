/**
 * Safe logging utility — only logs in development builds.
 * In production, console output is suppressed to prevent information leakage.
 */
export function logError(message: string, error?: unknown) {
  if (import.meta.env.DEV) {
    console.error(message, error);
  }
}

export function logWarn(message: string, ...args: unknown[]) {
  if (import.meta.env.DEV) {
    console.warn(message, ...args);
  }
}
