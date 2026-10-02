/**
 * Editor state: what the user is doing, not what the design is.
 *
 * Selection, the active tool, and viewport framing belong to the editor. They
 * are deliberately NOT stored in the design document (see `docs/ARCHITECTURE.md`),
 * so saving or transmitting a document never leaks transient UI state.
 *
 * This module is view-level only; it is intentionally not part of any package.
 */

import type { NodeId } from "@aiphotoshop/design-schema";

/** Identifiers for the editor tools. Mirrors the tool rail. */
export type EditorTool =
  "move" | "select" | "frame" | "text" | "shape" | "pen" | "image" | "hand" | "zoom";

/** Pan/zoom framing. Viewer state, never document state. */
export interface ViewportState {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

/** All transient editor state. */
export interface EditorState {
  readonly selectedNodeIds: readonly NodeId[];
  readonly activeTool: EditorTool;
  readonly viewport: ViewportState;
}

/** Input for {@link createEditorState}. */
export interface CreateEditorStateOptions {
  readonly selectedNodeIds?: readonly NodeId[];
  readonly activeTool?: EditorTool;
  readonly viewport?: Partial<ViewportState>;
}

/** Creates editor state with safe defaults (nothing selected, Move tool, 100%). */
export function createEditorState(options: CreateEditorStateOptions = {}): EditorState {
  return {
    selectedNodeIds: options.selectedNodeIds ?? [],
    activeTool: options.activeTool ?? "move",
    viewport: { x: 0, y: 0, zoom: 1, ...options.viewport },
  };
}

/** True when the node is currently selected. */
export function isNodeSelected(state: EditorState, nodeId: NodeId): boolean {
  return state.selectedNodeIds.includes(nodeId);
}

/** Replaces the selection. Pass an empty array to clear it. */
export function setSelectedNodes(state: EditorState, nodeIds: readonly NodeId[]): EditorState {
  return { ...state, selectedNodeIds: nodeIds };
}

/** The viewport zoom as a whole percentage, for display. */
export function zoomPercent(state: EditorState): number {
  return Math.round(state.viewport.zoom * 100);
}
