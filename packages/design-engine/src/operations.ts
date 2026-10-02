/**
 * Deterministic operations over a design document.
 *
 * Every operation is a pure function: it validates its inputs, then returns a
 * new document. The input document is never mutated, so any value can be
 * discarded safely and no operation can corrupt shared state.
 *
 * These functions are the trusted boundary for structural change. The editor
 * and (future) AI systems both express edits as operations here rather than
 * touching node maps directly.
 */

import {
  createGroupNode,
  isContainerNode,
  type ContainerNode,
  type DesignDocument,
  type DesignNode,
  type NodeId,
} from "@aiphotoshop/design-schema";

import { DesignEngineError } from "./errors";

/** Options for {@link addNode}. */
export interface AddNodeOptions {
  /** Insertion position among the parent's children. Defaults to the end. */
  readonly index?: number;
}

/** Options for {@link reparentNode}. */
export interface ReparentNodeOptions {
  /** Position among the destination parent's children. Defaults to the end. */
  readonly index?: number;
}

/** Options for {@link groupNodes}. */
export interface GroupNodesOptions {
  /** Explicit id for the new group. Omit to generate one. */
  readonly id?: NodeId;
  readonly name?: string;
}

/**
 * Adds a single node to an existing container.
 *
 * The node must declare a non-null `parentId` that refers to a container.
 * Container nodes are added empty — grouping existing nodes goes through
 * {@link groupNodes} so sibling order stays explicit.
 */
export function addNode(
  doc: DesignDocument,
  node: DesignNode,
  options: AddNodeOptions = {},
): DesignDocument {
  if (node.type === "canvas") {
    throw new DesignEngineError(
      "INVALID_NODE",
      `Cannot add canvas node "${node.id}": a document has exactly one canvas, its root.`,
      node.id,
    );
  }
  if (doc.nodes[node.id] !== undefined) {
    throw new DesignEngineError(
      "NODE_ALREADY_EXISTS",
      `Node "${node.id}" already exists.`,
      node.id,
    );
  }
  assertNodeName(node.name, node.id);
  if (isContainerNode(node) && node.children.length > 0) {
    throw new DesignEngineError(
      "INVALID_NODE",
      `Container node "${node.id}" must be added empty; add children individually.`,
      node.id,
    );
  }
  if (node.parentId === null) {
    throw new DesignEngineError(
      "INVALID_PARENT",
      `Cannot add node "${node.id}" without a parent.`,
      node.id,
    );
  }

  const parent = requireContainer(doc, node.parentId, "add");
  const index = options.index ?? parent.children.length;
  assertIndexInRange(index, parent.children.length, `addNode into "${parent.id}"`);

  const children = [...parent.children];
  children.splice(index, 0, node.id);

  return withUpdates(doc, [node, { ...parent, children }]);
}

/**
 * Removes a node and its entire subtree.
 *
 * The root cannot be removed. Deleting a container removes every descendant,
 * so no orphaned node can ever survive the operation.
 */
export function removeNode(doc: DesignDocument, nodeId: NodeId): DesignDocument {
  const node = requireNode(doc, nodeId);
  if (nodeId === doc.rootNodeId) {
    throw new DesignEngineError("ROOT_PROTECTED", "The document root cannot be removed.", nodeId);
  }
  if (node.parentId === null) {
    throw new DesignEngineError(
      "INVALID_PARENT",
      `Node "${nodeId}" is not the root but has no parent.`,
      nodeId,
    );
  }

  const parent = requireContainer(doc, node.parentId, "remove");
  const subtree = collectSubtree(doc, nodeId);
  const children = parent.children.filter((childId) => childId !== nodeId);

  return withUpdates(doc, [{ ...parent, children }], subtree);
}

/**
 * Renames a node. Ids and hierarchy are untouched — the name is display
 * metadata only. Empty or whitespace-only names are rejected.
 */
export function renameNode(doc: DesignDocument, nodeId: NodeId, name: string): DesignDocument {
  const node = requireNode(doc, nodeId);
  assertNodeName(name, nodeId);
  return withUpdates(doc, [{ ...node, name }]);
}

