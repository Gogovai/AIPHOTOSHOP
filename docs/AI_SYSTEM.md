# AI System

> Status: specification. The AI system is introduced at Milestone 007; this
> document defines the boundaries it must respect.

## The one rule that matters

**The AI never returns a flattened image as its primary result.**

It reads a structured design document and proposes structured design operations.
The resulting artifact is always an editable, layered document.

A model may generate _image assets_ — a photo, a texture, a piece of
illustration — and those become image layers in the document. That is asset
generation, not design generation. The design itself is always structure.

## Separation of state

Three kinds of state exist, and they must not be merged:

| State          | Owner           | Contents                                            |
| -------------- | --------------- | --------------------------------------------------- |
| Document state | `design-schema` | Canvas, layers, objects, their properties           |
| Editor state   | `apps/web`      | Selection, viewport, zoom, open panels, active tool |
| AI state       | `ai-core`       | Conversation, model context, pending proposals      |

Consequences:

- Selection is never serialized into a document.
- A conversation never lives inside a document revision.
- Undoing an AI change set never rewinds the conversation.
- Reloading a document never restores a chat transcript.

## The pipeline

```
natural language intent
        │
        ▼
  read document  ──►  compact structured representation
        │
        ▼
   plan  ──►  ordered list of proposed operations
        │
        ▼
 validate  ──►  schema + invariants (design engine)
        │
        ▼
  apply  ──►  new document revision + change set
        │
        ▼
  review  ──►  user sees, accepts, or undoes
```

Each stage has a single owner. The model is consulted at exactly one of them.

## Reading the document

The AI does not receive pixels. It receives a compact, structured description of
the document: the node tree with kinds, IDs, names, transforms, and the styling
properties relevant to the task.

Design decisions therefore rest on facts about the actual document rather than
on a reconstruction from an image.

## The tool surface

AI capability is bounded by the operation registry defined in
`docs/DESIGN_ENGINE.md`. There is no free-form mutation.

- The AI can request only registered operations.
- Operation names and payloads are validated before anything is applied.
- Unknown or invalid operations are rejected with a diagnosable reason.
- Capability grows only by adding a registered operation and its tests.

This bound is a feature. It makes AI behaviour reviewable, testable, and safe,
and it means the model cannot corrupt a document it does not fully understand.

## Proposals, not commits

AI output is a **proposal**: a change set the user can inspect before or after
application and undo in one action.

The product must never apply an AI change in a way that cannot be described,
attributed, or reversed. Every change set records its origin so history shows
what the AI did and what the designer did.

## Failure handling

When validation rejects a proposal, the failure is returned to the AI layer as
structured feedback. The layer may correct and retry within a bounded budget.
It may not bypass validation, relax invariants, or write to the document
directly.

## Providers

No provider is selected or integrated at Milestone 001. Provider specifics —
model choice, transport, streaming, cost control — belong behind an interface in
`ai-core` so that the rest of the system never depends on a vendor.

## Milestone mapping

| Milestone | AI capability                                       |
| --------- | --------------------------------------------------- |
| 007       | AI design director — document-scale intent          |
| 008       | AI layer manipulation — targeted edits by node ID   |
| 009       | Reference analysis — structure inferred from inputs |
| 010       | Asset intelligence — selection and placement        |

Earlier milestones deliberately contain no AI code. Fake AI behaviour must never
be shipped to make an interface look complete.
