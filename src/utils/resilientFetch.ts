/**
 * Resilient Fetch Utilities
 *
 * Provides exponential-backoff retry wrappers for async operations against
 * Supabase. Distinguishes between transient failures (network errors, 5xx)
 * that should be retried and permanent failures (4xx, version conflicts) that
 * must surface immediately to the caller.
 */

import { logger } from './logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RetryOptions {
  /** Maximum number of retry attempts after the initial failure. Default: 3. */
  maxRetries?: number;
  /** Base delay in milliseconds. Delay doubles on each attempt. Default: 1000. */
  baseDelayMs?: number;
  /**
   * Predicate that receives the thrown error and returns true when the error is
   * considered transient and the operation should be retried.
   * Defaults to: network TypeErrors and HTTP 5xx status codes.
   */
  retryOn?: (error: unknown) => boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true for errors that represent transient infrastructure problems:
 * - TypeError thrown by the browser Fetch API for network-level failures.
 * - Any error whose `status` property is a 5xx HTTP status code.
 *
 * Returns false for 4xx errors (auth failures, validation errors, version
 * conflicts) because retrying those would be futile and potentially harmful.
 */
function isTransientError(error: unknown): boolean {
  // Network-level fetch errors surface as TypeErrors with messages that
  // reference 'fetch' or 'network'.
  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    if (msg.includes('fetch') || msg.includes('network')) {
      return true;
    }
  }

  // Supabase and PostgREST surface HTTP status codes on the error object.
  if (error != null && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    if (typeof status === 'number' && status >= 500 && status < 600) {
      return true;
    }
  }

  return false;
}

/**
 * Returns true for errors that originate from 4xx HTTP responses, indicating
 * a client-side problem that a retry cannot fix.
 */
function isPermanentError(error: unknown): boolean {
  if (error != null && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      return true;
    }
  }
  return false;
}

/**
 * Resolves after `ms` milliseconds. Used to introduce backoff delays between
 * retry attempts.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Core retry wrapper ───────────────────────────────────────────────────────

/**
 * Executes `fn` and retries on transient errors using exponential backoff.
 *
 * Delay schedule (baseDelayMs = 1000):
 *   Attempt 1 failure → wait 1 s → retry
 *   Attempt 2 failure → wait 2 s → retry
 *   Attempt 3 failure → wait 4 s → retry
 *   Attempt 4 failure → throw
 *
 * 4xx errors are never retried regardless of `retryOn`.
 *
 * @param fn        Async factory function to execute (and potentially retry).
 * @param options   Optional retry configuration.
 * @returns         Resolves with the result of the first successful `fn` call.
 * @throws          Re-throws the last error when all attempts are exhausted.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    retryOn = isTransientError,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const isLastAttempt = attempt >= maxRetries;

      // Never retry 4xx — these are permanent client errors.
      if (isPermanentError(error)) {
        logger.warn('[withRetry] permanent error (4xx), not retrying:', error);
        throw error;
      }

      // If the caller's predicate says this error is not retryable, stop.
      if (!retryOn(error)) {
        logger.warn('[withRetry] non-retryable error, giving up:', error);
        throw error;
      }

      if (isLastAttempt) {
        logger.error(
          `[withRetry] all ${maxRetries + 1} attempts failed. Last error:`,
          error
        );
        break;
      }

      const backoffMs = baseDelayMs * Math.pow(2, attempt);
      logger.warn(
        `[withRetry] attempt ${attempt + 1} failed. Retrying in ${backoffMs}ms…`,
        error
      );
      await delay(backoffMs);
    }
  }

  throw lastError;
}

// ─── Quote-save-specific retry ────────────────────────────────────────────────

/**
 * Shape of the data returned by a lightweight quote version probe.
 * Only the `version` field is needed for the reconciliation check.
 */
interface QuoteVersionRow {
  version: number;
}

