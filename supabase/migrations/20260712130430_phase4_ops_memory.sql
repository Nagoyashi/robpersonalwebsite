-- phase4_ops_memory — vector "ops memory" for the AI layer (ADR-015, #59).
--
-- Extends the control-center schema. Same rules: RLS enabled, NO policies
-- (service-role only). Rows are embedded server-side via Voyage
-- (voyage-3.5-lite, 1024-d) and written by the app; the digest (#60) reads
-- them by semantic similarity. Storage-agnostic kind/source/metadata so any
-- signal (incidents, notes, decisions) can flow in.
--
-- pgvector lives in the `extensions` schema (Supabase best practice — avoids
-- the extension_in_public lint), so the `vector` type, the `vector_cosine_ops`
-- opclass, and the `<=>` operator are all schema-qualified below.

create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- ops_memory — one embedded memory per row. embedding is null until embedded
-- (graceful when no embeddings key is configured — the row still stores text).
-- ---------------------------------------------------------------------------
create table public.ops_memory (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null,                 -- 'incident' | 'note' | 'decision' | ...
  text       text not null,                 -- the human-readable memory
  embedding  extensions.vector(1024),       -- Voyage voyage-3.5-lite; null if unembedded
  source     text,                          -- provenance (e.g. a project slug)
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Approximate-nearest-neighbour index (cosine). HNSW: strong recall, no training
-- step, and null embeddings are simply not indexed.
create index ops_memory_embedding_idx
  on public.ops_memory using hnsw (embedding extensions.vector_cosine_ops);

create index ops_memory_created_at_idx
  on public.ops_memory (created_at desc);

-- ---------------------------------------------------------------------------
-- match_ops_memory — top-k semantic search by cosine similarity. Called with
-- the service-role client (RLS is bypassed there); pinned search_path per the
-- Supabase linter (0011), same as set_updated_at. The pgvector `<=>` operator
-- is schema-qualified (OPERATOR(extensions.<=>)) so it resolves under the empty
-- search_path.
-- ---------------------------------------------------------------------------
create or replace function public.match_ops_memory(
  query_embedding extensions.vector(1024),
  match_count int default 8
)
returns table (
  id uuid,
  kind text,
  text text,
  source text,
  metadata jsonb,
  created_at timestamptz,
  similarity float
)
language sql
stable
set search_path = ''
as $$
  select
    m.id, m.kind, m.text, m.source, m.metadata, m.created_at,
    1 - (m.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.ops_memory m
  where m.embedding is not null
  order by m.embedding operator(extensions.<=>) query_embedding
  limit match_count;
$$;

alter table public.ops_memory enable row level security;
