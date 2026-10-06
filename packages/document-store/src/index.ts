/**
 * `@aiphotoshop/document-store`
 *
 * The persistence boundary for design documents.
 *
 * Architecture:
 *
 * ```text
 *                 ┌──────────────────┐
 *                 │   DesignDocument │   canonical model (design-schema)
 *                 └────────┬─────────┘
 *                          │ serialize / deserialize
 *                 ┌────────▼─────────┐
 *                 │  DocumentRepository      persistence boundary
 *                 └───────┬──────────┘
 *                         │
 *                 ┌──────▼──────┐
 *                 │   Supabase   │   one implementation; never the canonical model
 *                 └─────────────┘
 * ```
 *
 * This package owns:
 *
 * - The `DocumentRepository` interface plus two implementations: an in-memory
 *   repository for local development and tests, and a Supabase-backed one for
 *   production.
 * - `Revision`, `RevisionSummary`, and `ChangeSet` value types.
 * - Typed errors for persistence failures.
 * - The operation pipeline, change sets, and undo/redo history over the
 *   in-memory document, keeping the document and editor state separate.
 *
 * It never contains layer manipulation logic: mutations always flow through
 * `@aiphotoshop/design-engine` (`applyOperation`). It only stores serialized
 * `DesignDocument` revisions.
 */

export {
  DocumentNotFoundError,
  DocumentPersistenceError,
  DocumentDeserializationError,
  DocumentValidationError,
  RevisionConflictError,
  type DocumentStoreError,
} from "./errors";

export type { DocumentOperationOperation } from "./model";

export type { ChangeSet, Revision, RevisionSummary, ChangeSetOperation } from "./model";

export type {
  CreateDocumentInput,
  SaveDocumentInput,
  ListRevisionsResult,
  LoadRevisionResult,
} from "./model";
export type { DocumentRepository } from "./repository";
export { InMemoryDocumentRepository } from "./repository";

export {
  applyChangeSet,
  applyOperationWithRecord,
  createHistory,
  prepareChangeSet,
  previewChangeSet,
  summaryFromChangeSet,
  type AppliedOperation,
  type History,
  type HistorySnapshot,
  type PreparedChangeSet,
} from "./history";

// Supabase is one implementation of the repository boundary. The editor never
// imports these directly; the application composes the right implementation.
export { createDocumentStoreClient, type SupabaseConfig } from "./supabase";
export { createSupabaseDocumentRepository, SUPABASE_ENV } from "./supabase-repository";
