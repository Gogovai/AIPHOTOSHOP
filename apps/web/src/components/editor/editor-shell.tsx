import { EditorCanvas } from "@/components/editor/editor-canvas";
import { EditorSidebar } from "@/components/editor/editor-sidebar";
import { EditorStatusBar } from "@/components/editor/editor-status-bar";
import { EditorTopBarWithSaveControl } from "@/components/editor/editor-top-bar";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { createEditorState } from "@/components/editor/editor-state";
import type { DesignDocument } from "@aiphotoshop/design-schema";

// NOTE: M003's demo document intentionally carries a full, real layer tree.
// Importing it directly would add a hard runtime dependency on the demo builder,
// so the shell keeps its own minimal fallback only for isolation scenarios
// (for example when rendered without a repository). In the editor routes the
// document always comes from the repository, never from this fallback.
const UNSAFE_DEMO_DOCUMENT: DesignDocument = {
  id: "demo" as unknown as DesignDocument["id"],
  version: 1,
  name: "Untitled Design",
  canvas: { width: 1080, height: 1350, background: "#ffffff" },
  rootNodeId: "node-root" as unknown as DesignDocument["rootNodeId"],
  metadata: {
    createdAt: "2026-10-02T00:00:00.000Z",
    updatedAt: "2026-10-02T00:00:00.000Z",
    source: "aiphotoshop",
  },
  nodes: {},
};

/**
 * The full editor layout: top bar, tool rail, canvas viewport, right sidebar
 * (layers + inspector), status bar. Composition only — each region owns its
 * own markup, so the layout scales without rewriting.
 *
 * The document is loaded by the route from the repository (in-memory for local
 * development, Supabase in production). Editor state — selection, tool,
 * viewport — lives beside it and is never written into the document.
 *
 * Persistence state (SAVED / UNSAVED / SAVING / ERROR) is owned by the top
 * bar's client island, which calls the save API route. The shell only passes
 * serializable props, so it can stay a server component.
 */
export function EditorShell({
  projectId,
  revisionId,
  document,
}: {
  projectId: string;
  revisionId?: string;
  document?: DesignDocument;
}) {
  const doc = (document ?? UNSAFE_DEMO_DOCUMENT) as DesignDocument;
  const state = createEditorState({
    selectedNodeIds: [doc.rootNodeId],
  });

  const effectiveRevisionId = revisionId ?? "rev-0";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas text-canvas-ink">
      <EditorTopBarWithSaveControl
        projectId={projectId}
        revisionId={effectiveRevisionId}
        documentName={doc.name}
      />

      <div className="flex min-h-0 flex-1">
        <EditorToolbar />
        <main aria-label="Editor workspace" className="flex min-w-0 flex-1">
          <EditorCanvas document={doc} />
          <EditorSidebar document={doc} state={state} />
        </main>
      </div>

      <EditorStatusBar document={doc} state={state} />
    </div>
  );
}
