import { describe, expect, it } from "vitest";

import {
  asNodeId,
  createCanvasNode,
  createGroupNode,
  createTextNode,
  type DesignDocument,
  type DesignNode,
  type NodeId,
} from "@aiphotoshop/design-schema";

import { DEMO_DOCUMENT } from "@/components/editor/demo-document";
import { createEditorState, isNodeSelected, zoomPercent } from "@/components/editor/editor-state";
import { flattenLayerTree } from "@/components/editor/layer-tree";

const ROOT = asNodeId("root");
const GROUP = asNodeId("group");
const A = asNodeId("a");
const B = asNodeId("b");

function treeDocument(): DesignDocument {
  const nodes: Record<NodeId, DesignNode> = {
    [ROOT]: createCanvasNode({
      id: ROOT,
      name: "Canvas",
      width: 100,
      height: 200,
      children: [A, GROUP],
    }),
    [A]: createTextNode({ id: A, name: "A", parentId: ROOT, text: "a" }),
    [GROUP]: createGroupNode({ id: GROUP, name: "Group", parentId: ROOT, children: [B] }),
    [B]: createTextNode({ id: B, name: "B", parentId: GROUP, text: "b", visible: false }),
  };
  return {
    id: "doc" as DesignDocument["id"],
    version: 1,
    name: "Test",
    canvas: { width: 100, height: 200, background: "#fff" },
    rootNodeId: ROOT,
    metadata: { createdAt: "x", updatedAt: "x", source: "test" },
    nodes,
  };
}

describe("flattenLayerTree", () => {
  it("emits parents before children in sibling order with depth", () => {
    const rows = flattenLayerTree(treeDocument());
    expect(rows.map((row) => [row.name, row.depth])).toEqual([
      ["Canvas", 0],
      ["A", 1],
      ["Group", 1],
      ["B", 2],
    ]);
  });

  it("carries visibility and lock state", () => {
    const rows = flattenLayerTree(treeDocument());
    expect(rows.find((row) => row.id === B)?.visible).toBe(false);
  });

  it("flattens the demo document into the expected hierarchy", () => {
    const rows = flattenLayerTree(DEMO_DOCUMENT.document);
    expect(rows.map((row) => row.name)).toEqual([
      "Canvas",
      "Background",
      "Hero Image",
      "Headline",
      "Subtitle",
      "Rule",
    ]);
    expect(rows.every((row) => row.depth === (row.name === "Canvas" ? 0 : 1))).toBe(true);
  });
});

describe("editor state", () => {
  it("keeps selection in editor state, not in the document", () => {
    const state = createEditorState({ selectedNodeIds: [A] });
    expect(isNodeSelected(state, A)).toBe(true);
    expect(isNodeSelected(state, B)).toBe(false);
    expect(JSON.stringify(DEMO_DOCUMENT.document)).not.toContain("selectedNodeIds");
  });

  it("reports zoom as a percentage", () => {
    expect(zoomPercent(createEditorState({ viewport: { zoom: 0.5 } }))).toBe(50);
  });
});
