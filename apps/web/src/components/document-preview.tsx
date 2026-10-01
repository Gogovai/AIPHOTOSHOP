type LayerKind = "CANVAS" | "FILL" | "IMAGE" | "GROUP" | "TEXT" | "SHAPE" | "SVG";

interface LayerRow {
  readonly depth: number;
  readonly kind: LayerKind;
  readonly name: string;
  readonly id: string;
}

const LAYERS: readonly LayerRow[] = [
  { depth: 0, kind: "CANVAS", name: "Canvas", id: "#000" },
  { depth: 1, kind: "FILL", name: "background", id: "#a1c4" },
  { depth: 1, kind: "IMAGE", name: "hero-portrait", id: "#4f21" },
  { depth: 1, kind: "GROUP", name: "headline", id: "#77b0" },
  { depth: 2, kind: "TEXT", name: "SOLSTICE", id: "#77b1" },
  { depth: 2, kind: "SHAPE", name: "rule", id: "#77b2" },
  { depth: 1, kind: "SVG", name: "mark", id: "#9c03" },
  { depth: 1, kind: "TEXT", name: "caption", id: "#d1e4" },
];

const SELECTED_ID = "#77b1";

const SWATCHES = ["#131211", "#1d4ed8", "#8b857e", "#faf9f7"] as const;

/**
 * A static, non-interactive illustration of the core product idea: a design is a
 * document with a canvas, layers and addressable objects — not one flattened
 * image. Marked `aria-hidden` because it is decorative.
 */
export function DocumentPreview() {
  return (
    <div aria-hidden className="border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="font-mono text-[10px] tracking-[0.16em] text-ink-faint">
          solstice-poster.json
        </span>
        <span className="font-mono text-[10px] tracking-[0.16em] text-ink-faint">1080 × 1350</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_190px]">
        <div className="bg-canvas px-6 py-7">
          <div className="mx-auto flex aspect-[4/5] max-w-[248px] flex-col justify-between border border-canvas-line p-5">
            <div className="flex items-center justify-between font-mono text-[9px] tracking-[0.22em] text-canvas-muted">
              <span>POSTER</span>
              <span>REV 03</span>
            </div>

            <div>
              <p className="font-mono text-[9px] tracking-[0.3em] text-canvas-muted">ISSUE 01</p>
              <p className="mt-2 text-[28px] leading-none font-semibold tracking-[-0.02em] text-canvas-ink">
                SOLSTICE
              </p>
              <div className="mt-4 h-px w-full bg-canvas-line" />
              <p className="mt-4 text-[10px] leading-4 text-canvas-muted">
                Grid, typography and color expressed as editable objects.
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {SWATCHES.map((swatch) => (
                <span
                  key={swatch}
                  className="size-3 border border-canvas-line"
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-line sm:border-t-0 sm:border-l">
          <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
            <span className="font-mono text-[10px] tracking-[0.16em] text-ink-faint">LAYERS</span>
            <span className="font-mono text-[10px] text-ink-faint">8</span>
          </div>

          <ul className="py-1">
            {LAYERS.map((layer) => {
              const selected = layer.id === SELECTED_ID;
              return (
                <li key={layer.id}>
                  <div
                    className={`flex items-center gap-2 border-l-2 py-1.5 pr-3 text-[11px] ${
                      selected
                        ? "border-accent bg-accent-soft text-ink"
                        : "border-transparent text-ink-muted"
                    }`}
                    style={{ paddingLeft: 10 + layer.depth * 12 }}
                  >
                    <span
                      className={`w-9 shrink-0 font-mono text-[9px] tracking-[0.1em] ${
                        selected ? "text-accent" : "text-ink-faint"
                      }`}
                    >
                      {layer.kind}
                    </span>
                    <span className="truncate">{layer.name}</span>
                    <span className="ml-auto shrink-0 font-mono text-[9px] text-ink-faint">
                      {layer.id}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
        <span className="font-mono text-[10px] tracking-[0.16em] text-ink-faint">
          OPERATIONS APPLIED · 3
        </span>
        <span className="font-mono text-[10px] tracking-[0.16em] text-ink-faint">
          NON-DESTRUCTIVE
        </span>
      </div>
    </div>
  );
}
