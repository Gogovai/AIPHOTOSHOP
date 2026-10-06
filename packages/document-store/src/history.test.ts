import { describe, expect, it } from "vitest";

import { addNode, DesignEngineError, type DocumentOperation } from "@aiphotoshop/design-engine";
import {
  asNodeId,
  createDocument,
  createTextNode,
  type DesignDocument,
} from "@aiphotoshop/design-schema";

import { prepareChangeSet } from "./history";
import {
  applyChangeSet,
  applyOperationWithRecord,
  createHistory,
  previewChangeSet,
  summaryFromChangeSet,
  type PreparedChangeSet,
} from "./index";

const ROOT = asNodeId("root");
const TEXT = asNodeId("text");
const METADATA = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  source: "test",
} as const;

/** A valid document with a single text node under the root. */
function baseDoc(): DesignDocument {
  const doc = createDocument({ id: "doc-1", rootNodeId: ROOT, metadata: METADATA });
  return addNode(doc, createTextNode({ id: TEXT, name: "Text", parentId: ROOT, text: "hello" }));
}

/** A prepared change set built from concrete engine operations. */
function concreteChangeSet(operations: readonly DocumentOperation[]): PreparedChangeSet {
  return {
    changeSet: {
      id: `cs-${operations.length}`,
      source: "user",
      operations: operations.map((operation) => ({
        operation: operation.operation,
        nodeId: "text",
      })),
    },
    operations,
  };
}

describe("applyOperationWithRecord", () => {
  it("returns the before and after documents without mutating the input", () => {
    const doc = baseDoc();
    const before = JSON.stringify(doc);

    const record = applyOperationWithRecord(doc, {
      operation: "setVisibility",
      nodeId: TEXT,
      visible: false,
    });

    expect(record.previousDocument.nodes[TEXT]?.visible).toBe(true);
    expect(record.nextDocument.nodes[TEXT]?.visible).toBe(false);
    expect(JSON.stringify(doc)).toBe(before);
  });

  it("propagates engine failures for illegal operations", () => {
    const doc = baseDoc();

    expect(() =>
      applyOperationWithRecord(doc, { operation: "removeNode", nodeId: asNodeId("ghost") }),
    ).toThrow(DesignEngineError);
  });
});

describe("change sets", () => {
  it("prepares, previews, applies, and summarizes a change set", () => {
    const doc = baseDoc();
    const prepared = prepareChangeSet({
      id: "cs-remove",
      source: "user",
      operations: [{ operation: "removeNode", nodeId: TEXT }],
      description: "remove text",
    });

    expect(previewChangeSet(prepared)).toHaveLength(1);

    const applied = applyChangeSet(doc, prepared);
    expect(applied.records).toHaveLength(1);
    expect(applied.document.nodes[TEXT]).toBeUndefined();

    expect(summaryFromChangeSet(prepared.changeSet, applied.records)).toEqual({
      source: "user",
      operationCount: 1,
      operations: ["removeNode"],
      description: "remove text",
    });
  });

  it("prepares an empty change set without operations", () => {
    const prepared = prepareChangeSet({ id: "cs-empty", source: "system", operations: [] });

    expect(prepared.operations).toEqual([]);
  });

  it("applies a multi-operation change set and records every operation", () => {
    const doc = baseDoc();
    const prepared = concreteChangeSet([
      { operation: "setVisibility", nodeId: TEXT, visible: false },
      { operation: "setLocked", nodeId: TEXT, locked: true },
    ]);

    const applied = applyChangeSet(doc, prepared);

    expect(applied.records).toHaveLength(2);
    expect(applied.document.nodes[TEXT]).toMatchObject({ visible: false, locked: true });
    expect(doc.nodes[TEXT]).toMatchObject({ visible: true, locked: false });
  });

  it("propagates a validation failure and leaves the document unchanged", () => {
    const doc = baseDoc();
    const prepared = prepareChangeSet({
      id: "cs-ghost",
      source: "user",
      operations: [{ operation: "removeNode", nodeId: asNodeId("ghost") }],
    });

    expect(() => applyChangeSet(doc, prepared)).toThrow(DesignEngineError);
    expect(doc.nodes[TEXT]).toBeDefined();
  });
});

describe("History", () => {
  it("requires an attached document before applying", () => {
    const history = createHistory();
    const prepared = prepareChangeSet({
      id: "cs-1",
      source: "user",
      operations: [{ operation: "removeNode", nodeId: TEXT }],
    });

    expect(() => history.apply(prepared)).toThrow(/no attached document/);
  });

  it("applies a change, then undoes and redoes it", () => {
    const history = createHistory();
    history.attach(baseDoc());

    const prepared = prepareChangeSet({
      id: "cs-remove",
      source: "user",
      operations: [{ operation: "removeNode", nodeId: TEXT }],
    });

    const after = history.apply(prepared);
    expect(after.nodes[TEXT]).toBeUndefined();
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);

    const undone = history.undo();
    expect(undone.nodes[TEXT]).toBeDefined();
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(true);

    const redone = history.redo();
    expect(redone.nodes[TEXT]).toBeUndefined();
    expect(history.snapshot()).toEqual({ canUndo: true, canRedo: false, length: 1 });
  });

  it("discards the redo branch when a new change is applied after undo", () => {
    const history = createHistory();
    history.attach(baseDoc());

    const remove = prepareChangeSet({
      id: "cs-remove",
      source: "user",
      operations: [{ operation: "removeNode", nodeId: TEXT }],
    });
    const lock = prepareChangeSet({
      id: "cs-lock",
      source: "user",
      operations: [{ operation: "setLocked", nodeId: TEXT }],
    });

    history.apply(remove);
    history.undo();
    history.apply(lock);

    expect(history.canRedo).toBe(false);
    expect(history.currentDocument?.nodes[TEXT]?.locked).toBe(false);
    expect(history.snapshot().length).toBe(1);
  });

  it("supports the full A → B → C undo/redo sequence", () => {
    const history = createHistory();
    history.attach(baseDoc()); // A

    history.apply(
      concreteChangeSet([{ operation: "setVisibility", nodeId: TEXT, visible: false }]),
    ); // B
    history.apply(concreteChangeSet([{ operation: "setLocked", nodeId: TEXT, locked: true }])); // C
    expect(history.currentDocument?.nodes[TEXT]).toMatchObject({ visible: false, locked: true });

    const b = history.undo();
    expect(b.nodes[TEXT]).toMatchObject({ visible: false, locked: false });
    const a = history.undo();
    expect(a.nodes[TEXT]).toMatchObject({ visible: true, locked: false });
    expect(history.canUndo).toBe(false);

    const bAgain = history.redo();
    expect(bAgain.nodes[TEXT]).toMatchObject({ visible: false, locked: false });
    const cAgain = history.redo();
    expect(cAgain.nodes[TEXT]).toMatchObject({ visible: false, locked: true });
    expect(history.canRedo).toBe(false);
  });

  it("throws on undo and redo when the stacks are empty", () => {
    const history = createHistory();
    history.attach(baseDoc());

    expect(() => history.undo()).toThrow(/Nothing to undo/);
    expect(() => history.redo()).toThrow(/Nothing to redo/);
  });
});
