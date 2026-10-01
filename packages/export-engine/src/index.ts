/**
 * `@aiphotoshop/export-engine`
 *
 * Converts a design document into deliverables. Exporting is a projection of
 * the document, never a replacement for it: the source of truth stays editable
 * and every format is produced from the same structured data.
 *
 * Responsibilities (see `docs/ARCHITECTURE.md`):
 *
 * - Render the document to raster formats at requested sizes and densities.
 * - Render the document to vector formats without losing object structure.
 * - Report export diagnostics (missing fonts, unsupported effects).
 * - Contain no editor state and no AI logic.
 *
 * Milestone 001 establishes this package boundary only. No renderer is
 * published yet and nothing here should be treated as a stable API.
 */

export {};
