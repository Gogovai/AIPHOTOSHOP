/**
 * A read-only view of the document tree, shaped for the layers panel.
 *
 * This is a projection, not a second model: rows are derived from the
 * `DesignDocument` on every render and never stored. Keeping it a pure
 * function makes the panel's data source obvious and testable.
 */

import {
  isContainerNode,
  type DesignDocument,
  type NodeId,
  type NodeType,
} from "@aiphotoshop/design-schema";

/** One row in the layers panel. */
export interface LayerRow {
  readonly id: NodeId;
  readonly name: string;
  readonly type: NodeType;
  /** 0 for the canvas root, increasing with depth. */
  readonly depth: number;
  readonly visible: boolean;
  readonly locked: boolean;
}

/**
 * Depth-first flatten of the document, parents before children, preserving
 * sibling order. Malformed documents (missing nodes, cycles) are tolerated:
 * each node is emitted at most once.
 */
export function flattenLayerTree(document: DesignDocument): LayerRow[] {
  const rows: LayerRow[] = [];
  const visited = new Set<string>();

  const visit = (nodeId: NodeId, depth: number): void => {
    if (visited.has(nodeId)) {
      return;
    }
    const node = document.nodes?.[nodeId];
    if (node === undefined) {
      return;
    }
    visited.add(nodeId);
    rows.push({
      id: node.id,
      name: node.name,
      type: node.type,
      depth,
      visible: node.visible,
      locked: node.locked,
    });
    if (isContainerNode(node)) {
      for (const childId of node.children) {
        visit(childId, depth + 1);
      }
    }
  };

  visit(document.rootNodeId, 0);
  return rows;
}
