-- phase4_digests — the AI "state of the fleet" briefs (ADR-015, #60).
--
-- Extends the control-center schema. Same rules: RLS enabled, NO policies
-- (service-role only). One row per synthesized digest, written by the
-- scheduled /api/cron/digest job and read by /admin. `summary` is markdown;
-- `highlights` is a jsonb array of one-line callouts.

create table public.digests (
  id         uuid primary key default gen_random_uuid(),
  period     text not null,                 -- 'daily' | ...
  summary    text not null,                 -- markdown brief
  highlights jsonb not null default '[]'::jsonb,
  model      text,                          -- model id that synthesized it
  created_at timestamptz not null default now()
);

create index digests_created_at_idx
  on public.digests (created_at desc);

alter table public.digests enable row level security;
