import type { DesignDocument } from "@aiphotoshop/design-schema";

import { zoomPercent, type EditorState } from "@/components/editor/editor-state";

/**
 * Thin bottom bar: document name, artboard size, and viewport zoom. Values come
 * from the real document and editor state. The zoom stepper is still display
 * only — no zoom operation exists in this milestone, so the buttons are
 * labelled accordingly and change nothing.
 */
export function EditorStatusBar({
  document: doc,
  state,
}: {
  document: DesignDocument;
  state: EditorState;
}) {
  const percent = zoomPercent(state);

  return (
    <footer
      aria-label="Status bar"
      className="hidden h-7 shrink-0 items-center gap-3 border-t border-canvas-line bg-canvas px-3 font-mono text-[10px] tracking-[0.12em] text-canvas-muted min-[900px]:flex"
    >
      <span className="truncate">{doc.name}</span>

      <span aria-hidden className="h-3 w-px bg-canvas-line" />

      <span>
        {doc.canvas.width} × {doc.canvas.height}
      </span>

      <span className="ml-auto flex items-center gap-2">
        <span aria-label="Status: design document" className="text-canvas-ink">
          Design document
        </span>
        <span aria-hidden className="h-3 w-px bg-canvas-line" />
        <button
          type="button"
          aria-label="Zoom out (not active in this milestone)"
          title="Zoom out — arrives with the editor state milestone"
          className="border border-transparent px-1 hover:border-canvas-line hover:text-canvas-ink"
        >
          −
        </button>
        <span aria-label={`Current zoom: ${percent} percent`} className="text-canvas-ink">
          {percent}%
        </span>
        <button
          type="button"
          aria-label="Zoom in (not active in this milestone)"
          title="Zoom in — arrives with the editor state milestone"
          className="border border-transparent px-1 hover:border-canvas-line hover:text-canvas-ink"
        >
          +
        </button>
      </span>
    </footer>
  );
}
