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
│   ├── ai-core/              Intent → validated operations
│   ├── typography-engine/    Fonts, text layout, type scales
│   ├── color-engine/         Color spaces, palettes, contrast
│   ├── export-engine/        Raster and vector output
│   └── ui/                   Shared primitives and design tokens
├── docs/
├── tests/                    Cross-cutting test suite
├── assets/
├── supabase/                 Reserved for later milestones
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
- `ai-core` depends on `design-schema` and `design-engine` (to validate
  operations) but never on rendering.
- `export-engine` depends on `design-schema` (and later on typography and color
  for correct output).
- `ui` depends on nothing domain-specific.
- `apps/web` composes everything.

At Milestone 001 these packages are boundaries only; no dependency between them
has been introduced yet.

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

`apps/web` gains an editor shell: a canvas renderer, a layers panel, a
properties inspector, a toolbar, and an AI interaction surface. The renderer
reads the document and draws it; it never becomes the document.

### Design document system

`design-schema` publishes the real document model. `design-engine` publishes the
operation set. Together they provide create, transform, reorder, group, align,
and style operations that always produce a new document revision.

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

`supabase/` holds the schema and migrations for storing documents, versions, and
assets. Persistence is introduced only at the milestone that needs it.

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

## Deliberate constraints at Milestone 001

- No rendering library is installed.
- No AI provider is integrated.
- No Supabase project is connected.
- No editor code exists.

These are staged, not forgotten. See `docs/DEVELOPMENT_ROADMAP.md`.
