/**
 * Supabase-backed DocumentRepository implementation.
 *
 * Stores serialized DesignDocument revisions in PostgreSQL. The editor never
 * imports this file directly: the app composes the right implementation and
 * passes a DocumentRepository to the editor.
 *
 * Atomicity. `create`, `save`, and `restore` call the SQL functions defined in
 * `supabase/migrations/001-design-documents.sql` through `rpc`. Each function
 * runs in a single database transaction and locks the document row, so a
 * revision insert and the document's current-revision pointer can never
 * diverge, and concurrent saves cannot mint duplicate revision numbers.
 *
 * Validation. Every stored payload is parsed and validated with
 * `parseDocument` before it is returned, so a corrupt row never reaches the
 * editor. Stored values are JSONB objects, not strings.
 */

import type { PostgrestError } from "@supabase/supabase-js";

import {
  assertValidDocument,
  createDocument,
  DocumentParseError,
  DocumentValidationError as SchemaDocumentValidationError,
  parseDocument,
  serializeDocument,
  type DesignDocument,
  type DocumentId,
} from "@aiphotoshop/design-schema";

import {
  DocumentDeserializationError,
  DocumentNotFoundError,
  DocumentPersistenceError,
  DocumentValidationError,
  RevisionConflictError,
} from "./errors";
import type {
  ChangeSet,
  CreateDocumentInput,
  ListRevisionsResult,
  LoadRevisionResult,
  Revision,
  RevisionSummary,
  SaveDocumentInput,
} from "./model";
import type { DocumentRepository } from "./repository";
import {
  createDocumentStoreClient,
  fetchDocument,
  fetchRevision,
  listRevisionsForDocument,
} from "./supabase";

export const SUPABASE_ENV = {
  url: "NEXT_PUBLIC_SUPABASE_URL",
  anonKey: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  serviceRoleKey: "SUPABASE_SERVICE_ROLE_KEY",
} as const;

export function createSupabaseDocumentRepository(
  url: string,
  key: string,
  options?: { serviceRole?: boolean },
): DocumentRepository {
  const client = createDocumentStoreClient({ url, key, serviceRole: options?.serviceRole });
  return new SupabaseDocumentRepository(client);
}

class SupabaseDocumentRepository implements DocumentRepository {
  constructor(private readonly client: ReturnType<typeof createDocumentStoreClient>) {}

  async create(input: CreateDocumentInput): Promise<{
    projectId: string;
    revisionId: string;
    document: DesignDocument;
  }> {
    const document = this.createDocumentNode(input);
    assertValidDocument(document);

    const { data, error } = await this.client.rpc("create_document_record", {
      p_id: input.id,
      p_name: input.name,
      p_document: documentAsDbValue(document),
    });
    if (error) throw this.mapWriteError(error, input.id, null);

    const { revisionId } = unwrapRevisionResult(data);
    return { projectId: input.id, revisionId, document };
  }

  async load(projectId: string): Promise<{ revisionId: string; document: DesignDocument }> {
    const doc = await fetchDocument(this.client, projectId);
    if (doc === null) throw new DocumentNotFoundError(projectId);
    if (doc.current_revision_id === null) {
      throw new DocumentPersistenceError(`Document "${projectId}" has no current revision.`);
    }
    const revision = await fetchRevision(this.client, doc.current_revision_id);
    if (revision === null) {
      throw new DocumentPersistenceError(
        `Document "${projectId}" references a missing current revision.`,
      );
    }
    return { revisionId: revision.id, document: this.parseStoredDocument(revision.document) };
  }

  async save(input: SaveDocumentInput): Promise<{ revisionId: string; revisionNumber: number }> {
    assertValidDocument(input.document);

    const { data, error } = await this.client.rpc("create_document_revision", {
      p_document_id: input.document.id,
      p_document: documentAsDbValue(input.document),
      p_name: input.document.name,
      p_expected_current_revision_id: input.expectedCurrentRevisionId,
      p_change_summary: changeSetAsDbValue(
        this.buildChangeSet(input.summary?.operations ?? [], input.summary?.description ?? null),
      ),
    });
    if (error) throw this.mapWriteError(error, input.document.id, input.expectedCurrentRevisionId);

    return unwrapRevisionResult(data);
  }

  async listRevisions(projectId: string): Promise<ListRevisionsResult> {
    const doc = await fetchDocument(this.client, projectId);
    if (doc === null) throw new DocumentNotFoundError(projectId);

    const rows = await listRevisionsForDocument(this.client, projectId);
    const revisions: Revision[] = rows.map((row) => ({
      id: row.id,
      projectId: row.document_id,
      revisionNumber: row.revision_number,
      // History listings deliberately omit the payload; load it per revision.
      document: "",
      createdAt: row.created_at,
      parentRevisionId: row.parent_revision_id,
      changeSet: row.change_summary ? dbValueToChangeSet(row.change_summary) : null,
    }));
    return { revisions, currentRevisionId: doc.current_revision_id };
  }

