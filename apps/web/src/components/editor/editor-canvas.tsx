import type { DesignDocument } from "@aiphotoshop/design-schema";

/**
 * The canvas viewport: a dark neutral workspace around a centered artboard
 * whose proportions come from the real document canvas.
 *
 * Rendering is still a later milestone, so the artboard carries an honest empty
 * state rather than drawing the document tree. Rulers are decorative hairlines.
 */
export function EditorCanvas({ document: doc }: { document: DesignDocument }) {
  const canvas = doc.canvas ?? { width: 0, height: 0 };

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
          style={{ width: canvas.width / 4, height: canvas.height / 4 }}
        >
          <p className="text-[13px] font-medium text-ink">Your canvas</p>
          <p className="mt-1.5 text-[11px] text-ink-faint">
            Canvas rendering arrives in a later milestone.
          </p>
        </div>
      </div>
    </section>
  );
}
