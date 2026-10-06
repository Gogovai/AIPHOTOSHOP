# Architecture

## Principles

1. **One source of truth.** The design document is the only authoritative
   representation of a design. Rendering and export are projections of it.
2. **Explicit boundaries.** Each package owns one responsibility and exposes a
   narrow public API. Packages never reach into another package's internal state.
3. **Operations, not mutation.** All changes to a document are expressed as
   typed operations that can be validated, logged, and reversed.
4. **Editor state is not document state.** Selection, viewport, zoom, and panel
   layout are editor concerns. Conversation and model context are AI concerns.
   Neither belongs in the document.
5. **Modular by construction.** Dependencies flow in one direction so the
   system can grow without becoming entangled.

## Repository layout

```
AIPHOTOSHOP/
├── apps/
│   └── web/                  Next.js product surface
├── packages/
│   ├── design-schema/        Serializable document contract
│   ├── design-engine/        Deterministic document operations
│   ├── document-store/       Persistence: repositories, revisions, history
│   ├── ai-core/              Intent → validated operations
│   ├── typography-engine/    Fonts, text layout, type scales
│   ├── color-engine/         Color spaces, palettes, contrast
│   ├── export-engine/        Raster and vector output
│   └── ui/                   Shared primitives and design tokens
├── docs/
├── tests/                    Cross-cutting test suite
├── assets/
├── supabase/                 Database schema and migrations (M004)
└── turbo.json
```

## Dependency direction

Dependencies point towards the domain, never away from it:

```
                    apps/web
                       │
        ┌──────────────┼───────────────┐
        ▼              ▼               ▼
   ai-core      design-engine      export-engine
        │              │               │
        └──────┬───────┴───────┬───────┘
               ▼               ▼
        design-schema   typography-engine / color-engine
```

Rules:

- `design-schema` depends on nothing.
- `design-engine` depends on `design-schema` only.
- `document-store` depends on `design-schema` and `design-engine` (its operation
  pipeline delegates mutations to the engine) and, for the production
  implementation, on Supabase. Nothing depends on `document-store` except the
  application.
- `ai-core` depends on `design-schema` and `design-engine` (to validate
  operations) but never on rendering.
- `export-engine` depends on `design-schema` (and later on typography and color
  for correct output).
- `ui` depends on nothing domain-specific.
- `apps/web` composes everything.

As of Milestone 004 the domain chain is real: `design-schema` publishes the
document and node model, `design-engine` depends on it, `document-store`
depends on both and adds persistence, revisions, change sets, and undo/redo, and
`apps/web` composes them to load and save a real document. `ai-core`,
`typography-engine`, `color-engine`, and `export-engine` remain boundaries only.

## Initial architecture (what exists today)

| Layer         | Technology                      | Responsibility                          |
| ------------- | ------------------------------- | --------------------------------------- |
| Workspace     | pnpm workspaces                 | Dependency and package management       |
| Orchestration | Turborepo                       | Task graph, caching, parallel execution |
| Language      | TypeScript (strict)             | Shared compiler contract                |
| Surface       | Next.js App Router + React      | Product surface                         |
| Styling       | Tailwind CSS v4                 | Design tokens and layout                |
| Quality       | ESLint (flat config) + Prettier | Static analysis and formatting          |
| Tests         | Vitest                          | Unit and integration tests              |

Each package compiles independently with `tsc` to `dist/`, emitting declarations
and source maps. The web app is built by Next.js.

## Intended future architecture

### Editor application

`apps/web` hosts the editor shell: top bar, tool rail, canvas viewport, layers
panel, inspector, and status bar. The layers panel and inspector now read a real
`DesignDocument`; selection and viewport live in a separate `EditorState` and are
never written into the document. A canvas _renderer_ is still planned — the
viewport currently shows an honest empty state.

### Design document system

`design-schema` publishes the real document and node model (canvas, group, image,
text, shape, svg) with stable opaque ids and lossless JSON serialization.
`design-engine` publishes the structural operation set (add, remove, rename,
reparent, reorder, group, ungroup, set visibility/lock) that always returns a new
document. Transform, style, and text operations are planned.

