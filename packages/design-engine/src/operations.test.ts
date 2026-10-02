import { describe, expect, it } from "vitest";

import {
  asNodeId,
  createCanvasNode,
  createDocument,
  createGroupNode,
  createTextNode,
  deserializeDocument,
  serializeDocument,
  validateDocument,
  type DesignDocument,
  type NodeId,
} from "@aiphotoshop/design-schema";

import {
  addNode,
  applyOperation,
  DesignEngineError,
  groupNodes,
  removeNode,
  renameNode,
  reorderNode,
  reparentNode,
  setLocked,
  setVisibility,
  ungroupNode,
} from "./index";

const ROOT = asNodeId("root");
const A = asNodeId("a");
const B = asNodeId("b");
const C = asNodeId("c");
const G = asNodeId("group");
const D = asNodeId("d");
const METADATA = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  source: "test",
} as const;

/** Root canvas with children in order: A, B, C, G. */
function baseDoc(): DesignDocument {
  let doc = createDocument({ id: "doc-1", rootNodeId: ROOT, metadata: METADATA });
  doc = addNode(doc, createTextNode({ id: A, name: "A", parentId: ROOT, text: "a" }));
  doc = addNode(doc, createTextNode({ id: B, name: "B", parentId: ROOT, text: "b" }));
  doc = addNode(doc, createTextNode({ id: C, name: "C", parentId: ROOT, text: "c" }));
  doc = addNode(doc, createGroupNode({ id: G, name: "Group", parentId: ROOT }));
  return doc;
}

function childrenOf(doc: DesignDocument, id: NodeId): readonly NodeId[] {
  const node = doc.nodes[id];
  if (node === undefined || (node.type !== "canvas" && node.type !== "group")) {
    throw new Error(`node ${id} is not a container`);
  }
  return node.children;
}

function nodeIds(doc: DesignDocument): Set<string> {
  return new Set(Object.keys(doc.nodes));
}

function snapshot(doc: DesignDocument): string {
  return JSON.stringify(doc);
}

function expectValid(doc: DesignDocument): void {
  expect(validateDocument(doc)).toEqual({ valid: true, errors: [] });
}

describe("addNode", () => {
  it("appends a node to an existing container", () => {
    const doc = baseDoc();
    const next = addNode(doc, createTextNode({ id: D, name: "D", parentId: ROOT, text: "d" }));

    expect(childrenOf(next, ROOT)).toEqual([A, B, C, G, D]);
    expect(next.nodes[D]?.parentId).toBe(ROOT);
    expectValid(next);
    expect(snapshot(doc)).not.toBe(snapshot(next));
  });

  it("inserts at an explicit index", () => {
    const doc = baseDoc();
    const next = addNode(doc, createTextNode({ id: D, name: "D", parentId: ROOT, text: "d" }), {
      index: 1,
    });
    expect(childrenOf(next, ROOT)).toEqual([A, D, B, C, G]);
  });

  it("does not mutate the input document", () => {
    const doc = baseDoc();
    const before = snapshot(doc);
    addNode(doc, createTextNode({ id: D, name: "D", parentId: ROOT, text: "d" }));
    expect(snapshot(doc)).toBe(before);
  });

  it("rejects a missing parent", () => {
    const doc = baseDoc();
    expect(() =>
      addNode(doc, createTextNode({ id: D, name: "D", parentId: asNodeId("ghost"), text: "d" })),
    ).toThrow(DesignEngineError);
  });

  it("rejects a leaf parent", () => {
    const doc = baseDoc();
    expect(() =>
      addNode(doc, createTextNode({ id: D, name: "D", parentId: A, text: "d" })),
    ).toThrow(/cannot contain children/);
  });

  it("rejects a duplicate id", () => {
    const doc = baseDoc();
    expect(() =>
      addNode(doc, createTextNode({ id: A, name: "A2", parentId: ROOT, text: "x" })),
    ).toThrow(/already exists/);
  });

  it("rejects a canvas node", () => {
    const doc = baseDoc();
    const canvas = createCanvasNode({ id: D, name: "Canvas 2", width: 10, height: 10 });
    expect(() => addNode(doc, canvas)).toThrow(/exactly one canvas/);
  });

  it("rejects a non-empty container", () => {
    const doc = baseDoc();
    const group = createGroupNode({ id: D, name: "D", parentId: ROOT, children: [A] });
    expect(() => addNode(doc, group)).toThrow(/must be added empty/);
  });

  it("rejects an out-of-range index", () => {
    const doc = baseDoc();
    expect(() =>
      addNode(doc, createTextNode({ id: D, name: "D", parentId: ROOT, text: "d" }), { index: 99 }),
    ).toThrow(/outside 0\.\./);
  });
});