/**
 * Moves a node under a different container.
 *
 * Rejects missing parents, self-parenting, moving a node into its own
 * descendant, non-container parents, and moving the root. The node keeps its id.
 */
export function reparentNode(
  doc: DesignDocument,
  nodeId: NodeId,
  newParentId: NodeId,
  options: ReparentNodeOptions = {},
): DesignDocument {
  const node = requireNode(doc, nodeId);
  if (nodeId === doc.rootNodeId) {
    throw new DesignEngineError(
      "ROOT_PROTECTED",
      "The document root cannot be reparented.",
      nodeId,
    );
  }
  if (nodeId === newParentId) {
    throw new DesignEngineError("INVALID_MOVE", `Node "${nodeId}" cannot parent itself.`, nodeId);
  }
  if (node.parentId === null) {
    throw new DesignEngineError(
      "INVALID_PARENT",
      `Node "${nodeId}" is not the root but has no parent.`,
      nodeId,
    );
  }
  const currentParent = requireContainer(doc, node.parentId, "reparent");
  const nextParent = requireContainer(doc, newParentId, "reparent");
  if (isDescendantOf(doc, nodeId, newParentId)) {
    throw new DesignEngineError(
      "INVALID_MOVE",
      `Cannot move node "${nodeId}" into its own descendant "${newParentId}".`,
      nodeId,
    );
  }

  // Index is measured against the destination list once this node is removed.
  const destination = nextParent.children.filter((childId) => childId !== nodeId);
  const index = options.index ?? destination.length;
  assertIndexInRange(index, destination.length, `reparentNode into "${nextParent.id}"`);

  const nextSiblings = [...destination];
  nextSiblings.splice(index, 0, nodeId);

  const nextNode: DesignNode = { ...node, parentId: newParentId };

  if (currentParent.id === nextParent.id) {
    return withUpdates(doc, [nextNode, { ...currentParent, children: nextSiblings }]);
  }

  const previousChildren = currentParent.children.filter((childId) => childId !== nodeId);
  return withUpdates(doc, [
    nextNode,
    { ...currentParent, children: previousChildren },
    { ...nextParent, children: nextSiblings },
  ]);
}

/**
 * Reorders a node among its current siblings.
 *
 * `index` is the final sibling position. Ids never change, and sibling order —
 * never an array index — is the identity of a position.
 */
export function reorderNode(doc: DesignDocument, nodeId: NodeId, index: number): DesignDocument {
  const node = requireNode(doc, nodeId);
  if (node.parentId === null) {
    throw new DesignEngineError(
      "ROOT_PROTECTED",
      `Node "${nodeId}" has no siblings to reorder among.`,
      nodeId,
    );
  }
  const parent = requireContainer(doc, node.parentId, "reorder");
  const from = parent.children.indexOf(nodeId);
  if (from === -1) {
    throw new DesignEngineError(
      "INVALID_PARENT",
      `Node "${nodeId}" is not listed among the children of "${parent.id}".`,
      nodeId,
    );
  }
  assertIndexInRange(index, parent.children.length - 1, `reorderNode within "${parent.id}"`);

  const children = [...parent.children];
  children.splice(from, 1);
  children.splice(index, 0, nodeId);

  return withUpdates(doc, [{ ...parent, children }]);
}

/**
 * Wraps a set of siblings in a new group.
 *
 * Only the group receives a new id; every selected node keeps its identity and
 * its relative order. The group replaces the first selected sibling's position.
 */
