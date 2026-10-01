/**
 * `@aiphotoshop/typography-engine`
 *
 * Owns everything that happens between a string of text and the positioned
 * glyphs drawn on a canvas: font resolution, measurement, line breaking,
 * alignment, and the typographic properties attached to text objects.
 *
 * Responsibilities (see `docs/ARCHITECTURE.md`):
 *
 * - Resolve font families and weights to concrete, available fonts.
 * - Measure and lay out text deterministically for a given box and style.
 * - Supply typographic scales used by the UI and by generated designs.
 * - Contain no document ownership and no AI logic.
 *
 * Milestone 001 establishes this package boundary only. No layout engine is
 * published yet and nothing here should be treated as a stable API.
 */

export {};
