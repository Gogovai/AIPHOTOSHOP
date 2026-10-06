# Layer System

> Status: partially implemented (Milestone 003). The tree, identity, ordering,
> visibility/locking, validation, and serialization rules below are implemented
> in `@aiphotoshop/design-schema` and `@aiphotoshop/design-engine`. Persistence of
> the same model as immutable revisions is implemented (Milestone 004) in
> `@aiphotoshop/document-store`. Node kinds and capabilities marked _planned_ are
> not implemented yet.

## Purpose

The layer system is what makes a design editable. It defines how a document is
organised into layers and objects, how those elements are identified, ordered,
grouped, and transformed.

It is the reason AIPHOTOSHOP is not an image generator.

## The tree

A document is a tree rooted at a canvas.

```
Canvas
├── Layer: background        (fill)
├── Layer: photo             (image)
├── Group: headline
│   ├── Layer: title         (text)
│   └── Layer: rule          (shape)
├── Layer: logo              (svg)
└── Group: footer
    └── Layer: caption       (text)
```

Two kinds of node exist:

- **Container nodes** — the canvas and groups. They hold children and define
  positioning scope.
- **Leaf nodes** — concrete objects that render something.

## Node kinds

| Kind     | Status      | Renders                      | Key properties (implemented)                   |
| -------- | ----------- | ---------------------------- | ---------------------------------------------- |
| `canvas` | implemented | The document surface         | width, height, background, children            |
| `group`  | implemented | Nothing itself; its children | children                                       |
| `image`  | implemented | Raster image data            | src, geometry, opacity                         |
| `text`   | implemented | Typeset text                 | text, font family/size/weight, color, geometry |
| `shape`  | implemented | A geometric primitive        | kind, fill, stroke, stroke width, geometry     |
| `svg`    | implemented | Vector source                | markup, geometry                               |
| `fill`   | _planned_   | A solid or gradient area     | fill, blend mode                               |
| `mask`   | _planned_   | Alpha applied to a sibling   | mask source, feather, invert                   |
| `effect` | _planned_   | Non-destructive adjustment   | effect type and parameters                     |

Every node also carries the shared base fields: `id`, `type`, `name`,
`parentId`, `visible`, `locked`, and `opacity`. Nodes are a discriminated union
on `type`, so a leaf can never declare `children`.

The set is closed: new kinds are added deliberately, never by ad-hoc string
keys.

## Stable identity

Every node carries an identifier that is:

- **unique** within the document;
- **stable** across edits, reordering, grouping, serialization, and AI
  operation application;
- **opaque** — nothing may derive meaning from its value.

Rules:

1. AI operations address nodes by ID. They never address them by index, name, or
   screen position.
2. Renaming a layer changes its name only. The ID is untouched.
3. Moving a node within the tree does not change its ID.
4. Serializing and deserializing a document preserves every ID exactly.

Without this rule an AI edit cannot be described precisely, logged, or undone.

## Ordering

Order within a parent is meaningful: later siblings render above earlier ones.
Ordering is explicit, not derived from names or insertion time.

Reordering is an operation, so it is undoable and can be proposed by the AI as
clearly as by a drag in the UI.

## Transforms

> _Planned._ Not implemented in Milestone 003. Leaf nodes carry an explicit
> `geometry` box (`x`, `y`, `width`, `height`); transform composition, rotation,
> and derived bounds arrive with the design-tools milestone.

Each node carries a transform relative to its parent. Transforms compose down
the tree.

- Translation, rotation, and scale are represented explicitly.
- A node's rendered bounds are derived, never stored as the source of truth.
- Editing a group's transform moves its children without rewriting each child.

## Visibility and locking

Every node exposes:

- **visible** — whether it renders and exports.
- **locked** — whether direct manipulation is permitted.

Hidden nodes remain in the document. Visibility is a property, never a deletion.

## Non-destructive editing

Effects, masks, and adjustments attach to nodes rather than replacing their
content. An image layer keeps its original asset; a mask constrains it.

This mirrors the document-level promise: the original is preserved and every
transformation stays reversible.

## Naming

Names exist for humans. They are not unique, not required, and never used to
address a node. Descriptive names are encouraged because they also improve the
quality of the structured description given to the AI.

## Invariants

The layer system must always satisfy:

1. Every node has a unique, stable ID.
2. The document has exactly one canvas root.
3. A node has exactly one parent; the tree is acyclic.
4. Sibling order is total and consistent.
5. A node's children are homogeneous in structure, not in kind.
6. Every node is serializable with no information loss.
7. Deleting a node deletes its subtree.
8. Operations never leave the document in a partially valid state.

These invariants are the contract the design engine enforces. Any operation that
would break one is rejected before it is applied. `validateDocument` reports
violations with diagnostics that name the offending node and ids, and
`assertValidDocument` is used at the serialization boundary.

## Persistence and revisions

The layer tree above is the document model. It is **not** redefined by storage.
`supabase/` stores serialized snapshots of complete `DesignDocument` values as
immutable revisions; the database never interprets the node tree into rows.

- A saved document keeps every id. Saving and reloading is a serialize /
  deserialize round-trip through the same model, so identity rules above hold
  across reloads and restores.
- A document's **schema version** (`DOCUMENT_SCHEMA_VERSION`, the structure of
  the model) is distinct from a document's **revision number** (its position in
  that document's history, `1, 2, 3, …`). They are unrelated counters.
- Revisions are immutable. Restoring an earlier revision appends a new revision
  containing its document rather than rewriting history.
- Stored payloads are validated at the persistence boundary before they reach
  the editor; a document that violates these invariants is rejected, not
  repaired.

## Relationship to the other packages

- `design-schema` defines the node types and serialization form.
- `design-engine` provides the operations that add, remove, reorder, group, and
  transform nodes.
- `document-store` persists and versions the document, and orchestrates change
  sets and undo/redo over the engine.
- `typography-engine` owns the styling of text nodes.
- `color-engine` owns the values used by fill, stroke, and color properties.
- `ai-core` reads the tree and proposes operations against node IDs.
