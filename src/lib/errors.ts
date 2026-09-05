import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Application error hierarchy.
 *
 * Class inheritance is the right tool here — `instanceof` identifies the error
 * kind, and there are no React hooks involved.
 * (React COMPONENTS use composition instead — see CLAUDE.md.)
 */
export abstract class AppError extends Error {
  abstract readonly kind: string;

  /** Message safe to show to the end user. */
  abstract readonly userMessage: string;

  protected constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Not signed in, or the session has expired. */
export class AuthError extends AppError {
  readonly kind = 'auth';
  readonly userMessage: string;

  constructor(
    message: string,
    userMessage = 'You need to sign in. Please log in again.',
    cause?: unknown,
  ) {
    super(message, cause);
    this.userMessage = userMessage;
  }
}

/** Signed in, but not allowed to perform this action (blocked by RLS or a role check). */
export class PermissionError extends AppError {
  readonly kind = 'permission';
  readonly userMessage: string;

  constructor(
    message: string,
    userMessage = 'You do not have permission to perform this action.',
    cause?: unknown,
  ) {
    super(message, cause);
    this.userMessage = userMessage;
  }
}

/** The database rejected the operation because a business rule was violated. */
export class BusinessRuleError extends AppError {
  readonly kind = 'business_rule';
  readonly userMessage: string;

  constructor(userMessage: string, cause?: unknown) {
    super(userMessage, cause);
    this.userMessage = userMessage;
  }
}

/** The requested record does not exist. */
export class NotFoundError extends AppError {
  readonly kind = 'not_found';
  readonly userMessage: string;

  constructor(what: string, cause?: unknown) {
    super(`${what} not found`, cause);
    this.userMessage = `${what} not found.`;
  }
}

/** Network, server, or any other unexpected failure. */
export class DataAccessError extends AppError {
  readonly kind = 'data_access';
  readonly userMessage = 'Could not load data. Please try again.';

  constructor(message: string, cause?: unknown) {
    super(message, cause);
  }
}

/**
 * Translates a PostgREST error into an application error.
 *
 * Postgres / PostgREST codes:
 *   42501    — permission denied (GRANT / REVOKE)
 *   P0001    — RAISE EXCEPTION (our own business rules)
 *   PGRST301 — JWT missing or expired
 *   PGRST116 — no rows returned where one was required
 */
export function toAppError(error: PostgrestError | Error | unknown, context: string): AppError {
  if (error instanceof AppError) return error;

  const pg = error as Partial<PostgrestError>;
  const code = pg?.code ?? '';
  const message = pg?.message ?? (error instanceof Error ? error.message : String(error));

  if (code === 'P0001') {
    // RAISE EXCEPTION from our own functions — the message is already
    // user-facing English, so surface it as-is.
    return new BusinessRuleError(message, error);
  }
  if (code === '42501') {
    return new PermissionError(`${context}: ${message}`, undefined, error);
  }
  if (code === 'PGRST301' || code === '401') {
    return new AuthError(`${context}: ${message}`, undefined, error);
  }
  if (code === 'PGRST116') {
    return new NotFoundError(context, error);
  }
  return new DataAccessError(`${context}: ${message}`, error);
}
