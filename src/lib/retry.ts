/**
 * Retry utility for handling transient failures with exponential backoff.
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number
  /** Initial delay in milliseconds (default: 500) */
  delayMs?: number
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number
  /** Callback invoked before each retry attempt */
  onRetry?: (attempt: number, error: Error) => void
  /** Optional function to determine if error is retryable (default: all errors) */
  isRetryable?: (error: Error) => boolean
}

/**
 * Execute an async function with automatic retry on failure.
 *
 * @example
 * ```typescript
 * const data = await withRetry(
 *   () => fetch('/api/data').then(r => r.json()),
 *   {
 *     maxAttempts: 3,
 *     onRetry: (attempt, error) => {
 *       console.warn(`Retry ${attempt}: ${error.message}`)
 *     }
 *   }
 * )
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 500,
    backoffMultiplier = 2,
    onRetry,
    isRetryable = () => true
  } = options

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      // Check if we should retry
      if (!isRetryable(lastError)) {
        throw lastError
      }

      // Don't retry on last attempt
      if (attempt < maxAttempts) {
        onRetry?.(attempt, lastError)
        const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

/**
 * Check if an error is a network error that should be retried.
 */
export function isNetworkError(error: Error): boolean {
  const message = error.message.toLowerCase()
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    error.name === 'TypeError' // Often indicates network issues
  )
}

/**
 * Check if an HTTP status code should trigger a retry.
 * Retries on: 408 (timeout), 429 (rate limit), 502-504 (gateway errors)
 */
export function isRetryableStatus(status: number): boolean {
  return (
    status === 408 || // Request Timeout
    status === 429 || // Too Many Requests
    status === 502 || // Bad Gateway
    status === 503 || // Service Unavailable
    status === 504    // Gateway Timeout
  )
}
