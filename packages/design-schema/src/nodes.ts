/**
 * The node model of a design document.
 *
 * A document is a tree of nodes rooted at a single canvas. Nodes are modelled
 * as a discriminated union on `type` so that each kind only declares the
 * properties it actually has — there is no single interface with every
 * property optional (see `docs/LAYER_SYSTEM.md`).
 *
 * Two shapes exist:
 * - containers (`canvas`, `group`) own an ordered list of `children`;
 * - leaves (`image`, `text`, `shape`, `svg`) own no children.
 *
 * Every node carries the shared `BaseNode` fields. `type` is the discriminant.
 */

import { createNodeId, type NodeId } from "./ids";

/** The kind of a node. Also the discriminated-union tag. */
export type NodeType = "canvas" | "group" | "image" | "text" | "shape" | "svg";

/** All node types, in a stable order, for validation and iteration. */
export const NODE_TYPES: readonly NodeType[] = ["canvas", "group", "image", "text", "shape", "svg"];

/** Bounding box of a leaf node, in canvas coordinates. */
export interface NodeGeometry {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Fields shared by every node, regardless of type. */
export interface BaseNode {
  /** Stable, opaque identity. Never derived from name, index, or order. */
  readonly id: NodeId;
  readonly type: NodeType;
  /** Human-facing display name. Metadata only; never identity. */
  readonly name: string;
  /** Parent id, or `null` for the root node only. */
  readonly parentId: NodeId | null;
  readonly visible: boolean;
  readonly locked: boolean;
  /** 0..1. */
  readonly opacity: number;
}

/** Fields shared by nodes that can contain children. */
export interface ContainerNodeFields {
  /** Ordered child ids. Order defines stacking/front-to-back meaning. */
  readonly children: readonly NodeId[];
}

/** The document root. Exactly one canvas exists per document. */
export interface CanvasNode extends BaseNode, ContainerNodeFields {
  readonly type: "canvas";
  readonly width: number;
  readonly height: number;
  readonly background: string;
}

/** A grouping container. Its children keep their own identities. */
export interface GroupNode extends BaseNode, ContainerNodeFields {
  readonly type: "group";
}

/** A raster image. */
export interface ImageNode extends BaseNode {
  readonly type: "image";
  /** Source reference. May be a URL, a storage key, or a data URI. */
  readonly src: string;
  readonly geometry: NodeGeometry;
}

/** A block of text. */
export interface TextNode extends BaseNode {
  readonly type: "text";
  readonly text: string;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight: number;
  readonly color: string;
  readonly geometry: NodeGeometry;
}

/** Geometric primitives supported by the shape node. */
export type ShapeKind = "rectangle" | "ellipse" | "line";

/** All shape kinds, for validation. */
export const SHAPE_KINDS: readonly ShapeKind[] = ["rectangle", "ellipse", "line"];

/** A vector primitive. */
export interface ShapeNode extends BaseNode {
  readonly type: "shape";
  readonly shape: ShapeKind;
  readonly fill: string;
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly geometry: NodeGeometry;
}

/** Inline SVG markup. */
export interface SvgNode extends BaseNode {
  readonly type: "svg";
  readonly markup: string;
  readonly geometry: NodeGeometry;
}

/** Any leaf node (a node that cannot contain children). */
export type LeafNode = ImageNode | TextNode | ShapeNode | SvgNode;

/** Any container node (a node that owns children). */
export type ContainerNode = CanvasNode | GroupNode;

/** Any node in a design document. */
export type DesignNode = CanvasNode | GroupNode | LeafNode;

/** Options shared by every node factory. */
export interface CreateNodeOptions {
  readonly id?: NodeId;
  readonly name: string;
  readonly parentId?: NodeId | null;
  readonly visible?: boolean;
  readonly locked?: boolean;
  readonly opacity?: number;
}

/** Options shared by leaf node factories. */
export interface CreateLeafNodeOptions extends CreateNodeOptions {
  readonly geometry?: Partial<NodeGeometry>;
}

/** Options for {@link createCanvasNode}. */
export interface CreateCanvasNodeOptions extends CreateNodeOptions {
  readonly width: number;
  readonly height: number;
  readonly background?: string;
  readonly children?: readonly NodeId[];
}

/** Options for {@link createGroupNode}. */
export interface CreateGroupNodeOptions extends CreateNodeOptions {
  readonly children?: readonly NodeId[];
}

/** Options for {@link createImageNode}. */
export interface CreateImageNodeOptions extends CreateLeafNodeOptions {
  readonly src: string;
}

/** Options for {@link createTextNode}. */
export interface CreateTextNodeOptions extends CreateLeafNodeOptions {
  readonly text: string;
  readonly fontFamily?: string;
  readonly fontSize?: number;
  readonly fontWeight?: number;
  readonly color?: string;
}

/** Options for {@link createShapeNode}. */
export interface CreateShapeNodeOptions extends CreateLeafNodeOptions {
  readonly shape?: ShapeKind;
  readonly fill?: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
}

/** Options for {@link createSvgNode}. */
export interface CreateSvgNodeOptions extends CreateLeafNodeOptions {
  readonly markup: string;
}

const DEFAULT_GEOMETRY: NodeGeometry = { x: 0, y: 0, width: 0, height: 0 };

/** Builds the shared fields of a node, applying defaults. */
function baseFields(options: CreateNodeOptions): Omit<BaseNode, "type"> {
  return {
    id: options.id ?? createNodeId(),
    name: options.name,
    parentId: options.parentId ?? null,
    visible: options.visible ?? true,
    locked: options.locked ?? false,
    opacity: options.opacity ?? 1,
  };
}

function geometryFrom(geometry: Partial<NodeGeometry> | undefined): NodeGeometry {
  return { ...DEFAULT_GEOMETRY, ...geometry };
}

/** Creates a canvas root node. */
export function createCanvasNode(options: CreateCanvasNodeOptions): CanvasNode {
  return {
    ...baseFields(options),
    type: "canvas",
    children: options.children ?? [],
    width: options.width,
    height: options.height,
    background: options.background ?? "#ffffff",
  };
}

/** Creates a group container node. */
export function createGroupNode(options: CreateGroupNodeOptions): GroupNode {
  return {
    ...baseFields(options),
    type: "group",
    children: options.children ?? [],
  };
}

/** Creates an image leaf node. */
export function createImageNode(options: CreateImageNodeOptions): ImageNode {
  return {
    ...baseFields(options),
    type: "image",
    src: options.src,
    geometry: geometryFrom(options.geometry),
  };
}

/** Creates a text leaf node. */
export function createTextNode(options: CreateTextNodeOptions): TextNode {
  return {
    ...baseFields(options),
    type: "text",
    text: options.text,
    fontFamily: options.fontFamily ?? "Inter",
    fontSize: options.fontSize ?? 16,
    fontWeight: options.fontWeight ?? 400,
    color: options.color ?? "#111111",
    geometry: geometryFrom(options.geometry),
  };
}

/** Creates a shape leaf node. */
export function createShapeNode(options: CreateShapeNodeOptions): ShapeNode {
  return {
    ...baseFields(options),
    type: "shape",
    shape: options.shape ?? "rectangle",
    fill: options.fill ?? "#111111",
    stroke: options.stroke ?? "transparent",
    strokeWidth: options.strokeWidth ?? 0,
    geometry: geometryFrom(options.geometry),
  };
}

/** Creates an SVG leaf node. */
export function createSvgNode(options: CreateSvgNodeOptions): SvgNode {
  return {
    ...baseFields(options),
    type: "svg",
    markup: options.markup,
    geometry: geometryFrom(options.geometry),
  };
}

/** True when a node can contain children. */
export function isContainerNode(node: DesignNode): node is ContainerNode {
  return node.type === "canvas" || node.type === "group";
}

/** True when a node cannot contain children. */
export function isLeafNode(node: DesignNode): node is LeafNode {
  return !isContainerNode(node);
}

/** Children of a node, or an empty list for leaves. */
export function nodeChildren(node: DesignNode): readonly NodeId[] {
  return isContainerNode(node) ? node.children : [];
}
