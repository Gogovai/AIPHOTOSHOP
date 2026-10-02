import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { EditorShell } from "@/components/editor/editor-shell";

/**
 * Editor shell checks: the editor renders its major regions and now shows real
 * design-document data. Rendered with `react-dom/server` so no browser/test-DOM
 * infrastructure is needed.
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

  it("renders the artboard with the real canvas proportions", () => {
    const html = renderShell();

    expect(html).toContain('data-testid="artboard"');
    expect(html).toContain("Your canvas");
    expect(html).toContain("Canvas rendering arrives in a later milestone.");
    expect(html).toContain("width:270px");
    expect(html).toContain("height:337.5px");
  });

  it("renders the real document tree in the layers panel", () => {
    const html = renderShell();

    expect(html).toContain("LAYERS");
    for (const name of ["Canvas", "Background", "Hero Image", "Headline", "Subtitle", "Rule"]) {
      expect(html).toContain(name);
    }
    expect(html).toContain("CANVAS");
    expect(html).toContain("IMAGE");
    expect(html).toContain("SHAPE");
  });

  it("shows document visibility and lock state in the layers panel", () => {
    const html = renderShell();

    expect(html).toContain('data-testid="layer-hidden"');
    expect(html).toContain('data-testid="layer-locked"');
    expect(html).toContain("Subtitle hidden");
    expect(html).toContain("Rule locked");
  });

  it("marks the selected node from editor state", () => {
    const html = renderShell();

    expect(html).toContain('aria-selected="true"');
    expect(html).toContain("Headline");
  });

  it("reads the selected node's real data in the inspector", () => {
    const html = renderShell();

    expect(html).toContain("INSPECTOR");
    expect(html).toContain("Name");
    expect(html).toContain("Visibility");
    expect(html).toContain("Locked");
    expect(html).toContain("Visible");
    expect(html).toContain("Unlocked");
    expect(html).toContain("DOCUMENT");
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

    expect(html).toContain("Untitled Design");
    expect(html).toContain("1080 × 1350");
    expect(html).toContain("100%");
    expect(html).toContain("Design document");
  });
});
