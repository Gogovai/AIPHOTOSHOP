"use client";

import {
  FrameIcon,
  HandIcon,
  ImageIcon,
  MoveIcon,
  PenIcon,
  SelectIcon,
  ShapeIcon,
  TextIcon,
  ZoomIcon,
} from "@/components/editor/editor-icons";
import type { EditorTool } from "@/components/editor/editor-state";
import { ToolButton } from "@/components/editor/tool-button";

/**
 * The tools offered by the shell. Selection is real shell state (which button
 * is highlighted); the tools themselves do not yet do anything — tool behavior
 * begins with later milestones. No callbacks exist yet, so none are faked.
 */
const TOOLS: readonly { id: EditorTool; label: string; Icon: typeof MoveIcon }[] = [
  { id: "move", label: "Move", Icon: MoveIcon },
  { id: "select", label: "Select", Icon: SelectIcon },
  { id: "frame", label: "Frame", Icon: FrameIcon },
  { id: "text", label: "Text", Icon: TextIcon },
  { id: "shape", label: "Shape", Icon: ShapeIcon },
  { id: "pen", label: "Pen", Icon: PenIcon },
  { id: "image", label: "Image", Icon: ImageIcon },
  { id: "hand", label: "Hand", Icon: HandIcon },
  { id: "zoom", label: "Zoom", Icon: ZoomIcon },
];

export type ToolId = EditorTool;

/**
 * Vertical tool rail. `"use client"` is limited to this island (plus its
 * buttons); the rest of the editor shell stays on the server.
 */
export function EditorToolbar() {
  return (
    <aside
      aria-label="Tools"
      className="flex w-12 shrink-0 flex-col items-center gap-0.5 border-r border-canvas-line bg-canvas py-2"
    >
      {TOOLS.map(({ id, label, Icon }) => (
        <ToolButton key={id} label={label} icon={<Icon className="size-4" />} />
      ))}
    </aside>
  );
}
