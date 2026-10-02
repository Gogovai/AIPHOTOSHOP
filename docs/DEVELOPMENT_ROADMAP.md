# Development Roadmap

Milestones are sequential. A milestone is complete only when it is implemented,
tested, type-checked, linted, and building. No milestone begins before the
previous one is complete.

## Milestone 001 — Project foundation ✅

**Goal:** a clean, professional foundation with no product functionality.

**Scope**

- pnpm + Turborepo monorepo with `apps/web` and seven packages.
- Strict TypeScript, ESLint, Prettier, Vitest.
- Minimal professional product surface.
- Product and architecture documentation, and agent rules.

**Done when:** `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test` and
`pnpm build` all succeed.

---

## Milestone 002 — Editor shell ✅

**Goal:** the editor exists as a shell with no real document behind it.

**Scope**

- Application layout: canvas area, layers panel, properties inspector, toolbar.
- Editor state store (selection, viewport, zoom, active tool) kept strictly
  separate from any document.
- Keyboard and pointer interaction scaffolding.
- Empty states that describe what will appear there.

**Delivered**

- Editor route `/editor/[projectId]` (any id loads; no lookup yet).
- Professional shell: top application bar, tool rail, canvas viewport with a
  centered 1080 × 1350 artboard, layers panel, inspector, status bar.
- Components under `apps/web/src/components/editor/`; the route composes the
  shell, and `"use client"` is limited to the tool-rail island.
- Panels render labelled structural placeholder rows and `—` field values;
  `design-schema` and the packages are untouched.
- Shell states (active tool highlight, layer visibility/lock/selection marks)
  are view-only and provably separate from document state, which does not
  exist yet.

**Not yet implemented (by design)**

- Real document state, real layers, rendering engine, selection, transforms,
  editing, undo/redo, AI, persistence, export.

**Done when:** the editor shell renders, resizes correctly, and its state is
provably independent of document state.

---

## Milestone 003 — Layer engine

**Goal:** a real layer tree that can be created, inspected, and reordered.

**Scope**

- `design-schema` publishes the node model from `docs/LAYER_SYSTEM.md`.
- `design-engine` publishes structural operations: add, remove, reorder, group,
  ungroup, reparent.
- Stable IDs and serialization round-trips.
- The layers panel renders the actual tree.

**Done when:** a document round-trips through serialization with identical IDs,
and every invariant in `docs/LAYER_SYSTEM.md` is covered by tests.

---

## Milestone 004 — Design document system

**Goal:** documents become real, persistent artifacts.

**Scope**

- Document creation, loading, saving, and version history.
- Supabase schema and migrations in `supabase/`.
- The full operation pipeline: validate, resolve, precheck, apply, record.
- Change sets, undo, and redo.

**Done when:** a document survives save, reload, and version restore, and every
operation is undoable.

---

## Milestone 005 — Typography engine

**Goal:** text behaves like a professional tool, not a label.

**Scope**

- Font resolution, weights, and fallbacks.
- Text measurement, line breaking, alignment, and optical adjustments.
- Typographic scales shared with the UI.
- Text node rendering on the canvas.

**Done when:** text lays out deterministically and is covered by layout tests.

---

## Milestone 006 — Professional design tools

**Goal:** the core toolkit a designer expects.

**Scope**

- Transform, align, distribute, and snapping.
- Shape and vector primitives, path editing foundations.
- Fill, stroke, gradients, opacity, and blend modes.
- Canvas rendering driven by the document.

**Done when:** a designer can build a real poster by hand using only the editor.

---

## Milestone 007 — AI design director

**Goal:** AI that understands and works across a whole document.

**Scope**

- Structured document description for the model.
- Tool registry exposing the operation surface.
- Planning and proposal generation for document-scale intent.
- Review, accept, and undo of AI change sets.

**Done when:** a prompt produces a structured, editable, multi-layer design that
a designer can restyle and export. Never a single flattened image.

---

## Milestone 008 — AI layer manipulation

**Goal:** precise, targeted AI edits.

**Scope**

- Address specific nodes by stable ID.
- Style, text, transform, and structure edits on existing documents.
- Bounded retry with structured validation feedback.

**Done when:** "make this headline bigger and recolor the logo" changes exactly
those nodes and nothing else.

---

## Milestone 009 — Reference analysis

**Goal:** learn from supplied references.

**Scope**

- Ingest reference images and designs.
- Infer layout, palette, and typographic structure.
- Apply learned structure to a new document as reversible operations.

**Done when:** a reference produces a structurally comparable but independent
document, with human review of each extracted decision.

---

## Milestone 010 — Asset intelligence

**Goal:** assets that are chosen and placed meaningfully.

**Scope**

- Asset search, evaluation, and ranking for a design context.
- Placement that respects composition, aspect ratio, and safe areas.
- Generated assets as image layers, never as the design itself.

**Done when:** asset selection is justified and every placement is an editable
image layer.

---

## Milestone 011 — Export engine

**Goal:** professional, reproducible output.

**Scope**

- Raster export at target size, density, and color profile.
- Vector export preserving object structure.
- Preflight diagnostics: missing fonts, unsupported effects, overflow.
- Batch and per-layer export.

**Done when:** exports are deterministic for a given document revision and the
document remains fully editable afterwards.

---

## Milestone 012 — Advanced vector tools

**Goal:** real vector work.

**Scope**

- Bezier path editing with precise handles.
- Boolean operations, compound paths, and outlines.
- Vector effects and strokes with caps, joins, and dashes.

**Done when:** illustrations can be authored entirely inside the product.

---

## Milestone 013 — Photo editing

**Goal:** credible image work on image layers.

**Scope**

- Non-destructive adjustments and adjustment layers.
- Masking, feathering, and refinement.
- Retouching, healing, and composite blending.

**Done when:** adjustments remain editable and re-editable on a saved document.

---

## Milestone 014 — Brand system

**Goal:** consistent identity at scale.

**Scope**

- Brand kits: colors, fonts, logos, spacing, and rules.
- Enforcement and drift reporting across documents.
- Document templates derived from a brand.

**Done when:** a brand kit is enforced across documents with clear, reviewable
drift reports.

---

## Milestone 015 — Motion design

**Goal:** the same layered document, animated.

**Scope**

- Timeline bound to existing layers and objects.
- Keyframes on transform, opacity, and effect parameters.
- Motion presets and easing, plus video export.

**Done when:** an animated deliverable is produced from the same document model
that drives static design.
