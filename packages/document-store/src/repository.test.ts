import { describe, expect, it } from "vitest";

import { addNode } from "@aiphotoshop/design-engine";
import {
  asNodeId,
  createTextNode,
  type DesignDocument,
  type DocumentMetadata,
} from "@aiphotoshop/design-schema";

import { DocumentNotFoundError, InMemoryDocumentRepository, RevisionConflictError } from "./index";

const METADATA: DocumentMetadata = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  source: "test",
};

const PROJECT = "project-1";
const EXTRA_NODE = asNodeId("text-extra");

async function createRepository(): Promise<{
  repository: InMemoryDocumentRepository;
  revisionId: string;
  document: DesignDocument;
}> {
  const repository = new InMemoryDocumentRepository();
  const created = await repository.create({ id: PROJECT, name: "Doc", metadata: METADATA });
  return { repository, revisionId: created.revisionId, document: created.document };
}

/** Adds one text node to the document root, exercising a real engine edit. */
function withExtraNode(doc: DesignDocument): DesignDocument {
  return addNode(
    doc,
    createTextNode({
      id: EXTRA_NODE,
      name: "Extra",
      parentId: doc.rootNodeId,
      text: "extra",
    }),
  );
}

describe("InMemoryDocumentRepository", () => {
  it("creates a document, then loads the same revision back", async () => {
    const { repository, revisionId, document } = await createRepository();

    expect(revisionId).toBe("rev-1");
    expect(document.id).toBe(PROJECT);

    const loaded = await repository.load(PROJECT);
    expect(loaded.revisionId).toBe("rev-1");
    expect(loaded.document).toEqual(document);
  });

  it("throws DocumentNotFoundError for an unknown project", async () => {
    const repository = new InMemoryDocumentRepository();

    await expect(repository.load("missing")).rejects.toBeInstanceOf(DocumentNotFoundError);
  });

  it("saves an immutable new revision and advances the current revision", async () => {
    const { repository, revisionId, document } = await createRepository();

    const saved = await repository.save({
      document: withExtraNode(document),
      expectedCurrentRevisionId: revisionId,
    });
    expect(saved).toEqual({ revisionId: "rev-2", revisionNumber: 2 });

    const loaded = await repository.load(PROJECT);
    expect(loaded.revisionId).toBe("rev-2");
    expect(loaded.document.nodes[EXTRA_NODE]).toBeDefined();

    // The first revision is history, not a moving pointer.
    const original = await repository.loadRevision(PROJECT, revisionId);
    expect(original.document.nodes[EXTRA_NODE]).toBeUndefined();
  });

  it("rejects a stale save with RevisionConflictError", async () => {
    const { repository, revisionId, document } = await createRepository();
    await repository.save({ document, expectedCurrentRevisionId: revisionId });

    await expect(
      repository.save({ document, expectedCurrentRevisionId: revisionId }),
    ).rejects.toBeInstanceOf(RevisionConflictError);
  });

  it("allows an unconditional save when the expected revision is null", async () => {
    const { repository, revisionId, document } = await createRepository();
    await repository.save({ document, expectedCurrentRevisionId: revisionId });

    const saved = await repository.save({ document, expectedCurrentRevisionId: null });
    expect(saved.revisionNumber).toBe(3);
    expect((await repository.load(PROJECT)).revisionId).toBe("rev-3");
  });

  it("lists revisions in ascending order with the current revision id", async () => {
    const { repository, revisionId, document } = await createRepository();
    await repository.save({ document, expectedCurrentRevisionId: revisionId });

    const listed = await repository.listRevisions(PROJECT);
    expect(listed.revisions.map((revision) => revision.revisionNumber)).toEqual([1, 2]);
    expect(listed.currentRevisionId).toBe("rev-2");
  });

  it("restores an earlier revision as a new revision without rewriting history", async () => {
    const { repository, revisionId, document } = await createRepository();
    await repository.save({
      document: withExtraNode(document),
      expectedCurrentRevisionId: revisionId,
    });

    const restored = await repository.restore(PROJECT, revisionId, {
      source: "restore",
      operationCount: 0,
      description: "revert",
    });
    expect(restored).toEqual({ revisionId: "rev-3", revisionNumber: 3 });

    // The restored document matches revision 1, and revision 2 still exists.
    const loaded = await repository.load(PROJECT);
    expect(loaded.document.nodes[EXTRA_NODE]).toBeUndefined();
    expect(
      (await repository.loadRevision(PROJECT, "rev-2")).document.nodes[EXTRA_NODE],
    ).toBeDefined();

    const listed = await repository.listRevisions(PROJECT);
    expect(listed.revisions.map((revision) => revision.revisionNumber)).toEqual([1, 2, 3]);
  });

  it("rejects saving a structurally invalid document", async () => {
    const { repository, revisionId, document } = await createRepository();
    const invalid: DesignDocument = { ...document, rootNodeId: asNodeId("missing-root") };

    await expect(
      repository.save({ document: invalid, expectedCurrentRevisionId: revisionId }),
    ).rejects.toThrow(/Root node/);
  });

  it("leaves the current revision intact after a rejected stale save", async () => {
    const { repository, revisionId, document } = await createRepository();
    await repository.save({ document, expectedCurrentRevisionId: revisionId });

    await expect(
      repository.save({ document, expectedCurrentRevisionId: revisionId }),
    ).rejects.toBeInstanceOf(RevisionConflictError);

    expect((await repository.load(PROJECT)).revisionId).toBe("rev-2");
    const listed = await repository.listRevisions(PROJECT);
    expect(listed.revisions.map((revision) => revision.revisionNumber)).toEqual([1, 2]);
  });

  it("round-trips ids, hierarchy, metadata and node properties through save and load", async () => {
    const { repository, revisionId, document } = await createRepository();
    const edited = addNode(
      document,
      createTextNode({
        id: EXTRA_NODE,
        name: "Headline",
        parentId: document.rootNodeId,
        text: "SOLSTICE",
      }),
    );

    await repository.save({ document: edited, expectedCurrentRevisionId: revisionId });
    const reloaded = (await repository.load(PROJECT)).document;

    expect(reloaded).toEqual(edited);
    expect(reloaded.id).toBe(document.id);
    expect(reloaded.metadata).toEqual(edited.metadata);
    expect(Object.keys(reloaded.nodes).sort()).toEqual(Object.keys(edited.nodes).sort());
    expect(reloaded.nodes[EXTRA_NODE]?.id).toBe(EXTRA_NODE);
    expect(reloaded.nodes[EXTRA_NODE]).toMatchObject({ type: "text", text: "SOLSTICE" });

    const root = reloaded.nodes[reloaded.rootNodeId];
    if (root === undefined || (root.type !== "canvas" && root.type !== "group")) {
      throw new Error("expected a container root");
    }
    expect(root.children).toContain(EXTRA_NODE);
  });
});
