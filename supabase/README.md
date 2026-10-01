# Supabase

This directory holds the database schema, migrations, and local development
configuration for design document persistence.

## Status: not configured

Supabase is **not** connected. Milestone 001 deliberately contains no database
client, no credentials, and no schema. The directory exists so that persistence
has a defined home when Milestone 004 introduces it.

## Planned use

- `migrations/` — versioned SQL migrations.
- `config.toml` — local Supabase CLI configuration.

## Planned data model

Derived from `docs/LAYER_SYSTEM.md` and `docs/DESIGN_ENGINE.md`:

| Concern     | Stored as                                                      |
| ----------- | -------------------------------------------------------------- |
| Documents   | Serialized design documents, versioned                         |
| Revisions   | Immutable document revisions produced by operation change sets |
| Change sets | The operation lists that produced a revision, with origin      |
| Assets      | Uploaded image and vector assets referenced by image layers    |

Design documents are stored as structured, serializable data. A flattened
preview may exist as a derived convenience, but it is never the record of truth.

## Required environment variables

See `.env.example`. The relevant keys are commented out and must remain so until
Milestone 004:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Do not commit real credentials.
