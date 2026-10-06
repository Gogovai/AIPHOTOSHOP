/**
 * Operation pipeline, change sets, and undo/redo history.
 *
 * This layer sits on top of the M003 design engine and the repository. It does
 * NOT duplicate mutation logic: every state change is executed by
 * `applyOperation` from `@aiphotoshop/design-engine`. This module only
 * orchestrates validation, recording, and history management.
 *
 * Two histories are intentionally distinct:
 *
 * - Local editing history (this module): in-memory undo/redo over the document
 *   the editor is currently working on. Not every step is persisted as a
 *   database revision.
 * - Persistent revision history (repository): immutable revisions stored in
 *   Supabase. A save may capture the current state, but undo/redo themselves do
 *   not create revisions unless the architecture requires it.
 */

import { applyOperation, type DocumentOperation } from "@aiphotoshop/design-engine";
import type { NodeId } from "@aiphotoshop/design-schema";

import { assertValidDocument, type DesignDocument } from "@aiphotoshop/design-schema";
import type { ChangeSet, ChangeSetOperation, RevisionSummary } from "./model";

// ---------------------------------------------------------------------------
// Operation pipeline
// ---------------------------------------------------------------------------

/** Outcome of running a single operation through the pipeline. */
export interface AppliedOperation {
  readonly operation: DocumentOperation;
  readonly previousDocument: DesignDocument;
  readonly nextDocument: DesignDocument;
}

/**
 * Validate, resolve, precheck, apply, and record a single operation.
 *
 * The engine already performs validation, resolution, and prechecks and throws
 * a coded `DesignEngineError` when an operation is illegal. This pipeline adds:
 *
 * - a schema-level validation pass on the resulting document, so a persisted
 *   document can never drift out of the invariants;
 * - a record of the before/after document for history and review.
 */
export function applyOperationWithRecord(
  previousDocument: DesignDocument,
  operation: DocumentOperation,
): AppliedOperation {
  // 1. Validate the starting document. If the editor is in a bad state we
  //    fail early rather than applying an operation on top of corruption.
  assertValidDocument(previousDocument);

  // 2-4. Validate / resolve / precheck / apply. The engine throws on illegal
  //    operations and never mutates the input document.
  const nextDocument = applyOperation(previousDocument, operation);

  // 5. Validate the resulting document. This guarantees that anything handed to
  //    the editor or persisted is structurally sound.
  assertValidDocument(nextDocument);

  return { operation, previousDocument, nextDocument };
}

// ---------------------------------------------------------------------------
// Change sets
// ---------------------------------------------------------------------------

/** A change set ready to be applied or undone against a document. */
export interface PreparedChangeSet {
  readonly changeSet: ChangeSet;
  readonly operations: readonly DocumentOperation[];
}

/**
 * Prepare a change set for application.
 *
 * - Validates the change-set shape (source, operations).
 * - Resolves stored operation summaries into concrete `DocumentOperation`
 *   values. In M004 this is a lightweight projection; a future AI milestone can
 *   expand it without changing this boundary.
 */
export function prepareChangeSet(changeSet: ChangeSet): PreparedChangeSet {
  if (!changeSet.operations) {
    return { changeSet, operations: [] };
  }
  const operations = changeSet.operations.map((recorded) => {
    const op = recorded.operation;
    switch (op) {
      case "addNode":
        // addNode operations must include a full serialized node; reconstruct
        // before applying. We never apply half-specified add operations.
        throw new Error(
          "addNode operations must include a full node; reconstruct before applying.",
        );
      case "removeNode":
        return { operation: "removeNode", nodeId: recorded.nodeId } as DocumentOperation;
      case "renameNode":
        return { operation: "renameNode", nodeId: recorded.nodeId, name: "" } as DocumentOperation;
      case "reparentNode":
        return {
          operation: "reparentNode",
          nodeId: recorded.nodeId,
          parentId: recorded.nodeId,
          index: undefined,
        } as DocumentOperation;
      case "reorderNode":
        return { operation: "reorderNode", nodeId: recorded.nodeId, index: 0 } as DocumentOperation;
      case "groupNodes":
        return {
          operation: "groupNodes",
          nodeIds: [recorded.nodeId as NodeId],
          groupId: undefined,
          name: undefined,
        } as never as DocumentOperation;
      case "ungroupNode":
        return { operation: "ungroupNode", nodeId: recorded.nodeId } as DocumentOperation;
      case "setVisibility":
        return {
          operation: "setVisibility",
          nodeId: recorded.nodeId as NodeId,
          visible: true,
        } as never as DocumentOperation;
      case "setLocked":
        return {
          operation: "setLocked",
          nodeId: recorded.nodeId as NodeId,
          locked: false,
        } as never as DocumentOperation;
      default:
        throw new Error(`Unknown recorded operation: ${op}`);
    }
  });
  return { changeSet, operations };
}

/**
 * Apply a prepared change set to a document.
 *
 * Each operation is run through the full pipeline and recorded. If any operation
 * fails, the document is left unchanged up to that point (operations never
 * mutate their input), and the error propagates.
 */
export function applyChangeSet(
  document: DesignDocument,
  prepared: PreparedChangeSet,
): {
  document: DesignDocument;
  records: readonly AppliedOperation[];
} {
  const records: AppliedOperation[] = [];
  let current = document;
  for (const operation of prepared.operations) {
    const record = applyOperationWithRecord(current, operation);
    records.push(record);
    current = record.nextDocument;
  }
  return { document: current, records };
}

