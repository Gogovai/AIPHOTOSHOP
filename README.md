# AIPHOTOSHOP

**AI-native professional design.**

AIPHOTOSHOP is a professional design environment where AI creates, understands,
modifies, and improves professional graphic designs while preserving complete
human control over editable layers and design objects.

## Vision

AI generates and manipulates a **structured, editable design** — real layers and
real objects with stable identity — rather than a flattened picture.

```
Design Document
├── Canvas
├── Background Layer
├── Image Layer
├── Text Layer
├── Shape Layer
├── SVG Layer
├── Group Layer
└── other editable objects
```

A generated design is never represented primarily as a single image. Rendering
and export are projections of the document; the document is the source of truth.
That is what keeps AI output retypeable, restylable, reorderable, and
reversible — and it is the difference between this product and an image
generator.

Read the full product specification in [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md).

## Current milestone

**Milestone 004 — Design document system.** Complete.

This repository currently contains the foundation, the professional editor
shell, the structured layer engine, and real document persistence:

- the pnpm + Turborepo monorepo and its package boundaries;
- strict TypeScript, ESLint, Prettier, and a Vitest harness;
- the editor shell at `/editor/[projectId]`, loading a real document from the
  repository and saving it as a new revision;
- `@aiphotoshop/design-schema`: the normalized, serializable document and node
  model with stable opaque ids;
- `@aiphotoshop/design-engine`: deterministic structural operations that return
  a new document;
- `@aiphotoshop/document-store`: the persistence boundary — repositories,
  immutable revisions, change sets, and undo/redo — with an in-memory
  implementation and a Supabase-backed one;
- the Supabase schema and migrations in `supabase/`;
- the product, architecture, and layer-system documentation.

No Supabase project is connected in this environment, so the running app uses
the in-memory repository; the Supabase implementation is complete but not
exercised without credentials. Canvas rendering, transforms, editing
interactions, AI, and export are **deliberately not implemented yet**. There is
no fake AI and no fake editor. See
[`docs/DEVELOPMENT_ROADMAP.md`](docs/DEVELOPMENT_ROADMAP.md).

## Technology stack

| Concern         | Choice                       |
| --------------- | ---------------------------- |
| Runtime         | Node.js ≥ 20.9               |
| Package manager | pnpm (workspaces)            |
| Monorepo        | Turborepo                    |
| Language        | TypeScript, strict mode      |
| Framework       | Next.js (App Router) + React |
| Styling         | Tailwind CSS v4              |
| Linting         | ESLint (flat config)         |
| Formatting      | Prettier                     |
| Testing         | Vitest                       |

## Local development

```bash
# 1. Install dependencies
pnpm install

# 2. Start the development application
pnpm dev            # http://localhost:3000
```

If `pnpm` is not available, enable it through Corepack:

```bash
corepack enable pnpm
```

### All commands

| Command             | Effect                                                |
| ------------------- | ----------------------------------------------------- |
| `pnpm dev`          | Start the development application                     |
| `pnpm build`        | Production build of every app and package             |
| `pnpm lint`         | ESLint across the workspace                           |
| `pnpm typecheck`    | TypeScript check across the workspace and root config |
| `pnpm test`         | Vitest, once                                          |
| `pnpm test:watch`   | Vitest, watch mode                                    |
| `pnpm format`       | Format the repository with Prettier                   |
| `pnpm format:check` | Verify formatting without writing                     |
| `pnpm verify`       | lint → typecheck → test → build                       |

Copy `.env.example` to `.env` when configuration is needed. Supabase is not
configured in this environment, so the application uses the in-memory document
repository.

## Architecture overview

```
AIPHOTOSHOP/
├── apps/
│   └── web/                  Next.js product surface (editor shell from M002)
├── packages/
│   ├── design-schema/        Serializable design document contract
│   ├── design-engine/        Deterministic operations on documents
│   ├── document-store/       Persistence: repositories, revisions, history
│   ├── ai-core/              Intent → validated design operations
│   ├── typography-engine/    Fonts, text layout, type scales
│   ├── color-engine/         Color spaces, palettes, contrast
│   ├── export-engine/        Raster and vector output
│   └── ui/                   Shared primitives and design tokens
├── docs/                     Product and architecture documentation
├── tests/                    Cross-cutting test suite
├── assets/                   Repository-static assets
└── supabase/                 Database schema and migrations (Milestone 004)
```

Dependencies point towards the domain: the applications compose the packages,
and no package reaches into another's internals. Each package builds
independently with `tsc`, emitting declarations to `dist/`.

Full detail in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Documentation

| Document                                                     | Contents                                  |
| ------------------------------------------------------------ | ----------------------------------------- |
| [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md)               | Product vision and capability areas       |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)               | Initial and intended future architecture  |
| [`docs/DESIGN_ENGINE.md`](docs/DESIGN_ENGINE.md)             | The operation model                       |
| [`docs/LAYER_SYSTEM.md`](docs/LAYER_SYSTEM.md)               | Layer tree, identity, and invariants      |
| [`docs/AI_SYSTEM.md`](docs/AI_SYSTEM.md)                     | AI boundaries and state separation        |
| [`docs/DEVELOPMENT_ROADMAP.md`](docs/DEVELOPMENT_ROADMAP.md) | The milestones and their current status   |
| [`docs/AGENT_RULES.md`](docs/AGENT_RULES.md)                 | Binding rules for contributors and agents |

## Development rules

The essentials; the binding list is
[`docs/AGENT_RULES.md`](docs/AGENT_RULES.md).

1. Never flatten an editable design into a single image as its primary
   representation.
2. Every editable design element must have a stable ID.
3. Design documents must be serializable.
4. Editor state must be separated from AI state.
5. AI must operate through controlled design operations.
6. Do not introduce unnecessary dependencies.
7. Do not rewrite working architecture without justification.
8. Keep the architecture modular.
9. TypeScript strict mode stays enabled.
10. Significant functionality requires tests.
11. Run linting and type checking before completing a milestone.
12. Run the production build before declaring a milestone complete.
13. Do not implement future features prematurely.
14. Follow the project's architecture documents.

## License

UNLICENSED.
