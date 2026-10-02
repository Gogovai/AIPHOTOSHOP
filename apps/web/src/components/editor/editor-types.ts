/**
 * Local, view-level types for the Milestone 002 editor shell.
 *
 * These types exist for the shell UI only. They are NOT the design document
 * model: `@aiphotoshop/design-schema` stays untouched, and nothing here enters
 * any package. When the layer engine lands in Milestone 003, these structures
 * are replaced by real document state — the panel components will be re-pointed
 * at it without changing their roles or layout contracts.
 *
 * Per AGENT_RULES 4 and 13, this is labelled structural UI, not fake
 * functionality: no layer operations, selection behavior, or persistence are
 * implemented here.
 */

/** Visual kind marker for a shell layer row. */
export type ShellLayerKind = "canvas" | "group" | "image" | "text" | "shape" | "svg";

/** One row in the placeholder layers panel. Purely presentational. */
export interface ShellLayerRow {
  /** Stable within the shell data so keys and test hooks are deterministic. */
  readonly id: string;
  readonly name: string;
  readonly kind: ShellLayerKind;
  /** Hierarchy depth. 0 is the canvas root row. */
  readonly depth: number;
  readonly visible: boolean;
  readonly locked: boolean;
}

/**
 * One labeled group of display-only fields in the inspector shell.
 * Values are static text until the document system exists.
 */
export interface InspectorSection {
  readonly label: string;
  readonly fields: readonly {
    readonly label: string;
    readonly value: string;
  }[];
}

/** The single example artboard size used across the shell. */
export const DOCUMENT_SIZE = {
  width: 1080,
  height: 1350,
} as const;

/** Label for the shell document, used in the top bar and status bar. */
export const DOCUMENT_NAME = "Untitled Design";

/** Route to the editor shell, used by the homepage entry point. */
export const EDITOR_HREF = "/editor/demo";

/** The one shell row rendered as selected in the layers panel. */
export const SHELL_SELECTED_LAYER_ID = "shell-headline";

/**
 * Structural-only layer rows for the layers panel. They mirror the homepage's
 * `DocumentPreview` illustration so the two surfaces tell one consistent story.
 */
export const SHELL_LAYERS: readonly ShellLayerRow[] = [
  { id: "shell-canvas", name: "Canvas", kind: "canvas", depth: 0, visible: true, locked: false },
  {
    id: "shell-background",
    name: "Background",
    kind: "image",
    depth: 1,
    visible: true,
    locked: false,
  },
  { id: "shell-hero", name: "Hero Image", kind: "image", depth: 1, visible: true, locked: false },
  {
    id: "shell-headline",
    name: "Headline",
    kind: "text",
    depth: 1,
    visible: true,
    locked: false,
  },
  {
    id: "shell-subtitle",
    name: "Subtitle",
    kind: "text",
    depth: 1,
    visible: false,
    locked: false,
  },
  { id: "shell-rule", name: "Rule", kind: "shape", depth: 1, visible: true, locked: true },
];

/**
 * Display-only inspector sections. Deliberately few groups with static values:
 * the milestone brief asks for architectural honesty, not dozens of fake
 * inputs. Real values arrive with the document system.
 */
export const INSPECTOR_SECTIONS: readonly InspectorSection[] = [
  {
    label: "Position",
    fields: [
      { label: "X", value: "—" },
      { label: "Y", value: "—" },
      { label: "W", value: "—" },
      { label: "H", value: "—" },
    ],
  },
  {
    label: "Appearance",
    fields: [
      { label: "Opacity", value: "—" },
      { label: "Blend", value: "—" },
    ],
  },
  {
    label: "Typography",
    fields: [
      { label: "Font", value: "—" },
      { label: "Size", value: "—" },
      { label: "Weight", value: "—" },
      { label: "Line height", value: "—" },
    ],
  },
];
