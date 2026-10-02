/**
 * JSON serialization for design documents.
 *
 * `serializeDocument` produces a JSON string; `deserializeDocument` parses one
 * back, validating field shapes before rebuilding the normalized document. The
 * round-trip preserves document id, every node id, types, hierarchy, names,
 * visibility, lock state, type-specific properties, canvas size, and metadata.
 */

import { asDocumentId, asNodeId, type NodeId } from "./ids";
import { type DesignDocument, type DocumentCanvas, type DocumentMetadata } from "./document";
import { assertValidDocument } from "./validation";
import { SHAPE_KINDS, type DesignNode, type NodeGeometry, type ShapeKind } from "./nodes";

/** Thrown when a serialized document cannot be parsed into the schema. */
export class DocumentParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentParseError";
  }
}

/** Serializes a document to a JSON string. Node ids are preserved verbatim. */
export function serializeDocument(doc: DesignDocument): string {
  return JSON.stringify(doc);
}

/** Parses a JSON string produced by {@link serializeDocument}. */
export function deserializeDocument(json: string): DesignDocument {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (error) {
    throw new DocumentParseError(
      `Serialized document is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return parseDocument(raw);
}

/** Rebuilds a document from an already-parsed value, validating every field. */
export function parseDocument(value: unknown): DesignDocument {
  const record = ensureRecord(value, "document");
  const id = asDocumentId(ensureString(record, "id", "document"));
  const version = ensureNumber(record, "version", "document");
  const name = ensureString(record, "name", "document");
  const canvas = parseCanvas(record.canvas);
  const rootNodeId = asNodeId(ensureString(record, "rootNodeId", "document"));
  const metadata = parseMetadata(record.metadata);
  const nodes = parseNodes(record.nodes);

  const doc: DesignDocument = {
    id,
    version,
    name,
    canvas,
    rootNodeId,
    metadata,
    nodes,
  };

  assertValidDocument(doc);
  return doc;
}

function parseCanvas(value: unknown): DocumentCanvas {
  const record = ensureRecord(value, "canvas");
  return {
    width: ensureNumber(record, "width", "canvas"),
    height: ensureNumber(record, "height", "canvas"),
    background: ensureString(record, "background", "canvas"),
  };
}

function parseMetadata(value: unknown): DocumentMetadata {
  const record = ensureRecord(value, "metadata");
  return {
    createdAt: ensureString(record, "createdAt", "metadata"),
    updatedAt: ensureString(record, "updatedAt", "metadata"),
    source: ensureString(record, "source", "metadata"),
  };
}

function parseNodes(value: unknown): Record<NodeId, DesignNode> {
  const record = ensureRecord(value, "nodes");
  const nodes: Record<NodeId, DesignNode> = {};
  for (const [key, raw] of Object.entries(record)) {
    const node = parseNode(raw, `nodes["${key}"]`);
    if (node.id !== key) {
      throw new DocumentParseError(
        `nodes["${key}"] declares id "${node.id}"; the key and id must match.`,
      );
    }
    nodes[node.id] = node;
  }
  return nodes;
}

function parseNode(value: unknown, context: string): DesignNode {
  const record = ensureRecord(value, context);
  const id = asNodeId(ensureString(record, "id", context));
  const name = ensureString(record, "name", context);
  const type = ensureString(record, "type", context);
  const visible = ensureBoolean(record, "visible", context);
  const locked = ensureBoolean(record, "locked", context);
  const opacity = ensureNumber(record, "opacity", context);
  const parentId = parseParentId(record.parentId, id, context);

  const base = { id, name, parentId, visible, locked, opacity };

  switch (type) {
    case "canvas":
      return {
        ...base,
        type: "canvas",
        children: parseChildren(record.children, context),
        width: ensureNumber(record, "width", context),
        height: ensureNumber(record, "height", context),
        background: ensureString(record, "background", context),
      };
    case "group":
      return {
        ...base,
        type: "group",
        children: parseChildren(record.children, context),
      };
    case "image":
      return {
        ...base,
        type: "image",
        src: ensureString(record, "src", context),
        geometry: parseGeometry(record.geometry, context),
      };
    case "text":
      return {
        ...base,
        type: "text",
        text: ensureString(record, "text", context),
        fontFamily: ensureString(record, "fontFamily", context),
        fontSize: ensureNumber(record, "fontSize", context),
        fontWeight: ensureNumber(record, "fontWeight", context),
        color: ensureString(record, "color", context),
        geometry: parseGeometry(record.geometry, context),
      };
    case "shape":
      return {
        ...base,
        type: "shape",
        shape: parseShapeKind(record.shape, context),
        fill: ensureString(record, "fill", context),
        stroke: ensureString(record, "stroke", context),
        strokeWidth: ensureNumber(record, "strokeWidth", context),
        geometry: parseGeometry(record.geometry, context),
      };
    case "svg":
      return {
        ...base,
        type: "svg",
        markup: ensureString(record, "markup", context),
        geometry: parseGeometry(record.geometry, context),
      };
    default:
      throw new DocumentParseError(`${context} has unknown node type "${type}".`);
  }
}

function parseParentId(value: unknown, id: NodeId, context: string): NodeId | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new DocumentParseError(`${context} (node "${id}") has a non-string parentId.`);
  }
  return asNodeId(value);
}

function parseChildren(value: unknown, context: string): readonly NodeId[] {
  if (!Array.isArray(value)) {
    throw new DocumentParseError(`${context} has a non-array "children".`);
  }
  return value.map((child, index) => {
    if (typeof child !== "string") {
      throw new DocumentParseError(`${context} children[${index}] is not a string.`);
    }
    return asNodeId(child);
  });
}

function parseGeometry(value: unknown, context: string): NodeGeometry {
  const record = ensureRecord(value, `${context}.geometry`);
  return {
    x: ensureNumber(record, "x", `${context}.geometry`),
    y: ensureNumber(record, "y", `${context}.geometry`),
    width: ensureNumber(record, "width", `${context}.geometry`),
    height: ensureNumber(record, "height", `${context}.geometry`),
  };
}

function parseShapeKind(value: unknown, context: string): ShapeKind {
  if (typeof value !== "string" || !SHAPE_KINDS.includes(value as ShapeKind)) {
    throw new DocumentParseError(
      `${context} has unknown shape "${String(value)}"; expected one of ${SHAPE_KINDS.join(", ")}.`,
    );
  }
  return value as ShapeKind;
}

function ensureRecord(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new DocumentParseError(`${context} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function ensureString(record: Record<string, unknown>, key: string, context: string): string {
  const value = record[key];
  if (typeof value !== "string") {
    throw new DocumentParseError(`${context}.${key} must be a string.`);
  }
  return value;
}

function ensureNumber(record: Record<string, unknown>, key: string, context: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new DocumentParseError(`${context}.${key} must be a finite number.`);
  }
  return value;
}

function ensureBoolean(record: Record<string, unknown>, key: string, context: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") {
    throw new DocumentParseError(`${context}.${key} must be a boolean.`);
  }
  return value;
}
