"use client";

import { useCallback, useState } from "react";

import { SaveStatePill } from "@/components/editor/save-state-pill";

export type EditorSaveState = "SAVED" | "UNSAVED" | "SAVING" | "ERROR";

export interface EditorSaveControlProps {
  readonly projectId: string;
  readonly initialRevisionId: string;
}

/**
 * Client island that owns the editor's save state.
 *
 * Save is an explicit checkpoint: it asks the save API route to persist the
 * current server-side document as a new immutable revision. The request carries
 * the revision the editor loaded against, so a concurrent write is rejected as
 * a stale revision instead of silently overwriting history.
 *
 * States:
 *  - SAVED:   the editor matches the revision it last loaded or wrote.
 *  - SAVING:  a write is in flight.
 *  - ERROR:   the write failed (including a stale-revision conflict).
 *  - UNSAVED: reserved for when the editor starts reporting local mutations.
 */
export function EditorSaveControl({ projectId, initialRevisionId }: EditorSaveControlProps) {
  const [state, setState] = useState<EditorSaveState>("SAVED");
  const [currentRevisionId, setCurrentRevisionId] = useState(initialRevisionId);
  const [lastError, setLastError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    setState("SAVING");
    setLastError(null);

    try {
      const response = await fetch("/api/document/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          expectedCurrentRevisionId: currentRevisionId,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        revisionId?: string;
        error?: string;
      };

      if (response.ok && data.success && data.revisionId) {
        setCurrentRevisionId(data.revisionId);
        setState("SAVED");
        return;
      }

      setLastError(data.error ?? "Save failed.");
      setState("ERROR");
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Network error while saving.");
      setState("ERROR");
    }
  }, [projectId, currentRevisionId]);

  return (
    <div className="flex items-center gap-2">
      <SaveStatePill state={state} />
      {state === "ERROR" && lastError && (
        <span className="font-mono text-[10px] text-red-400">{lastError}</span>
      )}
      <SaveButton state={state} onSave={handleSave} />
    </div>
  );
}

function SaveButton({
  state,
  onSave,
}: {
  readonly state: EditorSaveState;
  readonly onSave: () => void;
}) {
  const saving = state === "SAVING";

  return (
    <button
      type="button"
      disabled={saving}
      onClick={onSave}
      className="
        border border-transparent px-2.5 py-1 text-[12px] text-canvas-muted
        transition-colors hover:border-canvas-line hover:text-canvas-ink
        disabled:cursor-not-allowed disabled:opacity-40
      "
      title={
        saving
          ? "Saving..."
          : state === "ERROR"
            ? "Save failed — retry"
            : "Save current document as a new revision"
      }
    >
      {saving ? "Saving..." : "Save"}
    </button>
  );
}
