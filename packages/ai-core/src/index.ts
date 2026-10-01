/**
 * `@aiphotoshop/ai-core`
 *
 * Translates intent into design operations. The AI layer never owns the design
 * document and never returns a flattened image as its primary output: it reads
 * the document, reasons about it, and proposes typed operations that the design
 * engine validates and applies.
 *
 * Responsibilities (see `docs/AI_SYSTEM.md`):
 *
 * - Describe the design document to a model in a compact, structured form.
 * - Expose a bounded tool/operation surface instead of free-form mutation.
 * - Validate every proposed operation before it reaches the design engine.
 * - Keep AI state and conversation state separate from editor state.
 *
 * Milestone 001 establishes this package boundary only. No provider is wired
 * up, no prompts exist, and nothing here should be treated as a stable API.
 */

export {};
