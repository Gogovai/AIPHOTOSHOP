/**
 * The in-memory demo document for the editor route.
 *
 * This is a real `DesignDocument` built through `@aiphotoshop/design-schema`
 * and `@aiphotoshop/design-engine` — not placeholder shell data. It exists
 * because persistence arrives in a later milestone; it is deterministic in
 * content (names, types, hierarchy, flags) even though node ids are opaque and
 * generated.
 *
 * Nothing here is persisted: the document lives only for the lifetime of the
 * server process and is immutable once built.
 */

import {
  createDocument,
  createImageNode,
  createNodeId,
  createShapeNode,
  createTextNode,
  type DesignDocument,
  type NodeId,
} from "@aiphotoshop/design-schema";
import { addNode } from "@aiphotoshop/design-engine";

/** The demo document plus the node the editor starts with selected. */
export interface DemoDocument {
  readonly document: DesignDocument;
  readonly selectedNodeId: NodeId;
}

/**
 * Builds the demo design: a canvas holding a background, a hero image, a
 * headline, a hidden subtitle, and a locked rule — mirroring the layers shown
 * on the marketing surface.
 */
export function createDemoDocument(): DemoDocument {
  const start = createDocument({ name: "Untitled Design", width: 1080, height: 1350 });
  const root = start.rootNodeId;

  const background = createImageNode({
    id: createNodeId(),
    name: "Background",
    parentId: root,
    src: "/demo/background.jpg",
    geometry: { x: 0, y: 0, width: 1080, height: 1350 },
  });
  const hero = createImageNode({
    id: createNodeId(),
    name: "Hero Image",
    parentId: root,
    src: "/demo/hero.jpg",
    geometry: { x: 0, y: 120, width: 1080, height: 640 },
  });
  const headline = createTextNode({
    id: createNodeId(),
    name: "Headline",
    parentId: root,
    text: "Design in layers",
    fontSize: 72,
    fontWeight: 600,
    geometry: { x: 96, y: 820, width: 888, height: 120 },
  });
  const subtitle = createTextNode({
    id: createNodeId(),
    name: "Subtitle",
    parentId: root,
    text: "AI-native editing, one operation at a time",
    fontSize: 28,
    geometry: { x: 96, y: 960, width: 888, height: 56 },
    visible: false,
  });
  const rule = createShapeNode({
    id: createNodeId(),
    name: "Rule",
    parentId: root,
    shape: "line",
    locked: true,
    geometry: { x: 96, y: 1060, width: 888, height: 4 },
  });

  const document = [background, hero, headline, subtitle, rule].reduce(
    (current, node) => addNode(current, node),
    start,
  );

  return { document, selectedNodeId: headline.id };
}

/** The singleton demo document used by the editor route. */
export const DEMO_DOCUMENT: DemoDocument = createDemoDocument();
