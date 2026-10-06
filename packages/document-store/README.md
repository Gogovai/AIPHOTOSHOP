# `@aiphotoshop/document-store`

Typed persistence boundary for design documents: repositories, revisions, change sets, and undo/redo history.

## Architecture

```
                ┌──────────────────┐
                │   DesignDocument │   canonical model (design-schema)
                └────────┬─────────┘
                         │ serialize / deserialize
                ┌────────▼─────────┐
                │  DocumentRepository       persistence boundary
                └───────┬──────────┘
                        │
                ┌──────▼──────┐
                │   Supabase   │   one implementation; never the canonical model
                └─────────────┘
```

This package owns:

- The `DocumentRepository` interface plus two implementations: an in-memory
  repository for local development and tests, and a Supabase-backed one for
  production.
- `Revision`, `RevisionSummary`, and `ChangeSet` value types.
- Typed errors for persistence failures.
- The operation pipeline, change sets, and undo/redo history over the
  in-memory document, keeping the document and editor state separate.

It never contains layer manipulation logic: mutations always flow through
`@aiphotoshop/design-engine` (`applyOperation`). It only stores serialized
`DesignDocument` revisions.

## Implementations

### `InMemoryDocumentRepository`

In-memory `DocumentRepository` implementation. Primarily intended for local
development and tests. It is deterministic, fast, and does not depend on
external infrastructure, so it is the right default when Supabase is not
configured. It is NOT a durable production store: data lives only for the life
of the process and does not survive restarts or shared access.

In production, this implementation must be replaced by the Supabase-backed
repository.

### Supabase-backed repository

`createSupabaseDocumentRepository(...)` returns a `DocumentRepository` that
stores serialized `DesignDocument` revisions in PostgreSQL. The editor never
imports this implementation directly; the application composes the right
implementation and passes a `DocumentRepository` to the editor.

## ChangeSet vs RevisionSummary

These two types are intentionally different and should not be used
interchangeably.

### `ChangeSet` — executable

A `ChangeSet` is an **executable** set of complete operations. Every
`ChangeSetOperation` carries the full payload needed to reconstruct and apply
the corresponding `DocumentOperation` through the design engine. ChangeSets are
the unit of undo and the boundary that future AI milestones use to emit changes.

Because `ChangeSetOperation` is a complete discriminated union (mirroring
`DocumentOperation`), change-set conversion to engine operations is a structural
pass-through through the single boundary function
`changeSetOperationToDocumentOperation`. There are no placeholder values, no
`as never` casts, and no partially-specified operations in a correctly built
`ChangeSet`.

### `RevisionSummary` — lightweight metadata, not executable

A `RevisionSummary` is **lightweight metadata** describing a persisted revision:
its source, operation count, an optional list of operation names, and an optional
human description. It is suitable for listing and audit, but it is NOT
executable by itself.

A `RevisionSummary` does not contain full operation payloads. Repositories that
only have a `RevisionSummary` should store it as change-set metadata, not as a
fabricated executable change set.

## When to use which

- Use `ChangeSet` when you need to apply, undo, or preview changes.
- Use `RevisionSummary` when you only need audit/list metadata for a revision.
- Do not pretend a `RevisionSummary` is an executable `ChangeSet` by
  constructing placeholder operations. If executable behavior is required,
  build a real `ChangeSet` with complete `ChangeSetOperation` payloads.

## Conversion boundary

`changeSetOperationToDocumentOperation(...)` is the single conversion boundary
between the change-set representation and the engine's operation type. Every
`ChangeSetOperation` carries the full payload, so this conversion is a
structural mapping with no placeholder values and no unsafe casts.

## Editor integration

The editor talks to a `DocumentRepository`, never to Supabase directly. The
server-side composition point chooses the Supabase-backed repository when Supabase
URL + key are present, otherwise the shared in-memory repository is used for
local development and tests. The in-memory repository is the right fallback for
development, but it is not a replacement for durable Supabase persistence in
production.
