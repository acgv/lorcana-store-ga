-- RPC paginada para evitar el límite default (1000) y la posible ignorancia de .range() en supabase-js sobre rpc()
-- Uso desde el backend:
--   supabase.rpc('get_cards_with_ink_color_paged', { p_status, p_limit, p_offset, p_type, p_set, p_rarity, p_language })
--
-- Nota: PostgREST puede aplicar db_max_rows; por eso p_limit debe ser <= 1000.

create or replace function public.get_cards_with_ink_color_paged(
  p_status text default 'approved',
  p_limit integer default 1000,
  p_offset integer default 0,
  p_type text default null,
  p_set text default null,
  p_rarity text default null,
  p_language text default null
)
returns table (
  id text,
  name text,
  set text,
  type text,
  rarity text,
  number integer,
  "cardNumber" text,
  price numeric,
  "foilPrice" numeric,
  "normalStock" integer,
  "foilStock" integer,
  image text,
  "productType" text,
  description text,
  "inkColor" text,
  color text,
  status text,
  language text
)
language sql
stable
as $$
  select
    c.id,
    c.name,
    c.set,
    c.type,
    c.rarity,
    c.number,
    c."cardNumber",
    c.price,
    c."foilPrice",
    c."normalStock",
    c."foilStock",
    c.image,
    c."productType",
    c.description,
    c."inkColor",
    null::text as color,
    c.status,
    c.language
  from public.cards c
  where c.status = coalesce(p_status, c.status)
    and (p_type is null or c.type = p_type)
    and (p_set is null or c.set = p_set)
    and (p_rarity is null or c.rarity = p_rarity)
    and (p_language is null or c.language = p_language)
  order by c.id asc
  limit greatest(0, least(coalesce(p_limit, 1000), 1000))
  offset greatest(0, coalesce(p_offset, 0));
$$;


