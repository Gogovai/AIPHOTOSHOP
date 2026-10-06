/**
 * Persistence model types.
 *
 * These are the only types that cross the repository boundary. The database
 * stores a serialized `DesignDocument` plus these metadata fields — never a
 * second, competing layer model.
 *
 * ## ChangeSet vs RevisionSummary
 *
 * - `ChangeSet` is an **executable** set of complete operations. It contains
 *   everything needed to reconstruct and apply `DocumentOperation`s through the
 *   design engine. ChangeSets are the unit of undo and the boundary future AI
 *   milestones use to emit changes.
 * - `RevisionSummary` is **lightweight metadata** describing a persisted
 *   revision: its source, operation count, an optional list of operation names,
 *   and an optional human description. It is suitable for listing and audit,
 *   but it is NOT executable by itself.
 */

import type { DesignDocument, DesignNode, DocumentMetadata, NodeId } from "@aiphotoshop/design-schema";

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

/**
 * A change-set operation: a complete, executable description of a single change.
 *
 * Every field needed to construct the corresponding `DocumentOperation` is
 * present — there are no placeholder values, no `as never` casts, and no
 * partially-specified operations. This is the type stored in a `ChangeSet` and
 * converted to a `DocumentOperation` before application.
 *
 * `addNode` carries the full node because the engine requires the complete node
 * payload (type, geometry, text, src, etc.) to add it. Other operations carry
 * the arguments their engine functions require.
 */
export type ChangeSetOperation =
  | {
      readonly operation: "addNode";
      readonly node: DesignNode;
      readonly index?: number;
    }
  | { readonly operation: "removeNode"; readonly nodeId: NodeId }
  | { readonly operation: "renameNode"; readonly nodeId: NodeId; readonly name: string }
  | {
      readonly operation: "reparentNode";
      readonly nodeId: NodeId;
      readonly parentId: NodeId;
      readonly index?: number;
    }
  | { readonly operation: "reorderNode"; readonly nodeId: NodeId; readonly index: number }
  | {
      readonly operation: "groupNodes";
      readonly nodeIds: readonly NodeId[];
      readonly groupId?: NodeId;
      readonly name?: string;
    }
  | { readonly operation: "ungroupNode"; readonly nodeId: NodeId }
  | { readonly operation: "setVisibility"; readonly nodeId: NodeId; readonly visible: boolean }
  | { readonly operation: "setLocked"; readonly nodeId: NodeId; readonly locked: boolean };

/** Source of a change set: human edit, AI proposal, or a restoration. */
export type ChangeSetSource = "user" | "system" | "restore";

/** Summary attached to a revision for future audit. Lightweight — not executable. */
export interface RevisionSummary {
  readonly source: ChangeSetSource;
  readonly operationCount: number;
  /** Operation names only, for listing/audit. Not the full operation payloads. */
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

/**
 * A change set: one or many complete operations, with origin and description.
 *
 * A ChangeSet is executable: every operation carries the full payload needed to
 * construct the corresponding `DocumentOperation`. This is the boundary future
 * AI milestones use to emit changes without touching React state, DB rows, or
 * document JSON directly.
 */
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
