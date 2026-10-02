/**
 * Errors raised by the design engine.
 *
 * Operations fail loudly and precisely: every error carries a stable code and,
 * where relevant, the node id involved. Nothing is silently ignored, and a
 * failed operation leaves the input document untouched (operations return new
 * documents; they never mutate).
 */

import type { NodeId } from "@aiphotoshop/design-schema";

/** Stable machine-readable reasons a design operation can fail. */
export type DesignEngineErrorCode =
  | "NODE_NOT_FOUND"
  | "PARENT_NOT_FOUND"
  | "NODE_ALREADY_EXISTS"
  | "ROOT_PROTECTED"
  | "INVALID_PARENT"
  | "INVALID_NODE"
  | "INVALID_MOVE"
  | "INVALID_INDEX"
  | "INVALID_SELECTION"
  | "INVALID_NAME";

/** Thrown when a design operation cannot be applied. */
export class DesignEngineError extends Error {
  readonly code: DesignEngineErrorCode;
  readonly nodeId?: NodeId;

  constructor(code: DesignEngineErrorCode, message: string, nodeId?: NodeId) {
    super(message);
    this.name = "DesignEngineError";
    this.code = code;
    this.nodeId = nodeId;
  }
}
