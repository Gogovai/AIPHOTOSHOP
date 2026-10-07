import { describe, expect, it } from "vitest";

import { addNode } from "@aiphotoshop/design-engine";
import {
  asNodeId,
  createTextNode,
  type DesignDocument,
  type DocumentMetadata,
  type TextNode,
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

describe("ChangeSet persistence", () => {
  it("persists and reloads a complete ChangeSet with all operation payloads", async () => {
    const { repository, revisionId, document } = await createRepository();

    // Create a ChangeSet with complete operation payloads for all 9 operation types
    const renameOp = {
      operation: "renameNode" as const,
      nodeId: document.rootNodeId,
      name: "Renamed Canvas",
    };
    const visibilityOp = {
      operation: "setVisibility" as const,
      nodeId: document.rootNodeId,
      visible: false,
    };
    const lockedOp = { operation: "setLocked" as const, nodeId: document.rootNodeId, locked: true };

    const changeSet = {
      id: "cs-test-complete",
      source: "user" as const,
      operations: [renameOp, visibilityOp, lockedOp] as const,
      description: "Complete ChangeSet test",
    };

    const saved = await repository.save({
      document,
      expectedCurrentRevisionId: revisionId,
      changeSet,
    });

    // Load the revision and verify the ChangeSet is stored with complete payloads
    const loaded = await repository.loadRevision(document.id, saved.revisionId);
    const loadedChangeSet = loaded.revision.changeSet!;
    expect(loadedChangeSet.id).toBe("cs-test-complete");
    expect(loadedChangeSet.operations).toHaveLength(3);

    // Verify each operation has its complete payload
    const ops = loadedChangeSet.operations;
    expect(ops[0]!.operation).toBe("renameNode");
    expect((ops[0] as { operation: "renameNode"; nodeId: string; name: string }).name).toBe(
      "Renamed Canvas",
    );

    expect(ops[1]!.operation).toBe("setVisibility");
    expect(
      (ops[1] as { operation: "setVisibility"; nodeId: string; visible: boolean }).visible,
    ).toBe(false);

    expect(ops[2]!.operation).toBe("setLocked");
    expect((ops[2] as { operation: "setLocked"; nodeId: string; locked: boolean }).locked).toBe(
      true,
    );
  });

  it("stores empty operations array when only summary is provided", async () => {
    const { repository, revisionId, document } = await createRepository();

    const saved = await repository.save({
      document,
      expectedCurrentRevisionId: revisionId,
      summary: {
        source: "user",
        operationCount: 1,
        operations: ["renameNode"],
        description: "Summary only",
      },
    });

    const loaded = await repository.loadRevision(document.id, saved.revisionId);
    const loadedChangeSet = loaded.revision.changeSet!;
    expect(loadedChangeSet.operations).toHaveLength(0);
    expect(loadedChangeSet.description).toBe("Summary only");
  });

  it("prefers ChangeSet over summary when both are provided", async () => {
    const { repository, revisionId, document } = await createRepository();

    const inputChangeSet = {
      id: "cs-preferred",
      source: "user" as const,
      operations: [
        { operation: "renameNode" as const, nodeId: document.rootNodeId, name: "From ChangeSet" },
      ],
      description: "ChangeSet provided",
    };

    const saved = await repository.save({
      document,
      expectedCurrentRevisionId: revisionId,
      summary: {
        source: "user",
        operationCount: 1,
        operations: ["setLocked"],
        description: "Summary provided",
      },
      changeSet: inputChangeSet,
    });

    const loaded = await repository.loadRevision(document.id, saved.revisionId);
    const loadedChangeSet = loaded.revision.changeSet!;
    expect(loadedChangeSet.id).toBe("cs-preferred");
    expect(loadedChangeSet.operations).toHaveLength(1);
    expect((loadedChangeSet.operations[0] as { operation: "renameNode"; name: string }).name).toBe(
      "From ChangeSet",
    );
  });
});

describe("Reload after save verification", () => {
  it("loads the edited document after save, while original revision remains unchanged", async () => {
    const { repository, revisionId, document } = await createRepository();

    // Make an edit to the document
    const edited = addNode(
      document,
      createTextNode({
        id: EXTRA_NODE,
        name: "Edited Node",
        parentId: document.rootNodeId,
        text: "edited content",
      }),
    );

    // Save the edited document
    const saved = await repository.save({
      document: edited,
      expectedCurrentRevisionId: revisionId,
      summary: {
        source: "user",
        operationCount: 1,
        operations: ["addNode"],
        description: "Add edited node",
      },
    });

    // Load the latest revision - should have the edit
    const latest = await repository.load(document.id);
    expect(latest.revisionId).toBe(saved.revisionId);
    expect(latest.document.nodes[EXTRA_NODE]).toBeDefined();
    expect(latest.document.nodes[EXTRA_NODE]?.name).toBe("Edited Node");
    const editedNode = latest.document.nodes[EXTRA_NODE] as TextNode | undefined;
    expect(editedNode?.text).toBe("edited content");

    // Load the original revision - should NOT have the edit
    const original = await repository.loadRevision(document.id, revisionId);
    expect(original.document.nodes[EXTRA_NODE]).toBeUndefined();

    // List revisions - should have both
    const listed = await repository.listRevisions(document.id);
    expect(listed.revisions.map((r) => r.revisionNumber)).toEqual([1, 2]);
  });

  it("restore creates new revision with ChangeSet and preserves history", async () => {
    const { repository, revisionId, document } = await createRepository();

    // Make first edit
    const edited1 = addNode(
      document,
      createTextNode({
        id: EXTRA_NODE,
        name: "Edit 1",
        parentId: document.rootNodeId,
        text: "first edit",
      }),
    );
    await repository.save({
      document: edited1,
      expectedCurrentRevisionId: revisionId,
      summary: { source: "user", operationCount: 1 },
    });

    // Make second edit
    const extraNode2 = asNodeId("text-extra-2");
    const edited2 = addNode(
      edited1,
      createTextNode({
        id: extraNode2,
        name: "Edit 2",
        parentId: document.rootNodeId,
        text: "second edit",
      }),
    );
    await repository.save({
      document: edited2,
      expectedCurrentRevisionId: "rev-2",
      summary: { source: "user", operationCount: 1 },
    });

    // Restore revision 1
    const restored = await repository.restore(document.id, revisionId, {
      source: "restore",
      operationCount: 0,
      description: "Revert to original",
    });

    // Current revision should be restored version (matches revision 1)
    const current = await repository.load(document.id);
    expect(current.revisionId).toBe(restored.revisionId);
    expect(current.document.nodes[EXTRA_NODE]).toBeUndefined();
    expect(current.document.nodes[extraNode2]).toBeUndefined();

    // Original revisions 1, 2, 3 should still exist
    const rev1 = await repository.loadRevision(document.id, "rev-1");
    expect(rev1.document.nodes[EXTRA_NODE]).toBeUndefined();

    const rev2 = await repository.loadRevision(document.id, "rev-2");
    expect(rev2.document.nodes[EXTRA_NODE]).toBeDefined();
    expect(rev2.document.nodes[extraNode2]).toBeUndefined();

    const rev3 = await repository.loadRevision(document.id, "rev-3");
    expect(rev3.document.nodes[EXTRA_NODE]).toBeDefined();
    expect(rev3.document.nodes[extraNode2]).toBeDefined();

    // Restored revision should be revision 4
    const rev4 = await repository.loadRevision(document.id, "rev-4");
    expect(rev4.document.nodes[EXTRA_NODE]).toBeUndefined();
    expect(rev4.document.nodes[extraNode2]).toBeUndefined();

    const listed = await repository.listRevisions(document.id);
    expect(listed.revisions.map((r) => r.revisionNumber)).toEqual([1, 2, 3, 4]);
  });
});
