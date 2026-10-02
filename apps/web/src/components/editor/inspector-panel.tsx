import { INSPECTOR_SECTIONS } from "@/components/editor/editor-types";

/**
 * Inspector shell. Sections and fields are static display text — every value
 * is `—` because no document exists to read from. Real values arrive with the
 * document system; no fake inputs are created.
 */
export function InspectorPanel() {
  return (
    <section aria-label="Inspector" className="flex min-h-0 flex-col overflow-y-auto">
      <h2 className="border-b border-canvas-line px-3 py-2 font-mono text-[10px] tracking-[0.18em] text-canvas-muted">
        INSPECTOR
      </h2>

      <div className="space-y-4 px-3 py-3">
        {INSPECTOR_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="font-mono text-[9px] tracking-[0.18em] text-canvas-muted">
              {section.label.toUpperCase()}
            </p>
            <dl className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1.5">
              {section.fields.map((field) => (
                <div key={field.label} className="flex items-center justify-between gap-2">
                  <dt className="text-[10px] text-canvas-muted">{field.label}</dt>
                  <dd className="font-mono text-[10px] text-canvas-ink">{field.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
