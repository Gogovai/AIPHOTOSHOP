/**
 * The persistence boundary.
 *
 * Application code, the editor, and (in the browser) the API client all talk to
 * this interface. The Supabase implementation is a separate file and is never
 * referenced by editor components. The database stores serialized
 * `DesignDocument` revisions plus these metadata fields — never a second
 * layer model.
 */

import {
  assertValidDocument,
  createCanvasNode,
  deserializeDocument,
  serializeDocument,
  type DesignDocument,
  type NodeId,
  type DocumentId,
} from "@aiphotoshop/design-schema";

import {
  DocumentDeserializationError,
  DocumentNotFoundError,
  DocumentPersistenceError,
  RevisionConflictError,
} from "./errors";
import type { Revision } from "./model";
import type {
  ChangeSet,
  CreateDocumentInput,
  ListRevisionsResult,
  RevisionSummary,
  SaveDocumentInput,
} from "./model";

export interface DocumentRepository {
  /**
   * Creates a fresh, valid document, persists its initial revision, and returns
   * the document id, the revision id, and the starting `DesignDocument`.
   */
  create(input: CreateDocumentInput): Promise<{
    projectId: string;
    revisionId: string;
    document: DesignDocument;
  }>;

  /**
   * Loads the latest revision and its `DesignDocument`.
   *
   * Deserializes, validates, and returns the document, or throws
   * {@link DocumentNotFoundError} / {@link DocumentDeserializationError} /
   * {@link DocumentValidationError}.
   */
  load(projectId: string): Promise<{ revisionId: string; document: DesignDocument }>;

  /**
   * Saves a new revision.
   *
   * Runs validation and serialization, then atomically creates the revision and
   * advances the document's current revision. Passing `expectedCurrentRevisionId`
   * enables optimistic concurrency; a mismatch throws
   * {@link RevisionConflictError}. The previous revisions are never deleted.
   */
  save(input: SaveDocumentInput): Promise<{ revisionId: string; revisionNumber: number }>;

  /** Returns the revision list and current revision id, ordered deterministically. */
  listRevisions(projectId: string): Promise<ListRevisionsResult>;

  /**
   * Loads a single historical revision.
   *
   * Deserializes, validates, and returns the `Revision` and its `DesignDocument`.
   */
  loadRevision(
    projectId: string,
    revisionId: string,
  ): Promise<{ revision: Revision; document: DesignDocument }>;

  /**
   * Restores a previous revision as a new revision.
   *
   * Does not rewrite history: the restored revision is copied into revision N+1,
   * and the already-persisted revisions remain available.
   */
  restore(
    projectId: string,
    revisionId: string,
    summary: RevisionSummary,
  ): Promise<{ revisionId: string; revisionNumber: number }>;
}

// ---------------------------------------------------------------------------

interface DocumentState {
  projectId: string;
  currentRevisionId: string;
  currentRevisionNumber: number;
  revisions: Map<string, Revision>;
}

/**
 * An in-memory `DocumentRepository` implementation.
 *
 * Used by the editor and by tests; replaced by the Supabase implementation in
 * the browser.
 */
export class InMemoryDocumentRepository implements DocumentRepository {
  private readonly documents = new Map<string, DocumentState>();

  async create(input: CreateDocumentInput): Promise<{
    projectId: string;
    revisionId: string;
    document: DesignDocument;
  }> {
    const document = this.buildInitialDocument(input);
    assertValidDocument(document);

    const revisionId = revisionIdFor(1);
    const revision: Revision = {
      id: revisionId,
      projectId: input.id,
      revisionNumber: 1,
      document: serializeDocument(document) as string,
      createdAt: new Date().toISOString(),
      parentRevisionId: null,
      changeSet: null,
    };

    const state: DocumentState = {
      projectId: input.id,
      currentRevisionId: revisionId,
      currentRevisionNumber: 1,
      revisions: new Map([[revisionId, revision]]),
    };
    this.documents.set(input.id, state);

    return { projectId: input.id, revisionId, document };
  }

  async load(projectId: string): Promise<{ revisionId: string; document: DesignDocument }> {
    const state = this.getDocument(projectId);
    const revision = this.getRevision(state, state.currentRevisionId);
    const document = this.deserializeAndValidate(revision.document);
    return { revisionId: revision.id, document };
  }

