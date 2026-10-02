# Design Engine

> Status: the structural operation set is implemented (Milestone 003) in
> `@aiphotoshop/design-engine`. Transform, style, text, image, vector, and
> document operations, plus history/change sets and the persistence pipeline,
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
5. **Record** — append to the history entry for this change set. _(Planned,
   Milestone 004.)_

If any stage fails the engine throws a `DesignEngineError` with a stable code
(`NODE_NOT_FOUND`, `ROOT_PROTECTED`, `INVALID_MOVE`, …) and the input document is
unchanged. Operations are all-or-nothing.

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
(`human` or `ai`).

The change set is the unit of undo. Undoing an AI change set removes exactly the
changes the AI made, without touching the designer's own edits.

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
