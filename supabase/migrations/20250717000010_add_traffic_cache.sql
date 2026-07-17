create table if not exists traffic_cache (
  key text primary key,
  points jsonb not null,
  fetched_at timestamptz not null default now()
);
