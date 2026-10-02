import type { DesignDocument, NodeType } from "@aiphotoshop/design-schema";

import { EyeOffIcon, LockIcon } from "@/components/editor/editor-icons";
import { isNodeSelected, type EditorState } from "@/components/editor/editor-state";
import { flattenLayerTree } from "@/components/editor/layer-tree";

/**
 * The layers panel, now driven by the real design document. Rows are a
 * depth-first projection of the document tree; selection comes from editor
 * state. Visibility, lock, and selection are displayed but not interactive —
 * no layer operations or drag-and-drop are part of this milestone.
 */
const KIND_LABEL: Record<NodeType, string> = {
  canvas: "CANVAS",
  group: "GROUP",
  image: "IMAGE",
  text: "TEXT",
  shape: "SHAPE",
  svg: "SVG",
};

export function LayersPanel({
  document: doc,
  state,
}: {
  document: DesignDocument;
  state: EditorState;
}) {
  const layers = flattenLayerTree(doc);

  return (
    <section aria-label="Layers" className="flex min-h-0 flex-col">
      <h2 className="border-b border-canvas-line px-3 py-2 font-mono text-[10px] tracking-[0.18em] text-canvas-muted">
        LAYERS
      </h2>

      <ul role="listbox" aria-label="Layers list" className="overflow-y-auto py-1">
        {layers.map((layer) => {
          const selected = isNodeSelected(state, layer.id);
          return (
            <li
              key={layer.id}
              role="option"
              aria-selected={selected}
              className={`flex items-center gap-2 border-l-2 py-1.5 pr-3 text-[11px] ${
                selected
                  ? "border-accent bg-accent-soft/40 text-canvas-ink"
                  : "border-transparent text-canvas-muted"
              }`}
              style={{ paddingLeft: 10 + layer.depth * 14 }}
            >
              <span
                className={`w-12 shrink-0 font-mono text-[9px] tracking-[0.1em] ${
                  selected ? "text-accent" : "text-canvas-muted"
                }`}
              >
                {KIND_LABEL[layer.type]}
              </span>

              <span className={`truncate ${layer.visible ? "" : "opacity-50"}`}>{layer.name}</span>

              <span className="ml-auto flex shrink-0 items-center gap-1 text-canvas-muted">
                {!layer.visible && (
                  <EyeOffIcon
                    aria-label={`${layer.name} hidden`}
                    className="size-3"
                    data-testid="layer-hidden"
                  />
                )}
                {layer.locked && (
                  <LockIcon
                    aria-label={`${layer.name} locked`}
                    className="size-3"
                    data-testid="layer-locked"
                  />
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