`document-store` turns that model into a versioned, persistent artifact. It owns
the persistence boundary (`DocumentRepository`), two implementations (in-memory
for local development and tests, Supabase for production), immutable revisions,
change sets, an operation/change pipeline, and undo/redo history. Persistence
code contains no layer manipulation: every mutation delegates to the design
engine.

### AI system

`ai-core` gains a document reader (compact structured description), a tool
registry (the bounded operation surface), and a planner that produces an
operation list. Every proposed operation is validated against the schema and
applied through the design engine. Conversation state lives here, not in the
document or the editor.

### Rendering and export

`export-engine` renders documents to raster and vector formats at requested
sizes, densities, and color profiles. Because it reads the document, exports are
reproducible and the design stays editable afterwards.

### Persistence

The canonical `DesignDocument` is the only document model. `supabase/` stores
**serialized revisions of it** plus the metadata needed to manage versions — it
never holds a second, competing layer model.

```
DesignDocument (canonical, design-schema)
        │  serialize / deserialize + validate
        ▼
DocumentRepository (document-store)     create · load · save ·
        │                               listRevisions · loadRevision · restore
        ▼
Supabase (PostgreSQL: documents + revisions, JSONB payloads)
```

- **Boundary.** Application and editor code depend on `DocumentRepository`, not
  on Supabase. Supabase queries live only in `document-store`.
- **Validation at the boundary.** Every stored payload is deserialized and
  validated before it is returned; a corrupt row raises a typed
  `DocumentDeserializationError` / `DocumentValidationError` instead of entering
  the editor. The repository never silently repairs data.
- **Immutable revisions.** Saving appends a new revision (`1, 2, 3, …`) with a
  unique `(document_id, revision_number)` constraint and advances the document's
  `current_revision_id`. History is never overwritten.
- **Restore is append-only.** Restoring revision N copies its document into a new
  revision N+1; later revisions stay available.
- **Atomicity.** Create, save, and restore run through SQL functions invoked via
  `rpc`, so the revision row and the current-revision pointer are written in one
  transaction and cannot diverge.
- **Optimistic concurrency.** A save carries the revision it was loaded against;
  a mismatch is rejected as a stale-revision conflict rather than overwriting
  newer work.
- **Security.** RLS is enabled and denies the public roles by default; server
  code uses the service-role key. Ownership (`owner_id`) is in the schema, ready
  for a future auth milestone.

### Motion

Motion reuses the same layered document: layers gain timeline properties and the
renderer is driven by a time value. Motion is not a separate document format.

## Cross-cutting concerns

- **Identity.** Every editable element carries a stable ID. IDs survive
  reordering, AI edits, and serialization round-trips.
- **Serialization.** Documents must round-trip losslessly through JSON.
- **Determinism.** Given the same document and the same operations, the result
  must be identical. This is what makes AI edits reviewable.
- **Testing.** Domain logic (schema, engine, typography, color) is pure and
  therefore unit-testable without a browser.

## State separation

Three kinds of state stay distinct and never leak into one another:

| State             | Lives in                           | Examples                         |
| ----------------- | ---------------------------------- | -------------------------------- |
| Document state    | `DesignDocument` (`design-schema`) | nodes, canvas, metadata          |
| Editor state      | `EditorState` (`apps/web`)         | selection, active tool, viewport |
| Persistence state | the save control / repository      | revision id, SAVED/SAVING/ERROR  |

Nothing from editor or persistence state is written into a document, and no
connection or credential state enters the design schema.

## Deliberate constraints at Milestone 004

- No rendering library is installed; the canvas does not yet draw the document.
- No AI provider is integrated; `ai-core` is still a boundary.
- Persistence is real, but Supabase is **not configured in this environment**, so
  the running app uses the in-memory repository. The Supabase implementation is
  complete and type-checked but is not exercised without credentials.
- No autosave; saving is an explicit action.
- No transforms, text layout, import/export, auth UI, or collaboration.

These are staged, not forgotten. See `docs/DEVELOPMENT_ROADMAP.md`.
