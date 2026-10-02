const NAV_ITEMS = [
  { href: "#document", label: "Document model" },
  { href: "#architecture", label: "Architecture" },
  { href: "#status", label: "Status" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur-[6px]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-6">
        <a href="#top" className="flex items-baseline gap-2.5">
          <span className="text-[13px] font-semibold tracking-[0.18em] text-ink">AIPHOTOSHOP</span>
          <span className="hidden font-mono text-[10px] tracking-[0.14em] text-ink-faint sm:inline">
            DESIGN ENVIRONMENT
          </span>
        </a>

        <nav aria-label="Sections" className="hidden items-center gap-7 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-[13px] text-ink-muted transition-colors hover:text-ink"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <span className="font-mono text-[10px] tracking-[0.16em] text-ink-faint">
          MILESTONE 002
        </span>
      </div>
    </header>
  );
}
