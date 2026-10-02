/**
 * Structural validation for design documents.
 *
 * `validateDocument` checks every invariant the rest of the system relies on
 * (see `docs/LAYER_SYSTEM.md`). It returns diagnostics instead of throwing so
 * callers can choose how to react; `assertValidDocument` is the throwing
 * convenience used at trusted boundaries such as deserialization.
 *
 * All errors are written to be actionable: they name the offending node and
 * the ids involved.
 */

import { type DesignDocument } from "./document";
import { isContainerNode, type ContainerNode, type DesignNode } from "./nodes";

/** Outcome of validating a document. */
export interface DocumentValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/** Thrown by {@link assertValidDocument} when a document is invalid. */
export class DocumentValidationError extends Error {
  readonly errors: readonly string[];

  constructor(errors: readonly string[]) {
    super(`Invalid design document:\n- ${errors.join("\n- ")}`);
    this.name = "DocumentValidationError";
    this.errors = errors;
  }
}

/** Validates a document and reports every invariant violation it finds. */
export function validateDocument(doc: DesignDocument): DocumentValidationResult {
  const errors: string[] = [];
  const entries = Object.entries(doc.nodes) as [string, DesignNode][];
  const nodes = doc.nodes;

  validateNodeMap(entries, errors);

  const root = nodes[doc.rootNodeId];
  if (root === undefined) {
    errors.push(`Root node "${doc.rootNodeId}" is missing from the node map.`);
  } else {
    validateRoot(root, doc, errors);
  }

  const canvasNodes = entries.filter(([, node]) => node.type === "canvas");
  validateCanvasCount(canvasNodes, doc, errors);

  for (const [, node] of entries) {
    validateNodeRelationships(node, doc, errors);
  }

  const reachable = collectReachable(doc, root, errors);
  for (const [, node] of entries) {
    if (!reachable.has(node.id)) {
      errors.push(
        `Node "${node.id}" is orphaned: it cannot be reached from the root node "${doc.rootNodeId}".`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Throws {@link DocumentValidationError} when the document is invalid. */
export function assertValidDocument(doc: DesignDocument): void {
  const result = validateDocument(doc);
  if (!result.valid) {
    throw new DocumentValidationError(result.errors);
  }
}

function validateNodeMap(entries: [string, DesignNode][], errors: string[]): void {
  const seen = new Set<string>();
  for (const [key, node] of entries) {
    if (node.id !== key) {
      errors.push(`Node "${key}" is stored under the wrong key; its id is "${node.id}".`);
    }
    if (seen.has(node.id)) {
      errors.push(`Duplicate node id "${node.id}".`);
    }
    seen.add(node.id);
  }
}

function validateRoot(root: DesignNode, doc: DesignDocument, errors: string[]): void {
  if (root.type !== "canvas") {
    errors.push(`Root node "${root.id}" must be a canvas node but is type "${root.type}".`);
  }
  if (root.parentId !== null) {
    errors.push(`Root node "${root.id}" must have no parent but references "${root.parentId}".`);
  }
  if (root.type === "canvas") {
    if (root.width !== doc.canvas.width || root.height !== doc.canvas.height) {
      errors.push(
        `Root canvas "${root.id}" is ${root.width}×${root.height} but the document canvas is ` +
          `${doc.canvas.width}×${doc.canvas.height}.`,
      );
    }
  }
}

function validateCanvasCount(
  canvasNodes: [string, DesignNode][],
  doc: DesignDocument,
  errors: string[],
): void {
  if (canvasNodes.length !== 1) {
    errors.push(`Document must contain exactly one canvas node but found ${canvasNodes.length}.`);
    return;
  }
  const canvas = canvasNodes[0];
  if (canvas !== undefined && canvas[1].id !== doc.rootNodeId) {
    errors.push(
      `The only canvas node "${canvas[1].id}" must be the root node "${doc.rootNodeId}".`,
    );
  }
}

function validateNodeRelationships(node: DesignNode, doc: DesignDocument, errors: string[]): void {
  if (node.name.trim().length === 0) {
    errors.push(`Node "${node.id}" has an empty name.`);
  }
  if (typeof node.opacity !== "number" || node.opacity < 0 || node.opacity > 1) {
    errors.push(`Node "${node.id}" has opacity ${String(node.opacity)} outside 0..1.`);
  }

  if (isContainerNode(node)) {
    validateChildren(node, doc, errors);
  } else if ("children" in node) {
    errors.push(`Leaf node "${node.id}" of type "${node.type}" must not declare children.`);
  }

  if (node.id === doc.rootNodeId) {
    return;
  }
  validateParent(node, doc, errors);
}

function validateChildren(node: ContainerNode, doc: DesignDocument, errors: string[]): void {
  const seen = new Set<string>();
  for (const childId of node.children) {
    if (seen.has(childId)) {
      errors.push(`Node "${node.id}" lists child "${childId}" more than once.`);
    }
    seen.add(childId);

    const child = doc.nodes[childId];
    if (child === undefined) {
      errors.push(`Node "${node.id}" references missing child "${childId}".`);
      continue;
    }
    if (child.parentId !== node.id) {
      errors.push(
        `Node "${childId}" is listed as a child of "${node.id}" but its parent is ` +
          `"${child.parentId ?? "(none)"}".`,
      );
    }
  }
}

function validateParent(node: DesignNode, doc: DesignDocument, errors: string[]): void {
  if (node.parentId === null) {
    errors.push(`Node "${node.id}" is not the root but has no parent.`);
    return;
  }
  if (node.parentId === node.id) {
    errors.push(`Node "${node.id}" cannot be its own parent.`);
    return;
  }

  const parent = doc.nodes[node.parentId];
  if (parent === undefined) {
    errors.push(`Node "${node.id}" references missing parent "${node.parentId}".`);
    return;
  }
  if (!isContainerNode(parent)) {
    errors.push(
      `Node "${node.id}" has parent "${parent.id}" of type "${parent.type}", which cannot hold children.`,
    );
    return;
  }
  if (!parent.children.includes(node.id)) {
    errors.push(
      `Node "${node.id}" claims parent "${parent.id}" but is not listed in its children.`,
    );
  }
}

/**
 * Walks the tree from the root, reporting cycles and returning the set of
 * reachable node ids. A node stuck inside a cycle is reported as a cycle rather
 * than as an orphan.
 */
function collectReachable(
  doc: DesignDocument,
  root: DesignNode | undefined,
  errors: string[],
): Set<string> {
  const colors = new Map<string, "visiting" | "done">();
  let cycleReported = false;

  const visit = (node: DesignNode): void => {
    const color = colors.get(node.id);
    if (color === "visiting") {
      if (!cycleReported) {
        errors.push(`Node "${node.id}" participates in a cycle.`);
        cycleReported = true;
      }
      return;
    }
    if (color === "done") {
      return;
    }

    colors.set(node.id, "visiting");
    if (isContainerNode(node)) {
      for (const childId of node.children) {
        const child = doc.nodes[childId];
        if (child !== undefined) {
          visit(child);
        }
      }
    }
    colors.set(node.id, "done");
  };

  if (root !== undefined) {
    visit(root);
  }
  return new Set(colors.keys());
}
