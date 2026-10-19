begin;

create table if not exists public.chess_skin_catalog (
  id text primary key,
  title text not null,
  board_theme smallint not null check (board_theme between 0 and 7),
  asset_path text,
  is_free boolean not null default false
);
create table if not exists public.chess_club_owners (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.chess_player_inventory (
  user_id uuid not null references auth.users(id) on delete cascade,
  skin_id text not null references public.chess_skin_catalog(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, skin_id)
);
create table if not exists public.chess_player_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  equipped_skin text not null default 'classic' references public.chess_skin_catalog(id),
  board_theme smallint not null default 0 check (board_theme between 0 and 7),
  sound_enabled boolean not null default true
);

alter table public.chess_skin_catalog enable row level security;
alter table public.chess_club_owners enable row level security;
alter table public.chess_player_inventory enable row level security;
alter table public.chess_player_preferences enable row level security;

revoke all on public.chess_skin_catalog, public.chess_club_owners,
  public.chess_player_inventory, public.chess_player_preferences from anon, authenticated;
grant select on public.chess_skin_catalog to anon, authenticated;
grant select on public.chess_club_owners, public.chess_player_inventory to authenticated;
grant select, insert, update on public.chess_player_preferences to authenticated;

drop policy if exists chess_catalog_read on public.chess_skin_catalog;
create policy chess_catalog_read on public.chess_skin_catalog for select to anon, authenticated using (true);
drop policy if exists chess_owner_read on public.chess_club_owners;
create policy chess_owner_read on public.chess_club_owners for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists chess_inventory_read on public.chess_player_inventory;
create policy chess_inventory_read on public.chess_player_inventory for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists chess_preferences_read on public.chess_player_preferences;
create policy chess_preferences_read on public.chess_player_preferences for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists chess_preferences_insert on public.chess_player_preferences;
create policy chess_preferences_insert on public.chess_player_preferences for insert to authenticated
  with check ((select auth.uid()) = user_id and (
    exists (select 1 from public.chess_club_owners where user_id = (select auth.uid())) or
    exists (select 1 from public.chess_skin_catalog where id = equipped_skin and is_free) or
    exists (select 1 from public.chess_player_inventory where user_id = (select auth.uid()) and skin_id = equipped_skin)
  ));
drop policy if exists chess_preferences_update on public.chess_player_preferences;
create policy chess_preferences_update on public.chess_player_preferences for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and (
    exists (select 1 from public.chess_club_owners where user_id = (select auth.uid())) or
    exists (select 1 from public.chess_skin_catalog where id = equipped_skin and is_free) or
    exists (select 1 from public.chess_player_inventory where user_id = (select auth.uid()) and skin_id = equipped_skin)
  ));

insert into public.chess_skin_catalog(id,title,board_theme,asset_path,is_free) values
 ('classic','Heritage',1,null,true),
 ('modern','Monolith',3,null,false),
 ('mono','Type Club',0,null,false),
 ('cyber','Neon District',4,null,false),
 ('cosmic','Orbit',2,null,false),
 ('samurai','Shogun',5,null,false),
 ('amethyst','Amethyst Royale',6,'assets/amethyst-atlas.webp',false),
 ('halloween','Midnight Coven',7,'assets/halloween-atlas.webp',false)
on conflict (id) do update set title=excluded.title,board_theme=excluded.board_theme,
 asset_path=excluded.asset_path,is_free=excluded.is_free;

commit;
