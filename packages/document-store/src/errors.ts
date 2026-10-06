/**
 * Typed persistence errors.
 *
 * Every failure mode the store can reach has its own error so callers can
 * distinguish a genuine conflict from corrupt data without inspecting messages.
 * None of these leak internal implementation details to end users.
 */

/** Base class for all document-store errors. */
export class DocumentStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentStoreError";
  }
}

/** No document exists for the provided project id. */
export class DocumentNotFoundError extends DocumentStoreError {
  constructor(projectId: string) {
    super(`No document found for project "${projectId}".`);
    this.name = "DocumentNotFoundError";
  }
}

/**
 * A save failed because the document had changed since it was loaded.
 *
 * Indicates a stale revision need not be treated as a database failure.
 */
export class RevisionConflictError extends DocumentStoreError {
  /** The revision id the document was loaded against. */
  readonly expectedCurrentRevisionId: string;

  constructor(expectedCurrentRevisionId: string, message: string) {
    super(message);
    this.name = "RevisionConflictError";
    this.expectedCurrentRevisionId = expectedCurrentRevisionId;
  }
}

/** A save, load, or other persistence operation failed. */
export class DocumentPersistenceError extends DocumentStoreError {
  constructor(message: string) {
    super(message);
    this.name = "DocumentPersistenceError";
  }
}

/** A stored document failed to deserialize. */
export class DocumentDeserializationError extends DocumentStoreError {
  constructor(message: string) {
    super(message);
    this.name = "DocumentDeserializationError";
  }
}

/** A stored document failed structural validation. */
export class DocumentValidationError extends DocumentStoreError {
  constructor(errors: readonly string[]) {
    super(`Invalid stored document: ${errors.join("; ")}`);
    this.name = "DocumentValidationError";
    this.errors = errors;
  }

  readonly errors: readonly string[];
}
