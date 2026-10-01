# Agent Rules

These rules are binding for every human and every AI agent working in this
repository. They exist because the product's credibility depends on designs
staying structured and editable.

If a rule blocks a task, the rule is not silently ignored — raise it, explain
the conflict, and let the architecture documents be amended deliberately.

## 1. Never flatten an editable design into a single image

A design must never be represented primarily as one flattened image.

- AI output is a structured document: a canvas, layers, and objects.
- A rendered bitmap is always a projection of the document, never its source of
  truth.
- Generated image assets are welcome — as image layers inside the document.
- If a proposed design is "just a picture", the proposal is wrong.

This is the defining rule of the product.

## 2. Every editable design element must have a stable ID

- Every canvas, layer, group, and object carries an identifier.
- IDs are unique within a document, opaque, and survive edits, reordering,
  grouping, serialization, and AI operations.
- Nothing may address an element by index, name, or screen position.

## 3. Design documents must be serializable

- A document must round-trip losslessly through serialization.
- No functions, class instances, or runtime handles may live in document data.
- If it cannot be serialized, it is not part of the document.

## 4. Editor state must be separated from AI state

- Document state, editor state, and AI state are three distinct things.
- Selection, viewport, zoom, and panel layout are editor state. They never enter
  a document.
- Conversation and model context are AI state. They never enter a document or
  editor state.
- Undoing an AI change must not rewind the conversation, and reloading a
  document must not restore a chat.

## 5. AI must operate through controlled design operations

- The AI proposes typed operations; it never mutates state directly.
- Operations are validated against the schema and the layer-system invariants
  before they are applied.
- AI capability is exactly the registered operation surface — nothing more.
- Every AI change is attributable and reversible as a change set.

## 6. Do not introduce unnecessary dependencies

- Prefer the standard library and existing packages.
- Verify a library is already used before reaching for it.
- Every dependency must justify itself in review: what it replaces, what it
  costs, and why the existing stack cannot do the job.
- No dependency may be added "for later".

## 7. Do not rewrite working architecture without justification

- Working, tested code is not refactored on a whim.
- A rewrite requires a written reason: the concrete problem, the alternatives,
  and why they were rejected.
- Prefer incremental change over replacement.

## 8. Keep the architecture modular

- Each package owns one responsibility and exposes a narrow public API.
- Respect the dependency direction in `docs/ARCHITECTURE.md`; dependencies point
  towards the domain.
- No package reaches into another package's internals, and no package imports
  the application.

## 9. TypeScript strict mode should remain enabled

- `strict` stays on in `tsconfig.base.json`, along with the additional checks
  already configured there.
- Do not silence errors with `any`, `@ts-ignore`, or `@ts-expect-error` without
  a comment explaining why and an issue tracking the fix.
- A type error is a design signal, not an obstacle.

## 10. Significant functionality requires tests

- Anything non-trivial ships with tests.
- Domain logic (schema, engine, typography, color, export) is pure and must be
  unit-tested: inputs in, outputs asserted.
- Invariants get explicit tests — especially the layer-system invariants.
- Trivial configuration and styling do not require tests, and tests must not be
  written for behaviour that does not exist yet.

## 11. Run linting and type checking before completing a milestone

```
pnpm lint
pnpm typecheck
```

Both must pass with no errors before a milestone is called done.

## 12. Run the production build before declaring the milestone complete

```
pnpm build
```

A milestone is not complete until the production build succeeds.

## 13. Do not implement future features prematurely

- Build only what the current milestone requires.
- Do not add extension points, abstractions, or "just in case" parameters for
  milestones that have not started.
- Do not create fake AI behaviour, fake editor behaviour, or placeholder
  functionality that appears to work.
- The roadmap in `docs/DEVELOPMENT_ROADMAP.md` is the order of work.

## 14. Follow the project's architecture documents

- `docs/PRODUCT_SPEC.md` — what the product is.
- `docs/ARCHITECTURE.md` — system structure and dependency direction.
- `docs/LAYER_SYSTEM.md` — the document and layer model.
- `docs/DESIGN_ENGINE.md` — the operation model.
- `docs/AI_SYSTEM.md` — AI boundaries and state separation.
- `docs/DEVELOPMENT_ROADMAP.md` — the milestone sequence.

When code and documentation disagree, the disagreement is a bug. Fix whichever
is wrong — in the same change.

## Definition of done

For any change: it builds, it type-checks, it lints, it is tested where the
change is significant, it respects these rules, and it matches the architecture
documents.
