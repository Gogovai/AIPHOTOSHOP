/**
 * `@aiphotoshop/design-schema`
 *
 * Owns the canonical, serializable contract for a design document: the canvas,
 * its layers, and every editable object inside them. It is the single source of
 * truth for what a design *is*, independent of how it is rendered or edited.
 *
 * Responsibilities (see `docs/ARCHITECTURE.md` and `docs/LAYER_SYSTEM.md`):
 *
 * - Define the design document, layer, and object type hierarchy.
 * - Guarantee every editable element carries a stable identifier.
 * - Guarantee every document round-trips through serialization without loss.
 * - Contain no rendering, no editor state, and no AI logic.
 *
 * Milestone 001 establishes this package boundary only. No schema types are
 * published yet and nothing here should be treated as a stable API.
 */

export {};
