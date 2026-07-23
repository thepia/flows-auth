/**
 * Generic wire-level error body shared across thepia.com's REST endpoints.
 *
 * This is intentionally narrow: it standardizes the *shape* of an error JSON
 * body (machine-readable `error` code + human `message`, with optional
 * `retryAfter`/`details`). It does not wrap success responses - those keep
 * their existing flat shapes (SignInResponse, CheckUserResponse, etc.).
 *
 * Endpoints adopt this incrementally; flows-auth's auth-api.ts falls back to
 * looser parsing for endpoints that haven't migrated yet.
 */
export interface ApiErrorBody {
  /** Machine-readable error code, e.g. 'too_many_requests', 'invalid_email' */
  error: string;
  /** Human-readable message, safe to show in logs or (translated) to users */
  message: string;
  /** Seconds until the client may retry - present for 429/503 responses */
  retryAfter?: number;
  /** Additional structured context (validation field errors, etc.) */
  details?: Record<string, unknown>;
}
