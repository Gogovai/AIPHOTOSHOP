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

import { assertValidDocument, type DesignDocument } from "@aiphotoshop/design-schema";
import type { ChangeSet, ChangeSetOperation, RevisionSummary } from "./model";

/**
 * Convert a `ChangeSetOperation` to a `DocumentOperation`.
 *
 * This is the single conversion boundary between the change-set representation
 * and the engine's operation type. Every `ChangeSetOperation` carries the full
 * payload needed to construct its corresponding `DocumentOperation`, so this
 * conversion is a straight structural mapping with no placeholder values and no
 * unsafe casts.
 *
 * Throws a clear error if conversion is not possible (should never happen when
 * `ChangeSetOperation` is constructed correctly).
 */
export function changeSetOperationToDocumentOperation(
  operation: ChangeSetOperation,
): DocumentOperation {
  switch (operation.operation) {
    case "addNode":
      return {
        operation: "addNode",
        node: operation.node,
        index: operation.index,
      };
    case "removeNode":
      return {
        operation: "removeNode",
        nodeId: operation.nodeId,
      };
    case "renameNode":
      return {
        operation: "renameNode",
        nodeId: operation.nodeId,
        name: operation.name,
      };
    case "reparentNode":
      return {
        operation: "reparentNode",
        nodeId: operation.nodeId,
        parentId: operation.parentId,
        index: operation.index,
      };
    case "reorderNode":
      return {
        operation: "reorderNode",
        nodeId: operation.nodeId,
        index: operation.index,
      };
    case "groupNodes":
      return {
        operation: "groupNodes",
        nodeIds: operation.nodeIds,
        groupId: operation.groupId,
        name: operation.name,
      };
    case "ungroupNode":
      return {
        operation: "ungroupNode",
        nodeId: operation.nodeId,
      };
    case "setVisibility":
      return {
        operation: "setVisibility",
        nodeId: operation.nodeId,
        visible: operation.visible,
      };
    case "setLocked":
      return {
        operation: "setLocked",
        nodeId: operation.nodeId,
        locked: operation.locked,
      };
    default: {
      const _exhaustive: never = operation;
      throw new Error(`Unknown ChangeSetOperation: ${_exhaustive}`);
    }
  }
}

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
 * Validates the change-set shape and converts each `ChangeSetOperation` into
 * the corresponding `DocumentOperation` via `changeSetOperationToDocumentOperation`.
 *
 * Because `ChangeSetOperation` carries the full payload for each operation, the
 * conversion is lossless: the resulting `DocumentOperation` contains exactly the
 * values stored in the change set, with no placeholders, defaults, or unsafe
 * casts.
 *
 * A future AI milestone can expand this without changing the boundary: the AI
 * produces complete `ChangeSetOperation` values, and this function converts them
 * for the engine.
 */
export function prepareChangeSet(changeSet: ChangeSet): PreparedChangeSet {
  const operations = changeSet.operations.map((recorded) =>
    changeSetOperationToDocumentOperation(recorded),
  );
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
