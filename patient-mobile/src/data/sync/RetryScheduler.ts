/**
 * Manages exponential backoff strategies for failed sync jobs.
 */
export class RetryScheduler {
  private baseDelayMs: number;
  private maxDelayMs: number;
  private maxRetries: number;

  constructor(baseDelayMs: number = 1000, maxDelayMs: number = 300000, maxRetries: number = 5) {
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
    this.maxRetries = maxRetries;
  }

  /**
   * Calculates the delay for the next retry using exponential backoff with jitter.
   */
  calculateNextDelay(retryCount: number): number {
    if (retryCount >= this.maxRetries) {
      return -1; // Max retries exceeded
    }

    // Exponential backoff: base * 2^retry
    const backoff = this.baseDelayMs * Math.pow(2, retryCount);

    // Add jitter (up to 20%) to prevent thundering herd problem
    const jitter = backoff * 0.2 * Math.random();

    const delay = Math.min(backoff + jitter, this.maxDelayMs);
    return Math.floor(delay);
  }

  shouldRetry(retryCount: number): boolean {
    return retryCount < this.maxRetries;
  }
}
