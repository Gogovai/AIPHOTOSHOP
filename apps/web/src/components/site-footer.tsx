export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[13px] font-semibold tracking-[0.18em] text-ink">AIPHOTOSHOP</p>
          <p className="mt-2 max-w-md text-[13px] leading-6 text-ink-muted">
            An AI-native professional design environment. Structured documents, editable layers, and
            controlled AI operations.
          </p>
        </div>

        <div className="font-mono text-[10px] leading-5 tracking-[0.14em] text-ink-faint sm:text-right">
          <p>MILESTONE 002 — EDITOR SHELL</p>
          <p>SOURCE OF TRUTH: DESIGN DOCUMENT</p>
        </div>
      </div>
    </footer>
  );
}
