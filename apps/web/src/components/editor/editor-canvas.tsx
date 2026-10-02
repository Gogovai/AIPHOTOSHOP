import { DOCUMENT_SIZE } from "@/components/editor/editor-types";

/**
 * The canvas viewport: a dark neutral workspace around a centered white
 * artboard with realistic document proportions (1080 × 1350).
 *
 * This is the visual shell only — no rendering engine, no layers, no editable
 * objects (those begin in Milestone 003). The artboard carries an honest empty
 * state. Rulers are drawn as purely decorative hairlines.
 */
export function EditorCanvas() {
  return (
    <section
      aria-label="Canvas viewport"
      className="relative min-w-0 flex-1 overflow-auto bg-canvas"
    >
      {/* Decorative ruler hairlines. Measurement logic arrives later. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-8 w-px bg-canvas-line/60"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-8 h-px bg-canvas-line/60"
      />

      <div className="flex min-h-full min-w-max items-center justify-center p-16">
        <div
          data-testid="artboard"
          className="flex flex-col items-center justify-center border border-canvas-line bg-white shadow-artboard"
          style={{ width: DOCUMENT_SIZE.width / 4, height: DOCUMENT_SIZE.height / 4 }}
        >
          <p className="text-[13px] font-medium text-ink">Your canvas</p>
          <p className="mt-1.5 text-[11px] text-ink-faint">
            The structured design engine will appear here.
          </p>
        </div>
      </div>
    </section>
  );
}
