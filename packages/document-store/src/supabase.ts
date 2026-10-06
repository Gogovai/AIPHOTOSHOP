/**
 * Supabase client wrapper for the document-store package.
 *
 * This module is the ONLY place in the repository that knows about Supabase.
 * Editor components and application code must never import it: they talk to the
 * {@link DocumentRepository} interface instead.
 *
 * Security notes:
 *
 * - The browser must only ever use the anon key. This module is intended to be
 *   instanced on the server (or in a server action/API route) with the service
 *   role key when privileged writes are required.
 * - All queries go through the Supabase JS client's parameterized API. We never
 *   concatenate values into SQL strings, and document/revision ids are treated as
 *   opaque text.
 * - Stored document payloads are deserialized and validated at the persistence
 *   boundary before they are returned to the editor.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { DocumentPersistenceError } from "./errors";

/** Config used to instantiate a Supabase client for document-store. */
export interface SupabaseConfig {
  /** Public Supabase project URL. */
  url: string;
  /** Anon key (browser) or service role key (server, for privileged writes). */
  key: string;
  /** When true, the client is assumed to hold the service role key and can
   * perform privileged operations. Use only on the server. */
  serviceRole?: boolean;
}

/** A Supabase client scoped to the document-store tables. */
export function createDocumentStoreClient(config: SupabaseConfig): SupabaseClient {
  return createClient(config.url, config.key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: "public",
    },
  });
}

// ---------------------------------------------------------------------------
// Parameterized query helpers
//
// These helpers keep the repository implementation readable and make it obvious
// that every value is passed as a parameter. Document ids, revision ids, and
// revision numbers are all opaque from the DB's perspective.
// ---------------------------------------------------------------------------

/** Row shape returned by `select * from documents`. */
export interface DocumentRow {
  id: string;
  name: string;
  current_revision_id: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Row shape returned by `select * from revisions`. */
export interface RevisionRow {
  id: string;
  document_id: string;
  revision_number: number;
  document: object;
  created_at: string;
  parent_revision_id: string | null;
  change_summary: object | null;
}

/** Rows returned by the revisions-for-document listing query. */
export interface RevisionListRow {
  id: string;
  document_id: string;
  revision_number: number;
  created_at: string;
  parent_revision_id: string | null;
  change_summary: object | null;
}

/** Read a single document row, or null. */
export async function fetchDocument(
  client: SupabaseClient,
  projectId: string,
): Promise<DocumentRow | null> {
  const { data, error } = await client
    .from("documents")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    throw new DocumentPersistenceError(`Failed to fetch document: ${error.message}`);
  }
  return data ?? null;
}

/** Read a single revision row by id, or null. */
export async function fetchRevision(
  client: SupabaseClient,
  revisionId: string,
): Promise<RevisionRow | null> {
  const { data, error } = await client
    .from("revisions")
    .select("*")
    .eq("id", revisionId)
    .maybeSingle();

  if (error) {
    throw new DocumentPersistenceError(`Failed to fetch revision: ${error.message}`);
  }
  return data ?? null;
}

/** List revision metadata for a document, ordered by revision number. */
export async function listRevisionsForDocument(
  client: SupabaseClient,
  projectId: string,
): Promise<readonly RevisionListRow[]> {
  const { data, error } = await client
    .from("revisions")
    .select("id, document_id, revision_number, created_at, parent_revision_id, change_summary")
    .eq("document_id", projectId)
    .order("revision_number", { ascending: true });

  if (error) {
    throw new DocumentPersistenceError(`Failed to list revisions: ${error.message}`);
  }
  return (data ?? []) as readonly RevisionListRow[];
}
