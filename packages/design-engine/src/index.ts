/**
 * `@aiphotoshop/design-engine`
 *
 * Executes deterministic operations against a design document. Every mutation
 * the product performs — human or AI — is expressed here as an explicit,
 * inspectable operation so that changes remain reproducible, reversible, and
 * fully editable.
 *
 * Responsibilities (see `docs/DESIGN_ENGINE.md`):
 *
 * - Apply structural operations: add, remove, rename, reparent, reorder,
 *   group, ungroup, and set visibility/lock state.
 * - Validate operations against the schema before applying them.
 * - Return a new document rather than mutating the previous one.
 * - Contain no rendering, no persistence, and no AI provider specifics.
 *
 * The engine depends on `@aiphotoshop/design-schema` only. It never imports
 * React or anything that knows an editor exists.
 */

export { DesignEngineError, type DesignEngineErrorCode } from "./errors";

export {
  addNode,
  applyOperation,
  groupNodes,
  removeNode,
  renameNode,
  reorderNode,
  reparentNode,
  setLocked,
  setVisibility,
  ungroupNode,
  type AddNodeOptions,
  type DocumentOperation,
  type GroupNodesOptions,
  type ReparentNodeOptions,
} from "./operations";
