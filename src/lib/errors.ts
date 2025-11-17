/**
 * Error handling utilities
 */

/**
 * Extracts a user-friendly error message from an unknown error
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/**
 * Creates an error with the original error preserved as cause
 */
export function createError(message: string, originalError: unknown): Error {
  const error = new Error(message);
  if (originalError instanceof Error) {
    error.cause = originalError;
  }
  return error;
}

/**
 * Checks if an error is retryable (network/timeout errors)
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const retryableMessages = [
    'fetch failed',
    'network error',
    'timeout',
    'ECONNREFUSED',
    'ETIMEDOUT',
  ];

  return retryableMessages.some((msg) =>
    error.message.toLowerCase().includes(msg.toLowerCase())
  );
}

/**
 * Retries an async operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    retries?: number;
    initialDelay?: number;
    maxDelay?: number;
  } = {}
): Promise<T> {
  const { retries = 3, initialDelay = 1000, maxDelay = 10000 } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < retries && isRetryableError(error)) {
        const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}
