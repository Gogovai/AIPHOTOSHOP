/**
 * Server-side persistence selection.
 *
 * The application talks to a `DocumentRepository`, never to Supabase directly.
 * This module resolves the implementation once, for the whole server process:
 *
 * - when Supabase credentials are present, the Supabase-backed repository;
 * - otherwise the in-memory repository used for local development and tests.
 *
 * The resolved instance is anchored on `globalThis`. Next may instantiate a
 * server module more than once (pages and route handlers are bundled
 * separately), so a module-level singleton is not enough: the editor page and
 * the save API route must observe the same repository.
 */

import {
  createSupabaseDocumentRepository,
  InMemoryDocumentRepository,
  type DocumentRepository,
} from "@aiphotoshop/document-store";

const globalStore = globalThis as unknown as {
  __aiphotoshopRepository?: DocumentRepository;
};

function resolveRepository(): DocumentRepository {
  if (globalStore.__aiphotoshopRepository !== undefined) {
    return globalStore.__aiphotoshopRepository;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceRoleKey ?? anonKey;

  const repository =
    url !== undefined && url.length > 0 && key !== undefined && key.length > 0
      ? createSupabaseDocumentRepository(url, key, { serviceRole: serviceRoleKey !== undefined })
      : new InMemoryDocumentRepository();

  globalStore.__aiphotoshopRepository = repository;
  return repository;
}

/** The repository the application uses. Resolved once per server process. */
export const documentRepository: DocumentRepository = resolveRepository();