  async loadRevision(projectId: string, revisionId: string): Promise<LoadRevisionResult> {
    const doc = await fetchDocument(this.client, projectId);
    if (doc === null) throw new DocumentNotFoundError(projectId);
    const row = await fetchRevision(this.client, revisionId);
    if (row === null || row.document_id !== projectId) {
      throw new DocumentPersistenceError(`Revision "${revisionId}" does not exist.`);
    }

    const document = this.parseStoredDocument(row.document);
    const revision: Revision = {
      id: row.id,
      projectId: row.document_id,
      revisionNumber: row.revision_number,
      document: JSON.stringify(row.document),
      createdAt: row.created_at,
      parentRevisionId: row.parent_revision_id,
      changeSet: row.change_summary ? dbValueToChangeSet(row.change_summary) : null,
    };
    return { revision, document };
  }

  async restore(
    projectId: string,
    revisionId: string,
    summary: RevisionSummary,
  ): Promise<{ revisionId: string; revisionNumber: number }> {
    const doc = await fetchDocument(this.client, projectId);
    if (doc === null) throw new DocumentNotFoundError(projectId);
    const source = await fetchRevision(this.client, revisionId);
    if (source === null || source.document_id !== projectId) {
      throw new DocumentPersistenceError(`Revision "${revisionId}" does not exist.`);
    }

    // Re-validate the stored revision before writing it forward; never trust
    // stored bytes even when restoring an earlier version.
    const document = this.parseStoredDocument(source.document);

    const { data, error } = await this.client.rpc("create_document_revision", {
      p_document_id: projectId,
      p_document: documentAsDbValue(document),
      p_name: document.name,
      p_expected_current_revision_id: null,
      p_change_summary: changeSetAsDbValue(
        this.buildChangeSet(summary.operations ?? [], summary.description ?? "restore"),
      ),
    });
    if (error) throw this.mapWriteError(error, projectId, null);

    return unwrapRevisionResult(data);
  }

  // -------------------------------------------------------------------------

  private createDocumentNode(input: CreateDocumentInput): DesignDocument {
    const now = new Date().toISOString();
    const base = createDocument({ name: input.name });
    return {
      ...base,
      id: input.id as DocumentId,
      metadata: { createdAt: now, updatedAt: now, source: input.metadata.source ?? "aiphotoshop" },
    };
  }

  private parseStoredDocument(value: unknown): DesignDocument {
    try {
      return parseDocument(value);
    } catch (error) {
      if (error instanceof DocumentParseError) {
        throw new DocumentDeserializationError(
          `Stored document could not be parsed: ${error.message}`,
        );
      }
      if (error instanceof SchemaDocumentValidationError) {
        throw new DocumentValidationError(error.errors);
      }
      throw new DocumentDeserializationError(
        `Stored document could not be deserialized: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private mapWriteError(error: PostgrestError, projectId: string, expected: string | null): Error {
    const message = error.message ?? "";
    if (message.includes("STALE_REVISION")) {
      return new RevisionConflictError(
        expected ?? "unknown",
        "Stale revision: the document changed since it was loaded.",
      );
    }
    if (message.includes("DOCUMENT_NOT_FOUND")) {
      return new DocumentNotFoundError(projectId);
    }
    if (message.includes("DOCUMENT_ALREADY_EXISTS")) {
      return new DocumentPersistenceError(`Document "${projectId}" already exists.`);
    }
    return new DocumentPersistenceError(`Document write failed: ${message}`);
  }

  /**
   * Build a ChangeSet from a RevisionSummary for storage.
   *
   * Stores lightweight metadata only; not executable. For executable
   * ChangeSets, the caller should provide complete ChangeSetOperation values.
   */
  private buildChangeSet(summary: RevisionSummary | undefined): ChangeSet | null {
    if (!summary || summary.operationCount === 0) return null;
    return {
      id: `cs-${summary.description ?? "edit"}`,
      source: summary.source,
      operations: [],
      description: summary.description ?? undefined,
    };
  }
}

/** Row shape returned by the atomic revision functions. */
interface RevisionRpcRow {
  readonly revision_id: string;
  readonly revision_number: number;
}

function unwrapRevisionResult(data: unknown): { revisionId: string; revisionNumber: number } {
  const first = Array.isArray(data)
    ? (data[0] as RevisionRpcRow | undefined)
    : (data as RevisionRpcRow | null);
  if (
    first === null ||
    first === undefined ||
    typeof first.revision_id !== "string" ||
    typeof first.revision_number !== "number"
  ) {
    throw new DocumentPersistenceError("Revision write returned an unexpected result.");
  }
  return { revisionId: first.revision_id, revisionNumber: first.revision_number };
}

function documentAsDbValue(document: DesignDocument): object {
  return JSON.parse(serializeDocument(document)) as object;
}

function changeSetAsDbValue(changeSet: ChangeSet | null): object | null {
  return changeSet ? JSON.parse(JSON.stringify(changeSet)) : null;
}

function dbValueToChangeSet(value: object): ChangeSet {
  return JSON.parse(JSON.stringify(value)) as ChangeSet;
}