/**
 * Wraps a quote-save operation with retry logic that includes a
 * reconciliation check before each retry attempt.
 *
 * Motivation: the `save_quote_if_version` RPC is atomic but a transient
 * network error may cause the HTTP response to be lost even though the
 * database write succeeded. Before retrying, this wrapper probes the current
 * version in the DB:
 *
 * - If the version has already incremented, the first save actually succeeded
 *   — the wrapper returns a synthetic success immediately without re-saving.
 * - If the version is unchanged, the original save definitely did not commit
 *   — the wrapper retries the save as normal.
 *
 * 4xx errors (including version-conflict rejections from the RPC) are never
 * retried because they indicate a state that a retry cannot resolve.
 *
 * @param fn              The async save function to execute.
 * @param quoteId         The UUID of the quote being saved, used for the
 *                        version probe query.
 * @param expectedVersion The version the caller believes is current. Used to
 *                        detect a ghost-success on the reconciliation check.
 * @returns               Resolves with the result of `fn` on success.
 * @throws                Re-throws when all retry attempts are exhausted.
 */
export async function withQuoteSaveRetry<T>(
  fn: () => Promise<T>,
  quoteId: string,
  expectedVersion: number
): Promise<T> {
  // Import lazily to avoid a circular dependency at module initialisation time.
  const { supabase } = await import('../lib/supabase');

  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 1000;

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Before the first attempt there is nothing to reconcile.
    if (attempt > 0) {
      // ── Reconciliation check ────────────────────────────────────────────
      // Ask the DB for the current version of this quote. If the version has
      // already been bumped beyond what we expect, our first save succeeded
      // despite the network error. Return a synthetic success without resaving.
      try {
        const { data, error: probeError } = await supabase
          .from('quotes')
          .select('version')
          .eq('id', quoteId)
          .single<QuoteVersionRow>();

        if (!probeError && data != null) {
          const currentVersion = data.version;
          // expectedVersion + 1 means the save incremented the version.
          // Any version > expected also counts as a committed save.
          if (currentVersion > expectedVersion) {
            logger.info(
              `[withQuoteSaveRetry] ghost-success detected for quote ${quoteId}. ` +
              `DB version ${currentVersion} > expected ${expectedVersion}. Skipping retry.`
            );
            // The save succeeded; reconstruct a plausible return value.
            // Callers that need the exact result (e.g. for version tracking)
            // should re-read the quote, but this avoids a redundant save.
            // We re-run fn() here so the caller gets the real SaveResult shape
            // back — the DB write is idempotent at this point (it will fail the
            // version check and the caller should reload), so instead we just
            // return the last successful call result by rethrowing as success.
            //
            // Implementation note: returning the result from `fn` again would
            // cause a version-conflict rejection from the RPC. The cleanest
            // resolution is to cast a minimal "already saved" indicator.
            // Callers using `withQuoteSaveRetry` must handle this scenario.
            //
            // To keep this utility generic we cast; the caller (useAutoSave)
            // already handles SaveResult correctly.
            return { success: true, id: quoteId, version: currentVersion } as unknown as T;
          }
          // Version unchanged — the DB write did not commit. Fall through to retry.
          logger.warn(
            `[withQuoteSaveRetry] reconciliation: DB version ${currentVersion} === expected ${expectedVersion}. ` +
            `Save did not commit. Retrying attempt ${attempt + 1}…`
          );
        } else if (probeError) {
          logger.warn('[withQuoteSaveRetry] version probe failed, retrying save anyway:', probeError);
        }
      } catch (probeErr) {
        // Probe itself failed (e.g. offline). Proceed to retry the save anyway.
        logger.warn('[withQuoteSaveRetry] version probe threw, retrying save anyway:', probeErr);
      }

      // Apply exponential backoff before the retry.
      const backoffMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await delay(backoffMs);
    }

    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const isLastAttempt = attempt >= MAX_RETRIES;

      // Never retry permanent 4xx errors (auth, validation, version conflict).
      if (isPermanentError(error)) {
        logger.warn('[withQuoteSaveRetry] permanent error, not retrying:', error);
        throw error;
      }

      if (!isTransientError(error)) {
        logger.warn('[withQuoteSaveRetry] non-retryable error, giving up:', error);
        throw error;
      }

      if (isLastAttempt) {
        logger.error(
          `[withQuoteSaveRetry] all ${MAX_RETRIES + 1} attempts failed for quote ${quoteId}:`,
          error
        );
        break;
      }

      logger.warn(
        `[withQuoteSaveRetry] attempt ${attempt + 1} failed for quote ${quoteId}. ` +
        `Will reconcile and retry…`,
        error
      );
    }
  }

  throw lastError;
}
