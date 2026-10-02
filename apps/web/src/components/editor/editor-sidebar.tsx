import { InspectorPanel } from "@/components/editor/inspector-panel";
import { LayersPanel } from "@/components/editor/layers-panel";

/**
 * Right workspace: layers on top, inspector below. Stacked so each panel
 * scrolls independently — the arrangement scales to real panels later without
 * structural change.
 */
export function EditorSidebar() {
  return (
    <aside
      aria-label="Layers and inspector"
      className="flex w-64 shrink-0 flex-col border-l border-canvas-line bg-canvas max-md:hidden lg:w-72"
    >
      <div className="flex min-h-0 flex-[3] flex-col">
        <LayersPanel />
      </div>
      <div className="flex min-h-0 flex-[2] flex-col border-t border-canvas-line">
        <InspectorPanel />
      </div>
    </aside>
  );
}
