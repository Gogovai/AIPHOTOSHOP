/**
 * `@aiphotoshop/design-schema`
 *
 * The canonical, serializable contract for a design document: the canvas, its
 * layers, and every editable object inside them. It is the single source of
 * truth for what a design *is*, independent of how it is rendered or edited.
 *
 * Responsibilities (see `docs/ARCHITECTURE.md` and `docs/LAYER_SYSTEM.md`):
 *
 * - Define the design document, node, and container/leaf hierarchy.
 * - Guarantee every editable element carries a stable, opaque identifier.
 * - Guarantee every document round-trips through serialization without loss.
 * - Contain no rendering, no editor state, and no AI logic.
 *
 * The document model is a normalized tree: nodes live in a map keyed by id and
 * the hierarchy is expressed through `parentId` and each container's `children`.
 * Introduce edits through `@aiphotoshop/design-engine`, never by mutating a
 * document directly.
 */

export {
  asDocumentId,
  asNodeId,
  createDocumentId,
  createNodeId,
  type DocumentId,
  type NodeId,
} from "./ids";

export {
  createCanvasNode,
  createGroupNode,
  createImageNode,
  createShapeNode,
  createSvgNode,
  createTextNode,
  isContainerNode,
  isLeafNode,
  nodeChildren,
  NODE_TYPES,
  SHAPE_KINDS,
  type BaseNode,
  type CanvasNode,
  type ContainerNode,
  type ContainerNodeFields,
  type CreateCanvasNodeOptions,
  type CreateGroupNodeOptions,
  type CreateImageNodeOptions,
  type CreateLeafNodeOptions,
  type CreateNodeOptions,
  type CreateShapeNodeOptions,
  type CreateSvgNodeOptions,
  type CreateTextNodeOptions,
  type DesignNode,
  type GroupNode,
  type ImageNode,
  type LeafNode,
  type NodeGeometry,
  type NodeType,
  type ShapeKind,
  type ShapeNode,
  type SvgNode,
  type TextNode,
} from "./nodes";

export {
  createDocument,
  getNode,
  getRootNode,
  DEFAULT_CANVAS_BACKGROUND,
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_DOCUMENT_NAME,
  DOCUMENT_SCHEMA_VERSION,
  type CreateDocumentOptions,
  type DesignDocument,
  type DocumentCanvas,
  type DocumentMetadata,
} from "./document";

export {
  assertValidDocument,
  DocumentValidationError,
  validateDocument,
  type DocumentValidationResult,
} from "./validation";

export {
  deserializeDocument,
  DocumentParseError,
  parseDocument,
  serializeDocument,
} from "./serialize";
