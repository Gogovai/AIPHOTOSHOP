/**
 * Stable, opaque identifiers for design documents.
 *
 * An identifier is the only thing the engine may use to refer to a document or
 * node. It never encodes position, index, name, or sibling order, so renaming,
 * reordering, grouping, ungrouping, or a serialize/deserialize cycle can never
 * change it (see `docs/LAYER_SYSTEM.md`, "Stable identity").
 *
 * IDs are branded strings so that a raw `string` cannot be passed where a
 * `NodeId` is expected. Tests that need determinism pass an explicit identifier
 * instead of mocking randomness.
 */

/** Opaque identifier for a single node in a design document. */
export type NodeId = string & { readonly __nodeIdBrand: "NodeId" };

/** Opaque identifier for a design document. */
export type DocumentId = string & { readonly __documentIdBrand: "DocumentId" };

interface CryptoLike {
  randomUUID?: () => string;
}

const webCrypto = (globalThis as unknown as { crypto?: CryptoLike }).crypto;

/**
 * Creates a fresh, globally unique node identifier.
 *
 * Prefers the platform's UUID generator and falls back to a random hex string
 * only when Web Crypto is unavailable. Both paths are opaque and collision
 * resistant; neither derives from document content.
 */
export function createNodeId(): NodeId {
  const uuid = webCrypto?.randomUUID?.();
  if (uuid) {
    return `node_${uuid}` as NodeId;
  }
  return `node_${randomHex(24)}` as NodeId;
}

/** Creates a fresh, globally unique document identifier. */
export function createDocumentId(): DocumentId {
  const uuid = webCrypto?.randomUUID?.();
  if (uuid) {
    return `doc_${uuid}` as DocumentId;
  }
  return `doc_${randomHex(24)}` as DocumentId;
}

/**
 * Reinterprets a raw string as a `NodeId`.
 *
 * Used by deserialization and by deterministic tests. This performs no
 * validation: the caller owns the guarantee that the value is unique.
 */
export function asNodeId(value: string): NodeId {
  return value as NodeId;
}

/** Reinterprets a raw string as a `DocumentId`. */
export function asDocumentId(value: string): DocumentId {
  return value as DocumentId;
}

function randomHex(length: number): string {
  let out = "";
  for (let index = 0; index < length; index += 1) {
    out += Math.floor(Math.random() * 16).toString(16);
  }
  return out;
}
