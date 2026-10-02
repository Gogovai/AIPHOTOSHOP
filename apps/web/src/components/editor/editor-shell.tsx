import { EditorCanvas } from "@/components/editor/editor-canvas";
import { EditorSidebar } from "@/components/editor/editor-sidebar";
import { EditorStatusBar } from "@/components/editor/editor-status-bar";
import { EditorTopBar } from "@/components/editor/editor-top-bar";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { DEMO_DOCUMENT } from "@/components/editor/demo-document";
import { createEditorState } from "@/components/editor/editor-state";

/**
 * The full editor layout: top bar, tool rail, canvas viewport, right sidebar
 * (layers + inspector), status bar. Composition only — each region owns its
 * own markup, so the layout scales without rewriting.
 *
 * The document comes from the in-memory demo (persistence arrives later) and
 * is passed down read-only. Editor state — selection, tool, viewport — lives
 * beside it and is never written into the document.
 */
export function EditorShell({ projectId }: { projectId: string }) {
  const { document, selectedNodeId } = DEMO_DOCUMENT;
  const state = createEditorState({ selectedNodeIds: [selectedNodeId] });

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas text-canvas-ink">
      <EditorTopBar projectId={projectId} documentName={document.name} />

      <div className="flex min-h-0 flex-1">
        <EditorToolbar />
        <main aria-label="Editor workspace" className="flex min-w-0 flex-1">
          <EditorCanvas document={document} />
          <EditorSidebar document={document} state={state} />
        </main>
      </div>

      <EditorStatusBar document={document} state={state} />
    </div>
  );
}
