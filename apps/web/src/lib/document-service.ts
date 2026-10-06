/**
 * Server-side document service.
 *
 * This is the boundary between the editor route and the persistence layer. It
 * talks to the `DocumentRepository` chosen in `./repository` (Supabase when
 * configured, otherwise the shared in-memory repository).
 *
 * The editor never imports the repository directly. It receives a plain document
 * + revision id from the route and deals only with document state + editor
 * state.
 */

import { DocumentNotFoundError } from "@aiphotoshop/document-store";
import {
  createImageNode,
  createNodeId,
  createShapeNode,
  createTextNode,
  type DesignDocument,
  type NodeId,
} from "@aiphotoshop/design-schema";
import { addNode } from "@aiphotoshop/design-engine";

import { documentRepository } from "./repository";

export interface LoadedDocument {
  readonly projectId: string;
  readonly revisionId: string;
  readonly document: DesignDocument;
}

export interface DocumentService {
  create(projectId: string, name: string): Promise<LoadedDocument>;
  load(projectId: string): Promise<LoadedDocument>;
  loadOrCreate(projectId: string): Promise<LoadedDocument>;
}

const SERVICE = "aiphotoshop" as const;

export const documentService: DocumentService = {
  async create(projectId: string, name: string): Promise<LoadedDocument> {
    const result = await documentRepository.create({
      id: projectId,
      name,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: SERVICE,
      },
    });
    return {
      projectId: result.projectId,
      revisionId: result.revisionId,
      document: result.document,
    };
  },

  async load(projectId: string): Promise<LoadedDocument> {
    const result = await documentRepository.load(projectId);
    return {
      projectId,
      revisionId: result.revisionId,
      document: result.document,
    };
  },

  /**
   * Load a document, creating a starter document the first time a project id is
   * opened. Local development has no document-creation UI yet, so the editor
   * route treats an unknown id as a new project rather than a 404.
   */
  async loadOrCreate(projectId: string): Promise<LoadedDocument> {
    try {
      return await documentService.load(projectId);
    } catch (error) {
      if (!(error instanceof DocumentNotFoundError)) {
        throw error;
      }
      return await createStarterDocument(projectId);
    }
  },
};

/**
 * Create a document with the default 1080x1350 canvas, populate it with a small
 * starter tree, and persist the populated tree as a revision so it survives the
 * first save. Create alone persists only the empty canvas root; the starter
 * content is committed as the next immutable revision.
 */
export async function createStarterDocument(projectId: string): Promise<LoadedDocument> {
  const created = await documentService.create(projectId, "Untitled Design");
  const doc = created.document;

  const root = doc.rootNodeId as NodeId;

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

  const nodes = [background, hero, headline, subtitle, rule];
  let current = doc;
  for (const node of nodes) {
    current = addNode(current, node);
  }

  const saved = await documentRepository.save({
    document: current,
    expectedCurrentRevisionId: created.revisionId,
    summary: {
      source: "system",
      operationCount: nodes.length,
      operations: nodes.map(() => "addNode"),
      description: "Starter document",
    },
  });

  return { projectId, revisionId: saved.revisionId, document: current };
}
