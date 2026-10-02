import Link from "next/link";

import { DOCUMENT_NAME } from "@/components/editor/editor-types";

/**
 * Compact professional application header. The center is deliberately a
 * restrained workspace label, not fake editing controls. Right-side controls
 * are shell buttons with honest labels: no share, export, or account backend
 * exists yet, so none is implied as working.
 */
export function EditorTopBar({ projectId }: { projectId: string }) {
  return (
    <header className="flex h-11 shrink-0 items-center gap-4 border-b border-canvas-line bg-canvas px-3">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/"
          className="text-[12px] font-semibold tracking-[0.18em] text-canvas-ink transition-colors hover:text-paper"
        >
          AIPHOTOSHOP
        </Link>

        <span aria-hidden className="h-4 w-px shrink-0 bg-canvas-line" />

        <span className="truncate text-[12px] text-canvas-muted">{DOCUMENT_NAME}</span>
        <span
          className="shrink-0 font-mono text-[10px] tracking-[0.14em] text-canvas-muted"
          title={`Project: ${projectId}`}
        >
          SAVED
        </span>
      </div>

      <div className="hidden min-w-0 flex-1 justify-center md:flex">
        <span className="font-mono text-[10px] tracking-[0.18em] text-canvas-muted">
          WORKSPACE · {projectId.toUpperCase()}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <ShellActionButton label="Share" />
        <ShellActionButton label="Export" />
        <ShellActionButton label="Help" />
        <span
          aria-label="Account"
          title="Account"
          className="ml-1 flex size-6 items-center justify-center border border-canvas-line font-mono text-[9px] text-canvas-muted"
          role="img"
        >
          AK
        </span>
      </div>
    </header>
  );
}

function ShellActionButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="border border-transparent px-2.5 py-1 text-[12px] text-canvas-muted transition-colors hover:border-canvas-line hover:text-canvas-ink"
    >
      {label}
    </button>
  );
}
