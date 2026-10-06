# Design Engine

> Status: the structural operation set is implemented (Milestone 003) in
> `@aiphotoshop/design-engine`. The operation pipeline, change sets, undo/redo,
> and the persistence pipeline are implemented (Milestone 004) in
> `@aiphotoshop/document-store`, built on top of the engine without duplicating
> its mutations. Transform, style, text, image, vector, and document operations
> are _planned_ — see `docs/DEVELOPMENT_ROADMAP.md`.

## Responsibility

The design engine is the only component permitted to change a design document.

Every mutation in the product — whether a designer dragging a layer or the AI
rewriting a headline — is expressed as a **design operation** and executed here.

Because there is exactly one mutation path, changes are uniform, validatable,
loggable, undoable, and testable.

## Why operations instead of direct mutation

Direct mutation of shared state is impossible to review. If the AI could assign
to a property directly:

- nothing could validate the change before it happened;
- nothing could describe the change to the user;
- nothing could undo it precisely;
- nothing could replay it for a deterministic test.

An operation solves all four problems at once. It is the unit of change, the
unit of review, and the unit of history.

## Operation shape

An operation is plain, serializable data. The implemented structural set is the
`DocumentOperation` discriminated union:

```
{ "operation": "renameNode", "nodeId": "<stable node id>", "name": "SOLSTICE" }
{ "operation": "reorderNode", "nodeId": "<stable node id>", "index": 0 }
{ "operation": "reparentNode", "nodeId": "<id>", "parentId": "<id>" }
```

Every operation has:

| Field                | Meaning                                         |
| -------------------- | ----------------------------------------------- |
| `operation`          | A registered operation name.                    |
| `nodeId` / `nodeIds` | The stable id(s) of the affected node(s).       |
| remaining            | Operation-specific, schema-validated arguments. |

The same changes are also exposed as typed functions — `addNode(doc, node)`,
`removeNode(doc, id)`, `renameNode`, `reparentNode`, `reorderNode`, `groupNodes`,
`ungroupNode`, `setVisibility`, `setLocked` — and `applyOperation` dispatches the
union to them. Operations are data, not callbacks, so they can be logged,
diffed, stored, and replayed.

## Applying an operation

Applying an operation is a pipeline:

1. **Validate** — the operation is known and its arguments are well-formed.
2. **Resolve** — the target node exists and is a valid parent/child position.
3. **Precheck** — the move is legal (no cycles, no moving the root, valid
   sibling index) and the resulting document would satisfy every layer-system
   invariant.
4. **Apply** — return a new document; the input is never mutated.
5. **Record** — `applyOperationWithRecord` re-validates the result and returns
   the `previousDocument` / `nextDocument` pair used by change sets and history.

If any stage fails the engine throws a `DesignEngineError` with a stable code
(`NODE_NOT_FOUND`, `ROOT_PROTECTED`, `INVALID_MOVE`, …) and the input document is
unchanged. Operations are all-or-nothing.

### Orchestration layer (Milestone 004)

`@aiphotoshop/document-store` wraps the engine with the pipeline the rest of the
system uses. It never re-implements a mutation: every step ultimately calls
`applyOperation` from `@aiphotoshop/design-engine`.

```
DocumentOperation
      ↓  validate + resolve + precheck        (design-engine)
      ↓  apply → new DesignDocument            (design-engine)
      ↓  validate resulting document           (design-schema)
      ↓  record { previousDocument, nextDocument }
```

- `applyOperationWithRecord(previous, operation)` returns an `AppliedOperation`
  with enough information to support undo, redo, history, and future AI review.
- `prepareChangeSet(changeSet)` resolves a stored change set into concrete
  operations; incomplete or unknown recorded operations throw rather than
  applying a half-specified edit.
- `applyChangeSet(document, prepared)` runs every operation through the full
  pipeline and records each one.

## Immutability and revisions

Applying an operation produces a **new document revision**. The previous
revision remains valid.

This gives the product, for free:

- reliable undo and redo;
- a history the user can inspect;
- the ability to diff two revisions;
- safe concurrent reasoning about a document while it is being edited.

## History and change sets

A user instruction such as "make the headline smaller and move the logo up" maps
to a **change set**: an ordered list of operations marked with its origin
(`user`, `system`, or `restore`), an optional description, and an id.

The change set is the unit of undo. Undoing an AI change set removes exactly the
changes the AI made, without touching the designer's own edits. Change sets can
be previewed (`previewChangeSet`), applied (`applyChangeSet`), and summarized
(`summaryFromChangeSet`) — the boundary future AI milestones use to emit changes
without ever touching React state, database rows, or document JSON directly.

### Undo / redo

`createHistory()` returns a document-level `History`:

```
   past          present         future
   [A]  →  [B]  →  [C]
```

`apply` records a change set and discards the redo branch; `undo` and `redo`
move between immutable `DesignDocument` values. Every id is preserved and no
historical document is mutated. History operates on the document/change layer
only — it never touches React state, viewport, or selection.

This is **local editing history**. It is deliberately distinct from the
**persistent revision history** in the repository: undo/redo do not create
database revisions, and a save captures the current state as a new revision.

## Operation families

| Family    | Status      | Examples                                                                              |
| --------- | ----------- | ------------------------------------------------------------------------------------- |
| Structure | implemented | add node, remove node, rename, reorder, group, ungroup, reparent, set visibility/lock |
| Transform | _planned_   | translate, rotate, scale, align, distribute                                           |
| Style     | _planned_   | set fill, set stroke, set opacity, set blend mode, set radius                         |
| Text      | _planned_   | set content, set style, set box, set alignment                                        |
| Image     | _planned_   | set asset, crop, apply mask, set adjustment                                           |
| Vector    | _planned_   | set path, boolean operation, set node handles                                         |
| Document  | _planned_   | resize canvas, set background, set color space                                        |

The list is closed and versioned. AI capability is exactly the set of registered
operations — no more.

## Validation rules

An operation is rejected when:

- its type is unknown;
- its payload fails schema validation;
- its target does not exist or was removed by an earlier operation in the set;
- its target is locked;
- it would violate an invariant from `docs/LAYER_SYSTEM.md`;
- it references an asset that does not exist.

Rejections are diagnosable: the engine reports which rule failed so the AI layer
can correct itself rather than retry blindly.

## Determinism

Given the same starting revision and the same operation list, the engine must
produce an identical resulting revision. No timestamps, random values, or
environment-dependent behaviour may leak into the document. Structural
operations never touch `metadata.updatedAt`; they only change the node map.

This property is what makes AI-generated designs reviewable and regression-
testable.

## What the engine does not do

- It does not render. Rendering belongs to the editor canvas and the export
  engine.
- It does not persist. Storage is separate.
- It does not call a model. It executes operations that the AI layer produced.
- It does not hold editor state such as selection or viewport.

## Testing

The engine is pure: a document revision in, a document revision out. Every
operation family is covered by tests that assert the resulting revision, and by
invariant tests that assert rejection of invalid operations.
