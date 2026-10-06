# Supabase

This directory holds the database schema and migrations for design document
persistence.

## Status: schema defined, project not connected

Milestone 004 defines the schema in `migrations/001-design-documents.sql`. No
Supabase project is configured in this repository and no credentials are
committed, so the running application uses the in-memory repository from
`@aiphotoshop/document-store`. When credentials are supplied, the app composes
`createSupabaseDocumentRepository(...)` instead.

## Data model

The canonical document model is `DesignDocument` from `@aiphotoshop/design-schema`.
The database stores **serialized revisions of it**; it never holds a second,
competing layer model and never interprets the node tree into rows.

| Table       | Contents                                                                                                                                 |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `documents` | One row per document: id, name, `current_revision_id`, nullable `owner_id`, timestamps.                                                  |
| `revisions` | Immutable snapshots: id, `document_id`, `revision_number`, JSONB `document`, `created_at`, `parent_revision_id`, JSONB `change_summary`. |

Constraints and indexes:

- `unique (document_id, revision_number)` — deterministic, unique revision numbers.
- Foreign keys: `revisions.document_id → documents.id` (cascade),
  `documents.current_revision_id → revisions.id` (set null),
  `revisions.parent_revision_id → revisions.id` (set null).
- Indexes on `(document_id, revision_number)`, `created_at`, and
  `documents.current_revision_id`.

Atomicity and concurrency:

- `create_document_record(...)` and `create_document_revision(...)` run in a
  single transaction and lock the document row, so a revision and the
  document's current-revision pointer can never diverge and concurrent saves
  cannot mint duplicate revision numbers. The repository calls them via `rpc`.
- `create_document_revision(..., expected_current_revision_id, ...)` rejects a
  stale save, which the repository maps to `RevisionConflictError`.

Security:

- RLS is enabled on both tables and denies the public/anon roles by default.
  Server code uses the service-role key, which bypasses RLS. There is no browser
  code path that writes to these tables directly.
- `owner_id` is present so a later auth milestone can add owner-scoped policies
  without a schema change (see the commented example in the migration).

## Migrations

- `migrations/001-design-documents.sql` — documents, revisions, constraints,
  indexes, RLS, and the atomic write functions.

## Required environment variables

See `.env.example`. Do not commit real credentials.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only — never exposed to the browser)
