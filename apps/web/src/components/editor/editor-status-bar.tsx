import { DOCUMENT_NAME, DOCUMENT_SIZE } from "@/components/editor/editor-types";

/**
 * Thin bottom bar: document name, artboard size, and zoom display. The zoom
 * stepper is shell UI only — no zoom state exists in this milestone, so the
 * buttons change nothing and are labelled as such via title text.
 */
export function EditorStatusBar() {
  return (
    <footer
      aria-label="Status bar"
      className="hidden h-7 shrink-0 items-center gap-3 border-t border-canvas-line bg-canvas px-3 font-mono text-[10px] tracking-[0.12em] text-canvas-muted min-[900px]:flex"
    >
      <span className="truncate">{DOCUMENT_NAME}</span>

      <span aria-hidden className="h-3 w-px bg-canvas-line" />

      <span>
        {DOCUMENT_SIZE.width} × {DOCUMENT_SIZE.height}
      </span>

      <span className="ml-auto flex items-center gap-2">
        <span aria-label="Status: design document shell" className="text-canvas-ink">
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
        <span aria-label="Current zoom: 100 percent" className="text-canvas-ink">
          100%
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
