import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { EditorShell } from "@/components/editor/editor-shell";

/**
 * Milestone 002 shell checks: the editor renders its major regions. Structural
 * smoke tests only — behavior tests arrive with real editor state. Rendered
 * with `react-dom/server` so no browser/test-DOM infrastructure is needed.
 */
function renderShell(): string {
  return renderToStaticMarkup(<EditorShell projectId="demo" />);
}

describe("EditorShell", () => {
  it("renders the four major regions plus the status bar", () => {
    const html = renderShell();

    expect(html).toContain('aria-label="Editor workspace"');
    expect(html).toContain('aria-label="Tools"');
    expect(html).toContain('aria-label="Canvas viewport"');
    expect(html).toContain('aria-label="Layers and inspector"');
    expect(html).toContain('aria-label="Status bar"');
  });

  it("renders the top application bar identity", () => {
    const html = renderShell();

    expect(html).toContain("AIPHOTOSHOP");
    expect(html).toContain("Untitled Design");
    expect(html).toContain("SAVED");
    expect(html).toContain("WORKSPACE · DEMO");
  });

  it("renders the artboard shell in the canvas viewport", () => {
    const html = renderShell();

    expect(html).toContain('data-testid="artboard"');
    expect(html).toContain("Your canvas");
    expect(html).toContain("The structured design engine will appear here.");
  });

  it("renders placeholder rows in the layers panel with state icons", () => {
    const html = renderShell();

    expect(html).toContain("LAYERS");
    expect(html).toContain("Canvas");
    expect(html).toContain("Headline");
    expect(html).toContain("TEXT");
    expect(html).toContain('data-testid="layer-hidden"');
    expect(html).toContain('data-testid="layer-locked"');
  });

  it("shows em-dash values in the inspector (no fake document data)", () => {
    const html = renderShell();

    expect(html).toContain("INSPECTOR");
    expect(html).toContain("POSITION");
    expect(html).toContain("APPEARANCE");
    expect(html).toContain("TYPOGRAPHY");
    expect(html).toContain("<dd");
  });

  it("renders toolbar buttons with accessible names", () => {
    const html = renderShell();

    for (const label of [
      "Move",
      "Select",
      "Frame",
      "Text",
      "Shape",
      "Pen",
      "Image",
      "Hand",
      "Zoom",
    ]) {
      expect(html).toContain(`aria-label="${label}"`);
    }
  });

  it("renders document size and zoom display in the status bar", () => {
    const html = renderShell();

    expect(html).toContain("1080 × 1350");
    expect(html).toContain("100%");
    expect(html).toContain("Design document");
  });
});
