-- phase2_notes_marketing — tables for the Notes + Marketing pages (#47).
--
-- Extends the control-center schema (#23). Same rules: RLS enabled with NO
-- policies (deny-by-default) — the /admin app reaches these with the
-- service-role key only; the anon/authenticated PostgREST API can't touch them.
-- Reuses public.set_updated_at() from the init migration.

-- ---------------------------------------------------------------------------
-- notes — Apple-Notes-style scratchpad. Body is the source of truth; the title
-- is derived (first non-empty line) at render time, not stored.
-- ---------------------------------------------------------------------------
create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  folder     text not null default 'Projects' check (folder in ('Projects', 'Ideas', 'Personal')),
  body       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

create index notes_updated_at_idx on public.notes (updated_at desc);

-- ---------------------------------------------------------------------------
-- marketing_items — content pipeline kanban. `project` is a products.ts slug.
-- ---------------------------------------------------------------------------
create table public.marketing_items (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  channel       text not null check (channel in ('X', 'LinkedIn', 'Reddit', 'Blog', 'Email', 'PH')),
  project       text,
  status        text not null default 'idea' check (status in ('idea', 'draft', 'scheduled', 'published')),
  scheduled_for date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger marketing_items_set_updated_at
  before update on public.marketing_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- seo_articles — SEO pipeline. `words` is the (nullable) word count.
-- ---------------------------------------------------------------------------
create table public.seo_articles (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  keyword    text not null,
  project    text,
  words      integer,
  status     text not null default 'idea' check (status in ('idea', 'draft', 'scheduled', 'published')),
  url        text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger seo_articles_set_updated_at
  before update on public.seo_articles
  for each row execute function public.set_updated_at();

-- Lock everything down: RLS on, zero policies => service role (server) only.
alter table public.notes           enable row level security;
alter table public.marketing_items enable row level security;
alter table public.seo_articles    enable row level security;