describe("removeNode", () => {
  it("removes a node and updates its parent", () => {
    const doc = baseDoc();
    const next = removeNode(doc, B);
    expect(childrenOf(next, ROOT)).toEqual([A, C, G]);
    expect(next.nodes[B]).toBeUndefined();
    expectValid(next);
  });

  it("removes an entire subtree", () => {
    const doc = addNode(baseDoc(), createTextNode({ id: D, name: "D", parentId: G, text: "d" }));
    const next = removeNode(doc, G);
    expect(next.nodes[G]).toBeUndefined();
    expect(next.nodes[D]).toBeUndefined();
    expect(childrenOf(next, ROOT)).toEqual([A, B, C]);
    expectValid(next);
  });

  it("refuses to remove the root", () => {
    const doc = baseDoc();
    expect(() => removeNode(doc, ROOT)).toThrow(/root cannot be removed/);
  });

  it("rejects a missing node", () => {
    expect(() => removeNode(baseDoc(), asNodeId("ghost"))).toThrow(/does not exist/);
  });
});

describe("renameNode", () => {
  it("renames without changing id or hierarchy", () => {
    const doc = baseDoc();
    const next = renameNode(doc, B, "Renamed");
    expect(next.nodes[B]?.name).toBe("Renamed");
    expect(next.nodes[B]?.id).toBe(B);
    expect(next.nodes[B]?.parentId).toBe(ROOT);
    expect(childrenOf(next, ROOT)).toEqual([A, B, C, G]);
    expectValid(next);
  });

  it("rejects an empty or whitespace-only name", () => {
    const doc = baseDoc();
    expect(() => renameNode(doc, B, "")).toThrow(DesignEngineError);
    expect(() => renameNode(doc, B, "   ")).toThrow(/empty name/);
  });

  it("leaves the input document untouched", () => {
    const doc = baseDoc();
    const before = snapshot(doc);
    renameNode(doc, B, "Renamed");
    expect(snapshot(doc)).toBe(before);
  });
});

describe("reparentNode", () => {
  it("moves a node under another container and keeps its id", () => {
    const doc = baseDoc();
    const next = reparentNode(doc, B, G);
    expect(next.nodes[B]?.parentId).toBe(G);
    expect(next.nodes[B]?.id).toBe(B);
    expect(childrenOf(next, ROOT)).toEqual([A, C, G]);
    expect(childrenOf(next, G)).toEqual([B]);
    expectValid(next);
  });

  it("honours an insertion index in the destination", () => {
    const doc = addNode(baseDoc(), createTextNode({ id: D, name: "D", parentId: G, text: "d" }));
    const next = reparentNode(doc, B, G, { index: 0 });
    expect(childrenOf(next, G)).toEqual([B, D]);
  });

  it("rejects self-parenting", () => {
    expect(() => reparentNode(baseDoc(), B, B)).toThrow(/cannot parent itself/);
  });

  it("rejects moving a node into its own descendant", () => {
    const doc = addNode(baseDoc(), createGroupNode({ id: D, name: "D", parentId: G }));
    expect(() => reparentNode(doc, G, D)).toThrow(/own descendant/);
  });

  it("rejects a non-container destination", () => {
    expect(() => reparentNode(baseDoc(), B, A)).toThrow(/cannot contain children/);
  });

  it("rejects moving the root", () => {
    expect(() => reparentNode(baseDoc(), ROOT, G)).toThrow(/root cannot be reparented/);
  });

  it("rejects a missing destination", () => {
    expect(() => reparentNode(baseDoc(), B, asNodeId("ghost"))).toThrow(/does not exist/);
  });
});

describe("reorderNode", () => {
  it("reorders among siblings without changing ids", () => {
    const doc = baseDoc();
    const before = nodeIds(doc);
    const next = reorderNode(doc, C, 0);
    expect(childrenOf(next, ROOT)).toEqual([C, A, B, G]);
    expect(nodeIds(next)).toEqual(before);
    expectValid(next);
  });

  it("moves a node to the end", () => {
    const next = reorderNode(baseDoc(), A, 3);
    expect(childrenOf(next, ROOT)).toEqual([B, C, G, A]);
  });

  it("rejects an out-of-range index", () => {
    expect(() => reorderNode(baseDoc(), A, 4)).toThrow(/outside 0\.\./);
  });

  it("rejects the root", () => {
    expect(() => reorderNode(baseDoc(), ROOT, 0)).toThrow(/no siblings/);
  });
});

