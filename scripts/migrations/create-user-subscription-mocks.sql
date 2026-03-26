-- Mock subscription mode (temporary while Lemon is not fully integrated)
create table if not exists public.user_subscription_mocks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mode text not null check (mode in ('free', 'pro')),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_subscription_mocks_mode
  on public.user_subscription_mocks(mode);
