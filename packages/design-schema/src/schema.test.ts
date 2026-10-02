import { describe, expect, it } from "vitest";

import {
  asDocumentId,
  asNodeId,
  createCanvasNode,
  createDocument,
  createGroupNode,
  createImageNode,
  createNodeId,
  createShapeNode,
  createSvgNode,
  createTextNode,
  deserializeDocument,
  DocumentParseError,
  isContainerNode,
  isLeafNode,
  nodeChildren,
  parseDocument,
  serializeDocument,
  validateDocument,
  type DesignDocument,
  type DesignNode,
  type NodeId,
} from "./index";

const CANVAS = { width: 1080, height: 1350, background: "#ffffff" } as const;
const METADATA = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  source: "test",
} as const;

function rootId(): NodeId {
  return asNodeId("root");
}

function buildDocument(): DesignDocument {
  const root = rootId();
  const hero = asNodeId("hero");
  const headline = asNodeId("headline");
  const group = asNodeId("group");
  const rule = asNodeId("rule");

  const nodes: Record<NodeId, DesignNode> = {
    [root]: createCanvasNode({
      id: root,
      name: "Canvas",
      ...CANVAS,
      children: [hero, group, rule],
    }),
    [hero]: createImageNode({ id: hero, name: "Hero", parentId: root, src: "hero.png" }),
    [headline]: createTextNode({
      id: headline,
      name: "Headline",
      parentId: group,
      text: "Hello",
      visible: false,
    }),
    [group]: createGroupNode({ id: group, name: "Group", parentId: root, children: [headline] }),
    [rule]: createShapeNode({
      id: rule,
      name: "Rule",
      parentId: root,
      locked: true,
      shape: "line",
    }),
  };

  return {
    id: asDocumentId("doc-1"),
    version: 1,
    name: "Test Document",
    canvas: { ...CANVAS },
    rootNodeId: root,
    metadata: { ...METADATA },
    nodes,
  };
}

function expectValid(doc: DesignDocument): void {
  const result = validateDocument(doc);
  expect(result.errors).toEqual([]);
  expect(result.valid).toBe(true);
}

describe("createDocument", () => {
  it("creates a valid document with a single canvas root", () => {
    const doc = createDocument({ id: "doc-1", rootNodeId: rootId(), metadata: METADATA });

    expectValid(doc);
    expect(doc.id).toBe("doc-1");
    expect(doc.name).toBe("Untitled Design");
    expect(doc.version).toBe(1);
    expect(Object.keys(doc.nodes)).toEqual([rootId()]);
    expect(doc.canvas).toEqual({ width: 1080, height: 1350, background: "#ffffff" });

    const root = doc.nodes[doc.rootNodeId];
    expect(root?.type).toBe("canvas");
    expect(root?.parentId).toBeNull();
  });

  it("accepts an explicit size and name without hard-coding one artboard", () => {
    const doc = createDocument({
      id: "doc-2",
      rootNodeId: rootId(),
      name: "A4 Flyer",
      width: 2480,
      height: 3508,
      metadata: METADATA,
    });

    expectValid(doc);
    expect(doc.name).toBe("A4 Flyer");
    expect(doc.canvas.width).toBe(2480);
    expect(doc.canvas.height).toBe(3508);
  });
});

describe("createNodeId", () => {
  it("returns unique, opaque identifiers that do not encode content", () => {
    const ids = new Set<string>();
    for (let index = 0; index < 200; index += 1) {
      ids.add(createNodeId());
    }
    expect(ids.size).toBe(200);
    for (const id of ids) {
      expect(id).not.toMatch(/layer-\d+/);
      expect(id.startsWith("node_")).toBe(true);
    }
  });
});

describe("node model", () => {
  it("builds each node type with its own properties", () => {
    expect(createImageNode({ id: asNodeId("i"), name: "I", src: "a.png" }).type).toBe("image");
    expect(createTextNode({ id: asNodeId("t"), name: "T", text: "hi" }).type).toBe("text");
    expect(createShapeNode({ id: asNodeId("s"), name: "S" }).type).toBe("shape");
    expect(createSvgNode({ id: asNodeId("v"), name: "V", markup: "<svg/>" }).type).toBe("svg");

    expect(isContainerNode(createCanvasNode({ id: asNodeId("c"), name: "C", ...CANVAS }))).toBe(
      true,
    );
    expect(isContainerNode(createGroupNode({ id: asNodeId("g"), name: "G" }))).toBe(true);
    expect(isLeafNode(createTextNode({ id: asNodeId("t"), name: "T", text: "hi" }))).toBe(true);
  });

  it("reports children only for containers", () => {
    const group = createGroupNode({
      id: asNodeId("g"),
      name: "G",
      children: [asNodeId("a")],
    });
    expect(nodeChildren(group)).toEqual([asNodeId("a")]);
    expect(nodeChildren(createTextNode({ id: asNodeId("t"), name: "T", text: "hi" }))).toEqual([]);
  });
});