export function groupNodes(
  doc: DesignDocument,
  nodeIds: readonly NodeId[],
  options: GroupNodesOptions = {},
): DesignDocument {
  if (nodeIds.length === 0) {
    throw new DesignEngineError("INVALID_SELECTION", "groupNodes requires at least one node.");
  }
  if (new Set(nodeIds).size !== nodeIds.length) {
    throw new DesignEngineError("INVALID_SELECTION", "groupNodes received duplicate node ids.");
  }
  if (nodeIds.includes(doc.rootNodeId)) {
    throw new DesignEngineError(
      "INVALID_SELECTION",
      "The document root cannot be grouped.",
      doc.rootNodeId,
    );
  }

  const selected = nodeIds.map((id) => requireNode(doc, id));
  const first = selected[0];
  if (first === undefined) {
    throw new DesignEngineError("INVALID_SELECTION", "groupNodes received no nodes.");
  }
  const parentId = first.parentId;
  if (parentId === null) {
    throw new DesignEngineError(
      "INVALID_SELECTION",
      `Node "${first.id}" has no parent and cannot be grouped.`,
      first.id,
    );
  }
  for (const node of selected) {
    if (node.parentId !== parentId) {
      throw new DesignEngineError(
        "INVALID_SELECTION",
        `Nodes "${first.id}" and "${node.id}" do not share a parent.`,
        node.id,
      );
    }
  }

  const parent = requireContainer(doc, parentId, "group");
  const selectedSet = new Set<NodeId>(nodeIds);
  const ordered = parent.children.filter((childId) => selectedSet.has(childId));
  const firstIndex = parent.children.findIndex((childId) => selectedSet.has(childId));

  const groupId = options.id;
  if (groupId !== undefined && doc.nodes[groupId] !== undefined) {
    throw new DesignEngineError(
      "NODE_ALREADY_EXISTS",
      `Node "${groupId}" already exists.`,
      groupId,
    );
  }

  const group = createGroupNode({
    id: groupId,
    name: options.name ?? "Group",
    parentId,
    children: ordered,
  });

  const remaining = parent.children.filter((childId) => !selectedSet.has(childId));
  remaining.splice(firstIndex, 0, group.id);

  const updates: DesignNode[] = [
    { ...parent, children: remaining },
    group,
    ...selected.map((node): DesignNode => ({ ...node, parentId: group.id })),
  ];

  return withUpdates(doc, updates);
}

/**
 * Removes a group, lifting its children into the group's parent.
 *
 * Children keep their ids and relative order and take the group's former
 * position among its siblings. Only the group id disappears.
 */
export function ungroupNode(doc: DesignDocument, groupId: NodeId): DesignDocument {
  const group = requireNode(doc, groupId);
  if (group.type !== "group") {
    throw new DesignEngineError(
      "INVALID_NODE",
      `Node "${groupId}" is a "${group.type}" node, not a group.`,
      groupId,
    );
  }
  if (group.parentId === null) {
    throw new DesignEngineError(
      "INVALID_PARENT",
      `Group "${groupId}" has no parent and cannot be ungrouped.`,
      groupId,
    );
  }
  const parent = requireContainer(doc, group.parentId, "ungroup");
  const index = parent.children.indexOf(groupId);
  if (index === -1) {
    throw new DesignEngineError(
      "INVALID_PARENT",
      `Group "${groupId}" is not listed among the children of "${parent.id}".`,
      groupId,
    );
  }

  const children = [
    ...parent.children.slice(0, index),
    ...group.children,
    ...parent.children.slice(index + 1),
  ];

  const updates: DesignNode[] = [
    { ...parent, children },
    ...group.children.map((childId): DesignNode => {
      const child = requireNode(doc, childId);
      return { ...child, parentId: parent.id };
    }),
  ];

  return withUpdates(doc, updates, [groupId]);
}

/** Sets a node's visibility. This is document state, not editor state. */
export function setVisibility(
  doc: DesignDocument,
  nodeId: NodeId,
  visible: boolean,
): DesignDocument {
  const node = requireNode(doc, nodeId);
  return withUpdates(doc, [{ ...node, visible }]);
}

/** Sets a node's locked flag. This is document state, not editor state. */
export function setLocked(doc: DesignDocument, nodeId: NodeId, locked: boolean): DesignDocument {
  const node = requireNode(doc, nodeId);
  return withUpdates(doc, [{ ...node, locked }]);
}

