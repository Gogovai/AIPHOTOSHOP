# Product Specification

## Vision

AIPHOTOSHOP is an AI-native professional design environment where AI can create,
understand, modify, and improve professional graphic designs while preserving
complete human control over editable layers and design objects.

## The central idea

A design produced or edited by AIPHOTOSHOP is a **structured, editable design
document** — a canvas containing real layers and real objects.

It is not a flattened image.

An AI-generated design is never represented primarily as one raster picture. The
generated artifact is a document that a designer can open, inspect, edit,
reorder, restyle, and export, exactly as if a human had built it by hand.

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

## Who this is for

- Designers who want AI leverage without surrendering control of the file.
- Teams that need brand-consistent output without rebuilding layouts by hand.
- Anyone producing high volumes of flyers, posters, social graphics, or
  presentations who must still be able to make a last-minute edit.

## Why the document matters

Flattened output is a dead end. Once a design becomes pixels:

- text can no longer be retyped or restyled;
- brand colors cannot be swapped globally;
- a layer cannot be moved, hidden, or reordered;
- the AI cannot be asked to "make the headline bigger" with any precision;
- a minor correction means regenerating everything and losing prior work.

Because AIPHOTOSHOP keeps the document structured, every one of those actions
remains available after generation. AI output is a starting point that stays
workable, not a screenshot of one.

## Product pillars

### 1. Structure over pixels

The document is the artifact. Rendering, previewing, and exporting are
projections of the document. Nothing in the product treats a rendered bitmap as
the authoritative representation of a design.

### 2. Human control is non-negotiable

Every AI change is an operation on the document, so it is inspectable,
reviewable, and reversible. The user can always see what changed and undo it.

### 3. AI operates through controlled tools

The AI layer does not reach into editor state. It emits typed design operations
which are validated before they are applied. Its capability surface is bounded
and explicit.

### 4. Professional output

The target is professional graphic design: precise typography, real color
management, vector work, layout grids, photo editing, brand systems, and
eventually motion. This is not a toy generator.

## Capability areas

| Area               | Description                                                            |
| ------------------ | ---------------------------------------------------------------------- |
| Design documents   | Create, load, version, and persist structured designs.                 |
| Layer system       | Canvas, groups, and typed objects with stable identity and ordering.   |
| Typography         | Font resolution, text layout, line breaking, typographic scales.       |
| Color              | Color spaces, palette derivation, contrast and accessibility analysis. |
| Vector tools       | Paths, shapes, booleans, and advanced vector editing.                  |
| Photo editing      | Masking, adjustment, retouching on image layers.                       |
| Layout             | Grids, alignment, distribution, and responsive sizing.                 |
| AI design director | Intent-level design work across a whole document.                      |
| AI layer editing   | Targeted edits to specific layers and objects.                         |
| Reference analysis | Deriving structure and intent from supplied references.                |
| Asset intelligence | Finding, evaluating, and placing assets meaningfully.                  |
| Export             | Raster and vector deliverables generated from the document.            |
| Brand systems      | Reusable, enforceable identities applied across documents.             |
| Motion             | Timeline-based animation of the same layered document.                 |

## Explicit non-goals

- Being a simple AI image generator.
- Producing a flattened image as the primary result of any AI action.
- Replacing the designer's judgement or hiding design decisions from them.
- Shipping a chat window that emits opaque, uneditable pictures.

## Current state

This repository is at **Milestone 003 — Layer engine**. The monorepo, package
boundaries, tooling, and product surface from Milestone 001 are in place, and
the editor shell at `/editor/[projectId]` now renders a **real structured
document**: `@aiphotoshop/design-schema` provides the normalized document and
node model with stable opaque ids and lossless JSON serialization, and
`@aiphotoshop/design-engine` provides the immutable structural operations. The
layers panel and inspector read that document (an in-memory demo document,
since persistence is not implemented), and editor selection is kept separate
from document state. Still not implemented: canvas rendering, transforms,
editing interactions, undo/redo, AI, persistence, and export. See
`docs/DEVELOPMENT_ROADMAP.md`.