describe("validateDocument", () => {
  it("accepts a well-formed tree", () => {
    expectValid(buildDocument());
  });

  it("reports a missing parent", () => {
    const doc = buildDocument();
    const hero = doc.nodes[asNodeId("hero")];
    const broken: DesignDocument = {
      ...doc,
      nodes: {
        ...doc.nodes,
        [asNodeId("hero")]: { ...hero!, parentId: asNodeId("ghost") },
      },
    };

    const result = validateDocument(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toContain('references missing parent "ghost"');
  });

  it("reports a missing child reference", () => {
    const doc = buildDocument();
    const root = doc.nodes[doc.rootNodeId];
    if (root === undefined || !isContainerNode(root)) {
      throw new Error("expected a container root");
    }
    const broken: DesignDocument = {
      ...doc,
      nodes: {
        ...doc.nodes,
        [doc.rootNodeId]: { ...root, children: [...root.children, asNodeId("ghost")] },
      },
    };

    const result = validateDocument(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toContain('references missing child "ghost"');
  });

  it("reports parent/child disagreement", () => {
    const doc = buildDocument();
    const root = doc.nodes[doc.rootNodeId];
    if (root === undefined || !isContainerNode(root)) {
      throw new Error("expected a container root");
    }
    const broken: DesignDocument = {
      ...doc,
      nodes: {
        ...doc.nodes,
        [doc.rootNodeId]: {
          ...root,
          children: root.children.filter((id) => id !== asNodeId("hero")),
        },
      },
    };

    const result = validateDocument(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toContain("but is not listed in its children");
  });

  it("reports an orphaned node that is unreachable from the root", () => {
    const doc = buildDocument();
    const orphan = createTextNode({
      id: asNodeId("orphan"),
      name: "Orphan",
      parentId: doc.rootNodeId,
      text: "x",
    });
    const broken: DesignDocument = { ...doc, nodes: { ...doc.nodes, [orphan.id]: orphan } };

    const result = validateDocument(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toContain("orphaned");
  });

  it("reports a cycle", () => {
    const root = rootId();
    const a = asNodeId("a");
    const b = asNodeId("b");
    const nodes: Record<NodeId, DesignNode> = {
      [root]: createCanvasNode({ id: root, name: "Canvas", ...CANVAS, children: [a] }),
      [a]: createGroupNode({ id: a, name: "A", parentId: root, children: [b] }),
      [b]: createGroupNode({ id: b, name: "B", parentId: a, children: [a] }),
    };
    const broken: DesignDocument = {
      id: asDocumentId("doc-cycle"),
      version: 1,
      name: "Cycle",
      canvas: { ...CANVAS },
      rootNodeId: root,
      metadata: { ...METADATA },
      nodes,
    };

    const result = validateDocument(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toContain("cycle");
  });

  it("reports a non-root node with no parent", () => {
    const doc = buildDocument();
    const hero = doc.nodes[asNodeId("hero")]!;
    const broken: DesignDocument = {
      ...doc,
      nodes: { ...doc.nodes, [hero.id]: { ...hero, parentId: null } },
    };

    const result = validateDocument(broken);
    expect(result.errors.join("\n")).toContain("not the root but has no parent");
  });

  it("reports an empty name", () => {
    const doc = buildDocument();
    const hero = doc.nodes[asNodeId("hero")]!;
    const broken: DesignDocument = {
      ...doc,
      nodes: { ...doc.nodes, [hero.id]: { ...hero, name: "   " } },
    };

    const result = validateDocument(broken);
    expect(result.errors.join("\n")).toContain("empty name");
  });
});

describe("serialization", () => {
  it("round-trips a document with identical ids and structure", () => {
    const doc = buildDocument();
    const restored = deserializeDocument(serializeDocument(doc));

    expect(restored).toEqual(doc);
    expect(restored.id).toBe(doc.id);
    expect(Object.keys(restored.nodes).sort()).toEqual(Object.keys(doc.nodes).sort());
    for (const id of Object.keys(doc.nodes) as NodeId[]) {
      expect(restored.nodes[id]?.id).toBe(id);
    }
    expectValid(restored);
  });

  it("rejects malformed JSON", () => {
    expect(() => deserializeDocument("{not json")).toThrow(DocumentParseError);
  });

  it("rejects an unknown node type", () => {
    const doc = buildDocument();
    const raw = JSON.parse(serializeDocument(doc)) as { nodes: Record<string, { type: string }> };
    raw.nodes["hero"]!.type = "portal";

    expect(() => parseDocument(raw)).toThrow(/unknown node type/);
  });

  it("rejects a non-string child reference", () => {
    const doc = buildDocument();
    const raw = JSON.parse(serializeDocument(doc)) as unknown as {
      nodes: Record<string, { children: unknown[] }>;
    };
    raw.nodes["root"]!.children = [42];

    expect(() => parseDocument(raw)).toThrow(/children\[0\] is not a string/);
  });
});
