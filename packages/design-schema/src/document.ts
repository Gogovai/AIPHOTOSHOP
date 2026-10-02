/**
 * The design document: the canonical, serializable description of one design.
 *
 * The document stores nodes in a normalized map keyed by node id and refers to
 * the root by id. This keeps identity stable under any structural edit and
 * makes serialization a plain `JSON.stringify` (see `serialize.ts`).
 *
 * The document model knows nothing about editors, rendering, or AI. It is the
 * single source of truth for what a design *is*.
 */

import { createDocumentId, createNodeId, type DocumentId, type NodeId } from "./ids";
import { createCanvasNode, type DesignNode } from "./nodes";

/** Schema version written into every new document. */
export const DOCUMENT_SCHEMA_VERSION = 1;

/** Default document name for a freshly created design. */
export const DEFAULT_DOCUMENT_NAME = "Untitled Design";

/** Default artboard size. Not a permanent upper bound — callers may override. */
export const DEFAULT_CANVAS_WIDTH = 1080;
export const DEFAULT_CANVAS_HEIGHT = 1350;
export const DEFAULT_CANVAS_BACKGROUND = "#ffffff";

/** The artboard the document is designed against. */
export interface DocumentCanvas {
  readonly width: number;
  readonly height: number;
  readonly background: string;
}

/** Free-form-but-typed document metadata. Never used for identity. */
export interface DocumentMetadata {
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Where the document came from, e.g. the client that created it. */
  readonly source: string;
}

/**
 * A complete design document.
 *
 * `nodes` is normalized: every node is addressable by its id, and the tree
 * structure is expressed through `parentId` and each container's `children`.
 */
export interface DesignDocument {
  readonly id: DocumentId;
  readonly version: number;
  readonly name: string;
  readonly canvas: DocumentCanvas;
  /** Id of the single canvas node that roots the tree. */
  readonly rootNodeId: NodeId;
  readonly metadata: DocumentMetadata;
  readonly nodes: Readonly<Record<NodeId, DesignNode>>;
}

/** Input for {@link createDocument}. Every field is optional. */
export interface CreateDocumentOptions {
  readonly id?: string;
  readonly name?: string;
  readonly width?: number;
  readonly height?: number;
  readonly background?: string;
  readonly rootNodeId?: NodeId;
  readonly rootName?: string;
  readonly metadata?: Partial<DocumentMetadata>;
}

/**
 * Creates a valid document containing exactly one node: the canvas root.
 * Additional nodes are added through `@aiphotoshop/design-engine`.
 */
export function createDocument(options: CreateDocumentOptions = {}): DesignDocument {
  const width = options.width ?? DEFAULT_CANVAS_WIDTH;
  const height = options.height ?? DEFAULT_CANVAS_HEIGHT;
  const background = options.background ?? DEFAULT_CANVAS_BACKGROUND;
  const id: DocumentId = options.id !== undefined ? (options.id as DocumentId) : createDocumentId();
  const rootNodeId = options.rootNodeId ?? createNodeId();
  const createdAt = options.metadata?.createdAt ?? new Date().toISOString();

  const root = createCanvasNode({
    id: rootNodeId,
    name: options.rootName ?? "Canvas",
    width,
    height,
    background,
  });

  return {
    id,
    version: DOCUMENT_SCHEMA_VERSION,
    name: options.name ?? DEFAULT_DOCUMENT_NAME,
    canvas: { width, height, background },
    rootNodeId,
    metadata: {
      createdAt,
      updatedAt: options.metadata?.updatedAt ?? createdAt,
      source: options.metadata?.source ?? "aiphotoshop",
    },
    nodes: { [rootNodeId]: root },
  };
}

/**
 * Returns the root node, or `undefined` when the document is malformed.
 * Prefer `validateDocument` before relying on this.
 */
export function getRootNode(doc: DesignDocument): DesignNode | undefined {
  return doc.nodes[doc.rootNodeId];
}

/** Returns a node by id, or `undefined` when absent. */
export function getNode(doc: DesignDocument, id: NodeId): DesignNode | undefined {
  return doc.nodes[id];
}
