-- Cards table
create table if not exists public.cards (
  id text primary key,
  name text not null,
  image text,
  set text not null,
  rarity text not null,
  type text not null,
  number integer not null,
  cardNumber text,
  "inkCost" integer,
  price numeric,
  foilPrice numeric,
  description text,
  version text default 'normal',
  language text default 'en',
  status text default 'approved',
  normalStock integer default 0,
  foilStock integer default 0,
  createdAt timestamptz default now(),
  updatedAt timestamptz default now()
);

create index if not exists cards_status_idx on public.cards(status);
create index if not exists cards_type_idx on public.cards(type);
create index if not exists cards_set_idx on public.cards(set);
create index if not exists cards_rarity_idx on public.cards(rarity);
create index if not exists cards_language_idx on public.cards(language);

-- Submissions table
create table if not exists public.submissions (
  id text primary key,
  card jsonb not null,
  status text default 'pending',
  submittedBy text,
  submittedAt timestamptz default now(),
  reviewedBy text,
  reviewedAt timestamptz,
  rejectionReason text,
  images jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb
);

-- Logs table
create table if not exists public.logs (
  id text primary key,
  userId text,
  action text not null,
  entityType text,
  entityId text,
  details jsonb,
  timestamp timestamptz default now()
);

-- RLS
alter table public.cards enable row level security;
alter table public.submissions enable row level security;
alter table public.logs enable row level security;

-- Public read for approved cards
drop policy if exists "Read approved cards" on public.cards;
create policy "Read approved cards"
  on public.cards
  for select
  using (status = 'approved');

-- Submissions: read own by anon (adjust as needed); for now allow read all
drop policy if exists "Read submissions" on public.submissions;
create policy "Read submissions"
  on public.submissions
  for select
  using (true);

-- Logs: read none by default; allow service role only
-- You may keep no select policy for logs to block anon reads

-- Update triggers
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_cards_updated_at on public.cards;
create trigger set_cards_updated_at
before update on public.cards
for each row
execute procedure public.set_updated_at();


