/**
 * Persistence model types.
 *
 * These are the only types that cross the repository boundary. The database
 * stores a serialized `DesignDocument` plus these metadata fields — never a
 * second, competing layer model.
 */

import type { DesignDocument, DocumentMetadata } from "@aiphotoshop/design-schema";

export type DocumentOperationOperation =
  | "addNode"
  | "removeNode"
  | "renameNode"
  | "reparentNode"
  | "reorderNode"
  | "groupNodes"
  | "ungroupNode"
  | "setVisibility"
  | "setLocked";

/** One operation recorded inside a stored change set. */
export interface ChangeSetOperation {
  readonly operation: DocumentOperationOperation;
  readonly nodeId: string;
}

/** Source of a change set: human edit, AI proposal, or a restoration. */
export type ChangeSetSource = "user" | "system" | "restore";

/** Summary attached to a revision for future audit and change-set reconstruction. */
export interface RevisionSummary {
  readonly source: ChangeSetSource;
  readonly operationCount: number;
  readonly operations?: readonly string[];
  readonly description?: string;
}

/** A single, immutable document revision embedded in the database. */
export interface Revision {
  readonly id: string;
  readonly projectId: string;
  readonly revisionNumber: number;
  readonly document: string;
  readonly createdAt: string;
  readonly parentRevisionId: string | null;
  readonly changeSet: ChangeSet | null;
}

/** A change set: one or many operations, with origin and description. */
export interface ChangeSet {
  readonly id: string;
  readonly source: ChangeSetSource;
  readonly operations: readonly ChangeSetOperation[];
  readonly description?: string;
}

/** Result of listing a document's revisions. */
export interface ListRevisionsResult {
  readonly revisions: readonly Revision[];
  readonly currentRevisionId: string | null;
}

/** Result of loading a single revision. */
export interface LoadRevisionResult {
  readonly revision: Revision;
  readonly document: DesignDocument;
}

/**
 * Input for {@link DocumentRepository.create}.
 *
 * The created document is validated and serialized, and the initial revision is
 * persisted atomically with the document record.
 */
export interface CreateDocumentInput {
  readonly id: string;
  readonly name: string;
  readonly metadata: DocumentMetadata;
}

/**
 * Input for {@link DocumentRepository.save}.
 *
 * `expectedCurrentRevisionId` is the revision the caller loaded against; a save
 * that does not match throws {@link RevisionConflictError}.
 */
export interface SaveDocumentInput {
  readonly document: DesignDocument;
  readonly expectedCurrentRevisionId: string | null;
  readonly summary?: RevisionSummary;
}

/** Pairs of revision id and change set id used to rebuild the active undo stack. */
export interface HistorySegment {
  readonly revisionId: string;
  readonly changeSetId: string | null;
}
