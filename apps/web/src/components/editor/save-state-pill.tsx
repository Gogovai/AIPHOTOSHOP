/**
 * Save-state indicator pill.
 *
 * States:
 *  - SAVED:   document matches the current persisted revision.
 *  - UNSAVED: local edits exist that have not been persisted.
 *  - SAVING: a save is in flight.
 *  - ERROR:   the last save attempt failed.
 *
 * We do not fake these states. Each corresponds to a real persistence outcome
 * from the repository.
 */
export function SaveStatePill({ state }: { state: "SAVED" | "UNSAVED" | "SAVING" | "ERROR" }) {
  const className =
    state === "SAVED"
      ? "text-canvas-muted"
      : state === "UNSAVED"
        ? "text-canvas-muted animate-pulse"
        : state === "SAVING"
          ? "text-canvas-muted"
          : "text-red-400";

  return (
    <span
      className={`shrink-0 font-mono text-[10px] tracking-[0.14em] ${className}`}
      title={`Save state: ${state}`}
    >
      {state}
    </span>
  );
}
