create table if not exists public.weekly_event_seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  reward_xp integer not null default 120,
  reward_badge_id text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weekly_event_goals (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.weekly_event_seasons(id) on delete cascade,
  code text not null,
  label text not null,
  target integer not null check (target > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_weekly_goal_season_code
  on public.weekly_event_goals(season_id, code);

create index if not exists idx_weekly_seasons_active
  on public.weekly_event_seasons(is_active, starts_at desc);

create index if not exists idx_weekly_goals_season
  on public.weekly_event_goals(season_id, sort_order asc);