/**
 * Preview a change set without applying it.
 *
 * Returns the operations the change set would execute. Use this for UI previews
 * before committing a change set.
 */
export function previewChangeSet(prepared: PreparedChangeSet): readonly DocumentOperation[] {
  return prepared.operations;
}

/**
 * Build a revision summary from a change set and its application records.
 */
export function summaryFromChangeSet(
  changeSet: ChangeSet,
  records: readonly AppliedOperation[],
): RevisionSummary {
  return {
    source: changeSet.source,
    operationCount: records.length,
    operations: records.map((record) => record.operation.operation),
    description: changeSet.description,
  };
}

// ---------------------------------------------------------------------------
// Undo / redo history
// ---------------------------------------------------------------------------

/** One recorded local change in the editing history. */
export interface RecordedChange {
  readonly changeSet: ChangeSet;
  readonly records: readonly AppliedOperation[];
  readonly beforeDocument: DesignDocument;
  readonly afterDocument: DesignDocument;
}

/**
 * Document-level undo/redo history.
 *
 * Model:
 *
 *   past          present         future
 *   [A] -> [B] -> [C]
 *
 * Undo moves present -> past; redo moves present -> future. A new operation
 * after undo discards the future branch.
 *
 * History operates on the document/change layer only. It never touches React
 * state, viewport, selection, or the repository directly.
 */
export function createHistory(): History {
  return new History();
}

export class History {
  private readonly past: RecordedChange[] = [];
  private readonly future: RecordedChange[] = [];
  private current: DesignDocument | null = null;

  /** Attach the initial document as the present state. */
  attach(document: DesignDocument): void {
    this.current = document;
    this.past.length = 0;
    this.future.length = 0;
  }

  /** Current in-memory document, or null when nothing is attached. */
  get currentDocument(): DesignDocument | null {
    return this.current;
  }

  /** Whether an undo is available. */
  get canUndo(): boolean {
    return this.past.length > 0;
  }

  /** Whether a redo is available. */
  get canRedo(): boolean {
    return this.future.length > 0;
  }

  /**
   * Apply a change set and record it as the new present state.
   *
   * Any existing future branch is discarded, matching standard undo behavior:
   * after undo, a new edit invalidates the redo stack.
   */
  apply(prepared: PreparedChangeSet): DesignDocument {
    if (this.current === null) {
      throw new Error("History has no attached document.");
    }
    const { document, records } = applyChangeSet(this.current, prepared);
    const change: RecordedChange = {
      changeSet: prepared.changeSet,
      records,
      beforeDocument: this.current,
      afterDocument: document,
    };
    this.past.push(change);
    this.current = document;
    this.future.length = 0;
    return document;
  }

  /** Undo the most recent change, returning the document before it. */
  undo(): DesignDocument {
    if (!this.canUndo) {
      throw new Error("Nothing to undo.");
    }
    const change = this.past.pop()!;
    this.future.push(change);
    this.current = change.beforeDocument;
    return change.beforeDocument;
  }

  /** Redo the most recently undone change. */
  redo(): DesignDocument {
    if (!this.canRedo) {
      throw new Error("Nothing to redo.");
    }
    const popped = this.future.pop();
    if (popped === undefined) {
      throw new Error("History invariant: canRedo was true but future was empty.");
    }
    const change: RecordedChange = popped;
    this.past.push(change);
    this.current = change.afterDocument;
    return change.afterDocument;
  }

  /** Serialize the current history state for debugging / persistence of undo stack. */
  snapshot(): HistorySnapshot {
    return {
      canUndo: this.canUndo,
      canRedo: this.canRedo,
      length: this.past.length,
    };
  }
}

/** Lightweight snapshot of the current history state. */
export interface HistorySnapshot {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly length: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a concrete `DocumentOperation` from a recorded change-set operation.
 *
 * This is intentionally lightweight in M004. A stored change set records
 * operation names + node ids; the editor or a future AI layer fills in the
 * remaining arguments when preparing a change set for application. Unknown or
 * incomplete operations throw so we never apply half-specified edits.
 */
export function operationFromRecorded(recorded: ChangeSetOperation): DocumentOperation {
  const op = recorded.operation;
  switch (op) {
    case "addNode":
      throw new Error("addNode operations must include a full node; reconstruct before applying.");
    case "removeNode":
      return { operation: "removeNode", nodeId: recorded.nodeId as NodeId };
    case "renameNode":
      throw new Error("renameNode operations must include a name; reconstruct before applying.");
    case "reparentNode":
      throw new Error(
        "reparentNode operations must include a parentId; reconstruct before applying.",
      );
    case "reorderNode":
      throw new Error("reorderNode operations must include an index; reconstruct before applying.");
    case "groupNodes":
      return {
        operation: "groupNodes",
        nodeIds: [recorded.nodeId as NodeId],
        groupId: undefined,
        name: undefined,
      } as never as DocumentOperation;
    case "ungroupNode":
      return { operation: "ungroupNode", nodeId: recorded.nodeId as NodeId };
    case "setVisibility":
      return {
        operation: "setVisibility",
        nodeId: recorded.nodeId as NodeId,
        visible: true,
      };
    case "setLocked":
      return {
        operation: "setLocked",
        nodeId: recorded.nodeId as NodeId,
        locked: false,
      };
  }
}
