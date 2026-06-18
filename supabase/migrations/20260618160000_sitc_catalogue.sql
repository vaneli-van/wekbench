-- Stock in the Channel catalogue feed, hosted in our own cloud DB and queried like an
-- API by the sourcing adapter. Populated by the scheduled FTP→Supabase sync job
-- (scripts/sync-sitc.mjs via .github/workflows/sitc-sync.yml).
--
-- NOTE ON RLS (intentional): this is GLOBAL REFERENCE DATA — SITC's catalogue is the
-- same for every workspace and carries no tenant data, so it is NOT workspace-scoped.
-- Any authenticated user may read; only the service role (the sync job) writes. This is
-- a deliberate, reviewed departure from the per-workspace member-RLS pattern.
create extension if not exists pg_trgm;

create table if not exists public.sitc_catalogue (
  sitc_id           text primary key,
  sku               text,
  brand             text,
  name              text,
  short_description text,
  stock             integer,
  price             numeric,
  cost              numeric,
  currency          text not null default 'GBP',
  ean               text,
  image_url         text,
  category          text,
  sub_category      text,
  unspsc            text,
  distributors      jsonb not null default '[]'::jsonb,
  updated_at        timestamptz not null default now()
);

create index if not exists idx_sitc_sku   on public.sitc_catalogue (lower(sku));
create index if not exists idx_sitc_brand on public.sitc_catalogue (lower(brand));
create index if not exists idx_sitc_name_trgm on public.sitc_catalogue using gin (name gin_trgm_ops);

alter table public.sitc_catalogue enable row level security;
drop policy if exists "sitc_catalogue read for authenticated" on public.sitc_catalogue;
create policy "sitc_catalogue read for authenticated"
  on public.sitc_catalogue for select to authenticated using (true);
