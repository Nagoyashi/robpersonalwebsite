-- init_control_center — the control-center source of truth (ADR-011, ADR-013).
--
-- Three tables underpin the private /admin plane:
--   * connector_config — the typed connector registry (one row per data source)
--   * snapshots        — point-in-time metric captures written by connectors
--   * audit_log        — owner + timestamp record of every control action
--
-- Access is SERVER-SIDE ONLY: the /admin app reaches Postgres with the
-- service-role key (which bypasses RLS). RLS is therefore ENABLED with NO
-- policies on every table — a deny-by-default lock so the anon/authenticated
-- PostgREST API can never read or write these rows. Auth policies, if ever a
-- client needs direct access, are layered in by #24/#27.

-- ---------------------------------------------------------------------------
-- shared helper: keep updated_at honest on UPDATE
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''  -- pinned: no mutable search_path (Supabase linter 0011)
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- connector_config — the connector registry (ADR-013)
-- One row per (project, source). `project` is a products.ts slug; `source` is
-- a connector key (e.g. 'github'). `config` holds connector-specific settings
-- (e.g. {"owner": "...", "name": "..."}); no secrets live here — those stay in
-- server env vars.
-- ---------------------------------------------------------------------------
create table public.connector_config (
  id         uuid primary key default gen_random_uuid(),
  project    text not null,
  source     text not null,
  enabled    boolean not null default true,
  config     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project, source)
);

create trigger connector_config_set_updated_at
  before update on public.connector_config
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- snapshots — point-in-time metric captures
-- Each row is one connector run's normalized output for one project, stored as
-- a jsonb payload so the schema stays source-agnostic. Intentionally NOT
-- foreign-keyed to connector_config: history must survive a connector being
-- disabled or removed (snapshots outlive their source — ADR-013 resilience).
-- ---------------------------------------------------------------------------
create table public.snapshots (
  id          uuid primary key default gen_random_uuid(),
  project     text not null,
  source      text not null,
  metrics     jsonb not null,
  captured_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- latest-first lookups per project/source (the Unified Ops View read path)
create index snapshots_project_source_captured_at_idx
  on public.snapshots (project, source, captured_at desc);

-- ---------------------------------------------------------------------------
-- audit_log — owner + timestamp trail for every control action (ADR-012)
-- `actor` is the authenticated operator identity (GitHub login); append-only
-- by convention.
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor      text not null,
  action     text not null,
  target     text,
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_created_at_idx
  on public.audit_log (created_at desc);

-- ---------------------------------------------------------------------------
-- Lock everything down: RLS on, zero policies => only the service role (server)
-- can read/write. The public anon/authenticated API is denied by default.
-- ---------------------------------------------------------------------------
alter table public.connector_config enable row level security;
alter table public.snapshots        enable row level security;
alter table public.audit_log        enable row level security;
