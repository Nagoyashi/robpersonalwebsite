-- phase3_uptime — endpoint health monitoring (#... Phase 3).
--
-- Extends the control-center schema. Same rules: RLS enabled, NO policies
-- (service-role only). A scheduled pinger (Vercel Cron -> /api/cron/ping)
-- writes uptime_checks; incidents are opened/closed by that same job.

-- ---------------------------------------------------------------------------
-- uptime_checks — one row per ping per monitored project.
-- ---------------------------------------------------------------------------
create table public.uptime_checks (
  id         uuid primary key default gen_random_uuid(),
  project    text not null,
  ok         boolean not null,
  latency_ms integer,
  status     integer,          -- HTTP status, null on network error
  checked_at timestamptz not null default now()
);

create index uptime_checks_project_checked_at_idx
  on public.uptime_checks (project, checked_at desc);

-- ---------------------------------------------------------------------------
-- incidents — a downtime window per project. resolved_at null => still open.
-- Opened after 2 consecutive failures, closed on the first success.
-- ---------------------------------------------------------------------------
create table public.incidents (
  id          uuid primary key default gen_random_uuid(),
  project     text not null,
  started_at  timestamptz not null default now(),
  resolved_at timestamptz,
  note        text not null default ''
);

create index incidents_project_started_at_idx
  on public.incidents (project, started_at desc);

alter table public.uptime_checks enable row level security;
alter table public.incidents     enable row level security;
