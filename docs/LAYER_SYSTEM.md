# Layer System

> Status: specification. The layer system is implemented in Milestone 003; this
> document defines the model the implementation must satisfy.

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

| Kind     | Renders                      | Key properties                                  |
| -------- | ---------------------------- | ----------------------------------------------- |
| `canvas` | The document surface         | size, background, color space, bleed            |
| `group`  | Nothing itself; its children | transform, opacity, blend mode, clip            |
| `fill`   | A solid or gradient area     | fill, opacity, blend mode                       |
| `image`  | Raster image data            | asset reference, crop, mask, adjustments        |
| `text`   | Typeset text                 | text content, typographic style, box, alignment |
| `shape`  | A geometric primitive        | geometry, fill, stroke, corner radii            |
| `svg`    | Vector source                | source data, fills, strokes, transform          |
| `mask`   | Alpha applied to a sibling   | mask source, feather, invert                    |
| `effect` | Non-destructive adjustment   | effect type and parameters                      |

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
would break one is rejected before it is applied.

## Relationship to the other packages

- `design-schema` defines the node types and serialization form.
- `design-engine` provides the operations that add, remove, reorder, group, and
  transform nodes.
- `typography-engine` owns the styling of text nodes.
- `color-engine` owns the values used by fill, stroke, and color properties.
- `ai-core` reads the tree and proposes operations against node IDs.
