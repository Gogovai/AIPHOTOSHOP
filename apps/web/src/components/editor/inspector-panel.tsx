import type { DesignDocument } from "@aiphotoshop/design-schema";

import type { EditorState } from "@/components/editor/editor-state";

/**
 * The inspector, driven by the real selected node.
 *
 * It reads name, type, visibility, and lock from the design document. Values
 * are display-only: this milestone adds no editable controls and no fake
 * numeric inputs. When nothing is selected it says so instead of inventing data.
 */
export function InspectorPanel({
  document: doc,
  state,
}: {
  document: DesignDocument;
  state: EditorState;
}) {
  const selectedId = state.selectedNodeIds[0];
  const node = selectedId === undefined ? undefined : (doc.nodes?.[selectedId] ?? undefined);

  return (
    <section aria-label="Inspector" className="flex min-h-0 flex-col overflow-y-auto">
      <h2 className="border-b border-canvas-line px-3 py-2 font-mono text-[10px] tracking-[0.18em] text-canvas-muted">
        INSPECTOR
      </h2>

      <div className="space-y-4 px-3 py-3">
        {node === undefined ? (
          <p className="text-[11px] leading-5 text-canvas-muted">
            Select a layer to inspect its properties.
          </p>
        ) : (
          <div>
            <p className="font-mono text-[9px] tracking-[0.18em] text-accent">
              {node.type.toUpperCase()}
            </p>
            <dl className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1.5">
              <Field label="Name" value={node.name} />
              <Field label="Type" value={node.type} />
              <Field label="Visibility" value={node.visible ? "Visible" : "Hidden"} />
              <Field label="Locked" value={node.locked ? "Locked" : "Unlocked"} />
            </dl>
          </div>
        )}

        <div>
          <p className="font-mono text-[9px] tracking-[0.18em] text-canvas-muted">DOCUMENT</p>
          <dl className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1.5">
            <Field label="Nodes" value={String(Object.keys(doc.nodes ?? {}).length)} />
            <Field
              label="Canvas"
              value={`${doc.canvas?.width ?? 0} × ${doc.canvas?.height ?? 0}`}
            />
          </dl>
        </div>
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-[10px] text-canvas-muted">{label}</dt>
      <dd className="truncate font-mono text-[10px] text-canvas-ink">{value}</dd>
    </div>
  );
}
