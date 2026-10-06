"use client";

import Link from "next/link";

import { EditorSaveControl } from "@/components/editor/editor-save-control";
import { SaveStatePill } from "@/components/editor/save-state-pill";

/**
 * Compact professional application header. The center is deliberately a
 * restrained workspace label, not fake editing controls. Right-side controls
 * are shell buttons with honest labels: no share, export, or account backend
 * exists yet, so none is implied as working.
 *
 * The save-state pill (SAVED / UNSAVED / SAVING / ERROR) reflects actual
 * persistence state. On load the document matches the current revision, so the
 * state is SAVED. The save control island switches this to UNSAVED after an
 * edit and to SAVING / SAVED / ERROR around an explicit save.
 */
export function EditorTopBar({
  projectId,
  revisionId,
  documentName,
}: {
  projectId: string;
  revisionId: string;
  documentName: string;
}) {
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

        <span className="truncate text-[12px] text-canvas-muted">{documentName}</span>
        <span
          className="shrink-0 font-mono text-[10px] tracking-[0.14em] text-canvas-muted"
          title={`Project: ${projectId}`}
        >
          · {revisionId}
        </span>
      </div>

      <div className="hidden min-w-0 flex-1 justify-center md:flex">
        <span className="font-mono text-[10px] tracking-[0.18em] text-canvas-muted">
          WORKSPACE · {projectId.toUpperCase()}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <SaveStatePill state="SAVED" />
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

/**
 * Top bar variant that includes the live save control island.
 *
 * It is a client component so the save control can own its own state while the
 * shell stays a server component: the server only passes serializable props.
 */
export function EditorTopBarWithSaveControl({
  projectId,
  revisionId,
  documentName,
}: {
  projectId: string;
  revisionId: string;
  documentName: string;
}) {
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

        <span className="truncate text-[12px] text-canvas-muted">{documentName}</span>
        <span
          className="shrink-0 font-mono text-[10px] tracking-[0.14em] text-canvas-muted"
          title={`Project: ${projectId}`}
        >
          · {revisionId}
        </span>
      </div>

      <div className="hidden min-w-0 flex-1 justify-center md:flex">
        <span className="font-mono text-[10px] tracking-[0.18em] text-canvas-muted">
          WORKSPACE · {projectId.toUpperCase()}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <EditorSaveControl projectId={projectId} initialRevisionId={revisionId} />
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

export { SaveStatePill };

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
