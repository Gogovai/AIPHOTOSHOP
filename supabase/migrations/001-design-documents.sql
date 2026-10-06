-- Milestone 004 — Design Document System
-- Initial schema for persisted documents and immutable revisions.
--
-- Design principle: Supabase stores serialized DesignDocument revisions plus
-- metadata. It does NOT hold a second, competing layer model. The canonical
-- document model lives in @aiphotoshop/design-schema and the database only ever
-- sees JSONB payloads + the metadata needed to manage versions.
--
-- Ownership: documents are prepared for future user ownership via `owner_id`.
-- Until authentication is integrated, this field is nullable and row level
-- security denies the public roles; privileged server code uses the service
-- role key (which bypasses RLS). No browser code ever writes directly.
--
-- All multi-statement operations that must be atomic (create, save, restore)
-- are exposed as SQL functions below and invoked through `supabase.rpc(...)`.
-- A revision insert and the document's current-revision pointer can therefore
-- never diverge: they run in one transaction on the server.

begin;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists documents (
  id                  text primary key,
  name                text not null default 'Untitled Design',

  -- Current revision the editor should load by default. The foreign key is
  -- added after `revisions` exists (see below) because the two tables reference
  -- each other.
  current_revision_id text,

  -- Prepared for future user ownership. Nullable until auth is integrated.
  owner_id            text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table documents is
  'One design document / project. The canonical design lives in revisions.';

create table if not exists revisions (
  id                 text primary key,
  document_id        text not null references documents(id) on delete cascade,

  -- Deterministic, unique revision number per document (1, 2, 3, ...).
  revision_number    integer not null,

  -- Serialized DesignDocument payload. The DB never interprets the node tree.
  document           jsonb not null,

  -- When this revision was created.
  created_at         timestamptz not null default now(),

  -- Parent revision id (null for the initial revision).
  parent_revision_id text references revisions(id) on delete set null,

  -- Optional structured change summary for audit and future change-set
  -- reconstruction. Stored as JSONB so the shape can evolve.
  change_summary     jsonb,

  -- Revision numbers are unique per document; concurrent writers cannot create
  -- two revisions with the same number.
  unique (document_id, revision_number)
);

comment on table revisions is
  'Immutable document revisions. Never overwritten; restore creates a new row.';

-- Circular foreign key, added once both tables exist.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'documents_current_revision_id_fkey'
  ) then
    alter table documents
      add constraint documents_current_revision_id_fkey
      foreign key (current_revision_id) references revisions(id) on delete set null;
  end if;
end $$;

-- Indexes for the common access patterns.
create index if not exists revisions_by_document
  on revisions (document_id, revision_number);
create index if not exists revisions_by_created_at
  on revisions (created_at);
create index if not exists documents_current_by_revision
  on documents (current_revision_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- RLS is enabled and denies the public roles by default. There is no
-- authentication yet, so there is no owner-scoped policy to grant. Server-side
-- code uses the service role key (bypassing RLS); the browser never receives it
-- and never talks to these tables directly.
--
-- When auth lands, replace this block with owner-scoped policies, for example:
--
--   create policy documents_owner on documents
--     for all using (owner_id = auth.uid())
--     with check (owner_id = auth.uid());
-- ---------------------------------------------------------------------------

alter table documents enable row level security;
alter table revisions enable row level security;

-- Keep updated_at fresh for documents via a trigger.
create or replace function documents_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists documents_updated_at on documents;
create trigger documents_updated_at
  before update on documents
  for each row
  execute function documents_updated_at();

-- ---------------------------------------------------------------------------
-- Atomic write functions
--
-- These run server-side in a single transaction. Keeping them here means the
-- repository implementation never has to reconstruct transaction semantics from
-- multiple HTTP calls (which cannot be atomic through PostgREST).
-- ---------------------------------------------------------------------------

-- Create a document and its initial revision atomically.
create or replace function create_document_record(
  p_id       text,
  p_name     text,
  p_document jsonb
)
returns table (revision_id text, revision_number integer)
language plpgsql
as $$
declare
  v_revision_id text;
begin
  v_revision_id := p_id || '-rev-1';

  insert into documents (id, name) values (p_id, p_name);
  insert into revisions (id, document_id, revision_number, document, parent_revision_id)
    values (v_revision_id, p_id, 1, p_document, null);
  update documents set current_revision_id = v_revision_id where id = p_id;

  return query select v_revision_id, 1;
exception
  when unique_violation then
    raise exception using
      errcode = 'P0001',
      message = 'DOCUMENT_ALREADY_EXISTS';
end;
$$;

-- Append an immutable revision and advance the document's current revision in
-- one transaction. Locks the document row so concurrent saves serialize, and
-- rejects a save whose `expected_current_revision_id` is stale.
create or replace function create_document_revision(
  p_document_id                 text,
  p_document                    jsonb,
  p_name                        text,
  p_expected_current_revision_id text,
  p_change_summary              jsonb
)
returns table (revision_id text, revision_number integer)
language plpgsql
as $$
declare
  v_current     text;
  v_next_number integer;
  v_revision_id text;
begin
  -- Serialize concurrent writers on this document.
  select current_revision_id into v_current
    from documents
   where id = p_document_id
     for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'DOCUMENT_NOT_FOUND';
  end if;

  if p_expected_current_revision_id is not null
     and v_current is distinct from p_expected_current_revision_id then
    raise exception using
      errcode = 'P0001',
      message = 'STALE_REVISION';
  end if;

  select coalesce(max(revision_number), 0) + 1 into v_next_number
    from revisions
   where document_id = p_document_id;

  v_revision_id := p_document_id || '-rev-' || v_next_number;

  insert into revisions (
    id, document_id, revision_number, document, parent_revision_id, change_summary
  ) values (
    v_revision_id, p_document_id, v_next_number, p_document, v_current, p_change_summary
  );

  update documents
     set current_revision_id = v_revision_id,
         name = p_name
   where id = p_document_id;

  return query select v_revision_id, v_next_number;
end;
$$;

commit;