  async save(input: SaveDocumentInput): Promise<{ revisionId: string; revisionNumber: number }> {
    const state = this.getDocument(input.document.id);
    this.checkConcurrency(state, input.expectedCurrentRevisionId);

    assertValidDocument(input.document);
    const serialized: string = serializeDocument(input.document);

    const nextNumber = state.currentRevisionNumber + 1;
    const revisionId = revisionIdFor(nextNumber);
    const revision: Revision = {
      id: revisionId,
      projectId: input.document.id,
      revisionNumber: nextNumber,
      document: serialized,
      createdAt: new Date().toISOString(),
      parentRevisionId: state.currentRevisionId,
      changeSet: this.buildChangeSetFromSummary(input.summary),
    };

    state.currentRevisionId = revisionId;
    state.currentRevisionNumber = nextNumber;
    state.revisions.set(revisionId, revision);

    return { revisionId, revisionNumber: nextNumber };
  }

  async listRevisions(projectId: string): Promise<ListRevisionsResult> {
    const state = this.getDocument(projectId);
    const revisions = [...state.revisions.values()].sort(
      (a, b) => a.revisionNumber - b.revisionNumber,
    );
    return { revisions, currentRevisionId: state.currentRevisionId };
  }

  async loadRevision(
    projectId: string,
    revisionId: string,
  ): Promise<{ revision: Revision; document: DesignDocument }> {
    const state = this.getDocument(projectId);
    const revision = this.getRevision(state, revisionId);
    const document = this.deserializeAndValidate(revision.document);
    return { revision, document };
  }

  async restore(
    projectId: string,
    revisionId: string,
    summary: RevisionSummary,
  ): Promise<{ revisionId: string; revisionNumber: number }> {
    const state = this.getDocument(projectId);
    const source = this.getRevision(state, revisionId);

    const document = this.deserializeAndValidate(source.document);
    assertValidDocument(document);

    const serialized: string = serializeDocument(document);
    const nextNumber = state.currentRevisionNumber + 1;
    const restoredRevisionId = revisionIdFor(nextNumber);
    const revision: Revision = {
      id: restoredRevisionId,
      projectId,
      revisionNumber: nextNumber,
      document: serialized,
      createdAt: new Date().toISOString(),
      parentRevisionId: state.currentRevisionId,
      changeSet: this.buildChangeSetFromSummary(summary),
    };

    state.currentRevisionId = restoredRevisionId;
    state.currentRevisionNumber = nextNumber;
    state.revisions.set(restoredRevisionId, revision);

    return { revisionId: restoredRevisionId, revisionNumber: nextNumber };
  }

  // ---------------------------------------------------------------------------

  private getDocument(projectId: string): DocumentState {
    const state = this.documents.get(projectId);
    if (state === undefined) {
      throw new DocumentNotFoundError(projectId);
    }
    return state;
  }

  private getRevision(state: DocumentState, revisionId: string): Revision {
    const revision = state.revisions.get(revisionId);
    if (revision === undefined) {
      throw new DocumentPersistenceError(`Revision "${revisionId}" does not exist.`);
    }
    return revision;
  }

  private checkConcurrency(state: DocumentState, expected: string | null): void {
    if (expected === null) {
      return;
    }
    if (state.currentRevisionId !== expected) {
      throw new RevisionConflictError(
        expected,
        `Stale revision: current is revision ${state.currentRevisionNumber}, expected ${expected}.`,
      );
    }
  }

  private buildInitialDocument(input: CreateDocumentInput): DesignDocument {
    const rootId: NodeId = nodeIdFor("root") as NodeId;
    const root = createCanvasNode({
      id: rootId,
      name: "Canvas",
      width: 1080,
      height: 1350,
      background: "#ffffff",
    });

    const now = new Date().toISOString();
    return {
      id: input.id as DocumentId,
      version: 1,
      name: input.name,
      canvas: { width: 1080, height: 1350, background: "#ffffff" },
      rootNodeId: rootId,
      metadata: {
        createdAt: now,
        updatedAt: now,
        source: input.metadata.source ?? "aiphotoshop",
      },
      nodes: { [rootId]: root },
    };
  }

  /**
   * Build a ChangeSet from a lightweight RevisionSummary.
   *
   * This stores operation names only (not full payloads) because the summary
   * is metadata, not executable. The resulting ChangeSet has empty operations
   * and is suitable for storage when we only have audit metadata.
   */
  private buildChangeSetFromSummary(summary: RevisionSummary | undefined): ChangeSet | null {
    if (!summary || summary.operationCount === 0) {
      return null;
    }
    // Store as a ChangeSet with the summary's metadata but no executable ops.
    // The operations array is empty because the summary only contains names.
    return {
      id: `cs-${summary.description ?? "edit"}`,
      source: summary.source,
      operations: [],
      description: summary.description ?? undefined,
    };
  }

  private deserializeAndValidate(serialized: string): DesignDocument {
    try {
      return deserializeDocument(serialized);
    } catch (error) {
      throw new DocumentDeserializationError(
        `Stored document could not be deserialized: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------

function revisionIdFor(number: number): string {
  return `rev-${number}`;
}

function nodeIdFor(label: string): string {
  return `node-${label}`;
}