describe("groupNodes", () => {
  it("wraps siblings in a new group, changing only the group's id", () => {
    const doc = baseDoc();
    const before = nodeIds(doc);
    const next = groupNodes(doc, [A, B], { id: D, name: "Pair" });

    expect(next.nodes[D]?.type).toBe("group");
    expect(childrenOf(next, D)).toEqual([A, B]);
    expect(next.nodes[A]?.parentId).toBe(D);
    expect(next.nodes[B]?.parentId).toBe(D);
    expect(childrenOf(next, ROOT)).toEqual([D, C, G]);
    expectValid(next);

    const after = nodeIds(next);
    const added = [...after].filter((id) => !before.has(id));
    expect(added).toEqual([D]);
  });

  it("orders the group children by sibling order, not selection order", () => {
    const next = groupNodes(baseDoc(), [B, A], { id: D });
    expect(childrenOf(next, D)).toEqual([A, B]);
  });

  it("rejects an empty selection", () => {
    expect(() => groupNodes(baseDoc(), [])).toThrow(/at least one/);
  });

  it("rejects duplicate ids", () => {
    expect(() => groupNodes(baseDoc(), [A, A])).toThrow(/duplicate/);
  });

  it("rejects nodes with different parents", () => {
    const doc = addNode(baseDoc(), createTextNode({ id: D, name: "D", parentId: G, text: "d" }));
    expect(() => groupNodes(doc, [A, D])).toThrow(/do not share a parent/);
  });

  it("rejects grouping the root", () => {
    expect(() => groupNodes(baseDoc(), [ROOT])).toThrow(/root cannot be grouped/);
  });
});

describe("ungroupNode", () => {
  it("lifts children to the group's parent and removes the group", () => {
    const doc = addNode(baseDoc(), createTextNode({ id: D, name: "D", parentId: G, text: "d" }));
    const next = ungroupNode(doc, G);

    expect(next.nodes[G]).toBeUndefined();
    expect(next.nodes[D]?.id).toBe(D);
    expect(next.nodes[D]?.parentId).toBe(ROOT);
    expect(childrenOf(next, ROOT)).toEqual([A, B, C, D]);
    expectValid(next);
  });

  it("rejects a non-group node", () => {
    expect(() => ungroupNode(baseDoc(), A)).toThrow(/not a group/);
  });

  it("rejects a missing node", () => {
    expect(() => ungroupNode(baseDoc(), asNodeId("ghost"))).toThrow(/does not exist/);
  });
});

describe("setVisibility and setLocked", () => {
  it("updates document state", () => {
    const doc = baseDoc();
    const next = setLocked(setVisibility(doc, B, false), B, true);
    expect(next.nodes[B]?.visible).toBe(false);
    expect(next.nodes[B]?.locked).toBe(true);
    expect(next.nodes[A]?.visible).toBe(true);
    expectValid(next);
  });

  it("survives serialization", () => {
    const next = setVisibility(baseDoc(), B, false);
    const restored = deserializeDocument(serializeDocument(next));
    expect(restored.nodes[B]?.visible).toBe(false);
  });
});

describe("id stability", () => {
  it("preserves every id across rename, reorder, reparent, group, ungroup, and round-trip", () => {
    const start = baseDoc();
    const originalIds = nodeIds(start);

    let doc = renameNode(start, A, "Renamed");
    doc = reorderNode(doc, A, 3);
    doc = reparentNode(doc, B, G);
    doc = setVisibility(doc, C, false);
    doc = setLocked(doc, C, true);

    for (const id of originalIds) {
      expect(doc.nodes[asNodeId(id)]).toBeDefined();
    }

    const restored = deserializeDocument(serializeDocument(doc));
    expect(restored).toEqual(doc);
    expect(nodeIds(restored)).toEqual(originalIds);
  });
});

describe("applyOperation", () => {
  it("dispatches typed operations to the same functions", () => {
    const doc = baseDoc();
    const renamed = applyOperation(doc, { operation: "renameNode", nodeId: B, name: "Op" });
    expect(renamed.nodes[B]?.name).toBe("Op");

    const hidden = applyOperation(renamed, {
      operation: "setVisibility",
      nodeId: B,
      visible: false,
    });
    expect(hidden.nodes[B]?.visible).toBe(false);

    const grouped = applyOperation(hidden, {
      operation: "groupNodes",
      nodeIds: [A, B],
      groupId: D,
    });
    expect(grouped.nodes[D]?.type).toBe("group");
    expectValid(grouped);
  });
});