/**
 * A single, serializable structural change.
 *
 * This is the shape future AI tooling emits: typed operations that the engine
 * validates before applying. AI never mutates documents or UI state directly.
 */
export type DocumentOperation =
  | { readonly operation: "addNode"; readonly node: DesignNode; readonly index?: number }
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

/** Applies a typed {@link DocumentOperation} to a document. */
export function applyOperation(doc: DesignDocument, operation: DocumentOperation): DesignDocument {
  switch (operation.operation) {
    case "addNode":
      return addNode(doc, operation.node, { index: operation.index });
    case "removeNode":
      return removeNode(doc, operation.nodeId);
    case "renameNode":
      return renameNode(doc, operation.nodeId, operation.name);
    case "reparentNode":
      return reparentNode(doc, operation.nodeId, operation.parentId, { index: operation.index });
    case "reorderNode":
      return reorderNode(doc, operation.nodeId, operation.index);
    case "groupNodes":
      return groupNodes(doc, operation.nodeIds, { id: operation.groupId, name: operation.name });
    case "ungroupNode":
      return ungroupNode(doc, operation.nodeId);
    case "setVisibility":
      return setVisibility(doc, operation.nodeId, operation.visible);
    case "setLocked":
      return setLocked(doc, operation.nodeId, operation.locked);
  }
}

function requireNode(doc: DesignDocument, nodeId: NodeId): DesignNode {
  const node = doc.nodes[nodeId];
  if (node === undefined) {
    throw new DesignEngineError("NODE_NOT_FOUND", `Node "${nodeId}" does not exist.`, nodeId);
  }
  return node;
}

function requireContainer(doc: DesignDocument, nodeId: NodeId, context: string): ContainerNode {
  const node = requireNode(doc, nodeId);
  if (!isContainerNode(node)) {
    throw new DesignEngineError(
      "INVALID_PARENT",
      `Cannot ${context}: node "${nodeId}" is a "${node.type}" and cannot contain children.`,
      nodeId,
    );
  }
  return node;
}

function assertNodeName(name: string, nodeId: NodeId): void {
  if (name.trim().length === 0) {
    throw new DesignEngineError(
      "INVALID_NAME",
      `Node "${nodeId}" cannot have an empty name.`,
      nodeId,
    );
  }
}

function assertIndexInRange(index: number, maxInclusive: number, context: string): void {
  if (!Number.isInteger(index) || index < 0 || index > maxInclusive) {
    throw new DesignEngineError(
      "INVALID_INDEX",
      `${context}: index ${index} is outside 0..${maxInclusive}.`,
    );
  }
}

/** Returns `nodeId` and every descendant, guarding against malformed cycles. */
function collectSubtree(doc: DesignDocument, nodeId: NodeId): NodeId[] {
  const result: NodeId[] = [];
  const stack: NodeId[] = [nodeId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined || result.includes(current)) {
      continue;
    }
    result.push(current);
    const node = doc.nodes[current];
    if (node !== undefined && isContainerNode(node)) {
      stack.push(...node.children);
    }
  }
  return result;
}

/** True when `candidateId` sits anywhere below `ancestorId`. */
function isDescendantOf(doc: DesignDocument, ancestorId: NodeId, candidateId: NodeId): boolean {
  const seen = new Set<string>();
  let current = doc.nodes[candidateId];
  while (current !== undefined && current.parentId !== null) {
    if (current.parentId === ancestorId) {
      return true;
    }
    if (seen.has(current.parentId)) {
      return false;
    }
    seen.add(current.parentId);
    current = doc.nodes[current.parentId];
  }
  return false;
}

function withUpdates(
  doc: DesignDocument,
  updates: readonly DesignNode[],
  deletions: readonly NodeId[] = [],
): DesignDocument {
  const nodes: Record<NodeId, DesignNode> = { ...doc.nodes };
  for (const id of deletions) {
    delete nodes[id];
  }
  for (const node of updates) {
    nodes[node.id] = node;
  }
  return { ...doc, nodes };
}
