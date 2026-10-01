/**
 * `@aiphotoshop/color-engine`
 *
 * Owns color as data: how a color is represented, converted, compared and
 * derived. Both palette generation and accessibility checks depend on these
 * primitives, so the maths must be deterministic and testable in isolation.
 *
 * Responsibilities (see `docs/ARCHITECTURE.md`):
 *
 * - Represent colors in explicit color spaces with lossless conversion.
 * - Derive palettes, tints, shades and harmonies from a base color.
 * - Measure contrast and report accessibility findings.
 * - Contain no rendering and no AI logic.
 *
 * Milestone 001 establishes this package boundary only. No color maths is
 * published yet and nothing here should be treated as a stable API.
 */

export {};
