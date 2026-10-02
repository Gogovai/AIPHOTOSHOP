import { EditorCanvas } from "@/components/editor/editor-canvas";
import { EditorStatusBar } from "@/components/editor/editor-status-bar";
import { EditorSidebar } from "@/components/editor/editor-sidebar";
import { EditorTopBar } from "@/components/editor/editor-top-bar";
import { EditorToolbar } from "@/components/editor/editor-toolbar";

/**
 * The full editor layout: top bar, tool rail, canvas viewport, right sidebar
 * (layers + inspector), status bar. Composition only — each region owns its
 * own markup, so the layout scales without rewriting.
 *
 * Page-level scrolling is disabled on desktop (`h-dvh overflow-hidden`); the
 * canvas viewport scrolls internally when the artboard exceeds the viewport.
 * The status bar hides on short viewports to keep the workspace usable.
 */
export function EditorShell({ projectId }: { projectId: string }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas text-canvas-ink">
      <EditorTopBar projectId={projectId} />

      <div className="flex min-h-0 flex-1">
        <EditorToolbar />
        <main aria-label="Editor workspace" className="flex min-w-0 flex-1">
          <EditorCanvas />
          <EditorSidebar />
        </main>
      </div>

      <EditorStatusBar />
    </div>
  );
}
