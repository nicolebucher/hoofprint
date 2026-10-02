-- Hufspur database setup for Supabase.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste this file → Run.
-- No user accounts: visitors post anonymously. Each post stores a random device_id
-- that the public can't read; it allows deleting your own posts and, later, claiming them for an account.

create extension if not exists pgcrypto;

-- ---------- tables ----------
create table if not exists public.routes (
  id          uuid primary key,
  name        text not null check (char_length(name) between 1 and 80),
  region      text check (char_length(region) <= 80),
  difficulty  text not null check (difficulty in ('leicht','mittel','schwer')),
  surfaces    jsonb not null default '{}'::jsonb,
  features    text[] not null default '{}',
  description text check (char_length(description) <= 800),
  coords      jsonb not null check (jsonb_typeof(coords) = 'array' and jsonb_array_length(coords) between 2 and 1000),
  source      text check (char_length(source) <= 40),
  device_id   uuid not null,
  user_id     uuid,                       -- filled in once optional accounts exist
  hidden      boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.reviews (
  id         uuid primary key,
  route_id   text not null,               -- text so example routes (e.g. 's-heide') can be reviewed too
  name       text check (char_length(name) <= 60),
  stars      int not null check (stars between 1 and 5),
  text       text check (char_length(text) <= 600),
  device_id  uuid not null,
  user_id    uuid,
  hidden     boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.photos (
  id         uuid primary key,
  route_id   text not null,
  path       text not null check (char_length(path) <= 200),
  device_id  uuid not null,
  user_id    uuid,
  hidden     boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('route','review','photo')),
  target_id  text not null,
  reason     text check (char_length(reason) <= 200),
  created_at timestamptz not null default now()
);

create index if not exists reviews_route_idx on public.reviews(route_id);
create index if not exists photos_route_idx  on public.photos(route_id);
create index if not exists routes_device_idx on public.routes(device_id, created_at);
create index if not exists reports_target_idx on public.reports(kind, target_id);

-- ---------- row level security ----------
alter table public.routes  enable row level security;
alter table public.reviews enable row level security;
alter table public.photos  enable row level security;
alter table public.reports enable row level security;

drop policy if exists "read visible routes"  on public.routes;
drop policy if exists "post routes"          on public.routes;
drop policy if exists "read visible reviews" on public.reviews;
drop policy if exists "post reviews"         on public.reviews;
drop policy if exists "read visible photos"  on public.photos;
drop policy if exists "post photos"          on public.photos;
drop policy if exists "post reports"         on public.reports;

create policy "read visible routes"  on public.routes  for select to anon, authenticated using (not hidden);
create policy "post routes"          on public.routes  for insert to anon, authenticated with check (not hidden and user_id is null);
create policy "read visible reviews" on public.reviews for select to anon, authenticated using (not hidden);
create policy "post reviews"         on public.reviews for insert to anon, authenticated with check (not hidden and user_id is null);
create policy "read visible photos"  on public.photos  for select to anon, authenticated using (not hidden);
create policy "post photos"          on public.photos  for insert to anon, authenticated with check (not hidden and user_id is null and path like route_id || '/%');
create policy "post reports"         on public.reports for insert to anon, authenticated with check (true);

-- The public may read every column except device_id and user_id.
revoke all on public.routes, public.reviews, public.photos, public.reports from anon, authenticated;
grant select (id, name, region, difficulty, surfaces, features, description, coords, source, hidden, created_at) on public.routes to anon, authenticated;
grant select (id, route_id, name, stars, text, hidden, created_at) on public.reviews to anon, authenticated;
grant select (id, route_id, path, hidden, created_at) on public.photos to anon, authenticated;
grant insert (id, name, region, difficulty, surfaces, features, description, coords, source, device_id) on public.routes to anon, authenticated;
grant insert (id, route_id, name, stars, text, device_id) on public.reviews to anon, authenticated;
grant insert (id, route_id, path, device_id) on public.photos to anon, authenticated;
grant insert (kind, target_id, reason) on public.reports to anon, authenticated;

-- ---------- spam brake: at most 10 posts per device per 10 minutes ----------
create or replace function public.limit_posts() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(*) into n from (
    select created_at from public.routes  where device_id = new.device_id and created_at > now() - interval '10 minutes'
    union all
    select created_at from public.reviews where device_id = new.device_id and created_at > now() - interval '10 minutes'
    union all
    select created_at from public.photos  where device_id = new.device_id and created_at > now() - interval '10 minutes'
  ) recent;
  if n >= 10 then
    raise exception 'rate limit: too many posts' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists limit_routes  on public.routes;
drop trigger if exists limit_reviews on public.reviews;
drop trigger if exists limit_photos  on public.photos;
create trigger limit_routes  before insert on public.routes  for each row execute function public.limit_posts();
create trigger limit_reviews before insert on public.reviews for each row execute function public.limit_posts();
create trigger limit_photos  before insert on public.photos  for each row execute function public.limit_posts();

-- ---------- moderation: hide anything with 3 reports until someone checks it ----------
create or replace function public.auto_hide() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(*) into n from public.reports where kind = new.kind and target_id = new.target_id;
  if n >= 3 then
    if new.kind = 'route'  then update public.routes  set hidden = true where id::text = new.target_id; end if;
    if new.kind = 'review' then update public.reviews set hidden = true where id::text = new.target_id; end if;
    if new.kind = 'photo'  then update public.photos  set hidden = true where id::text = new.target_id; end if;
  end if;
  return new;
end $$;

drop trigger if exists auto_hide_reports on public.reports;
create trigger auto_hide_reports after insert on public.reports for each row execute function public.auto_hide();

-- ---------- delete your own post (same device) ----------
create or replace function public.delete_own(kind text, target uuid, dev uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if kind = 'route' then
    delete from public.routes where id = target and device_id = dev;
    if found then
      delete from public.reviews where route_id = target::text;
      delete from public.photos  where route_id = target::text;
      return true;
    end if;
  elsif kind = 'review' then
    delete from public.reviews where id = target and device_id = dev;
    return found;
  elsif kind = 'photo' then
    delete from public.photos where id = target and device_id = dev;
    return found;
  end if;
  return false;
end $$;

revoke all on function public.delete_own(text, uuid, uuid) from public;
grant execute on function public.delete_own(text, uuid, uuid) to anon, authenticated;
revoke all on function public.limit_posts() from public, anon, authenticated;
revoke all on function public.auto_hide()  from public, anon, authenticated;

-- ---------- photo storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 3145728, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg'];

drop policy if exists "upload route photos" on storage.objects;
create policy "upload route photos" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'photos' and name ~ '^[A-Za-z0-9-]+/[0-9a-f-]{36}\.jpg$');

-- ---------- later: claim posts when someone creates an account ----------
-- When optional email-link login is added, a signed-in person calls this once
-- with their device id, and all posts from that device become theirs.
create or replace function public.claim_device(dev uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0; c int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  update public.routes  set user_id = auth.uid() where device_id = dev and user_id is null; get diagnostics c = row_count; n := n + c;
  update public.reviews set user_id = auth.uid() where device_id = dev and user_id is null; get diagnostics c = row_count; n := n + c;
  update public.photos  set user_id = auth.uid() where device_id = dev and user_id is null; get diagnostics c = row_count; n := n + c;
  return n;
end $$;
revoke all on function public.claim_device(uuid) from public, anon;
grant execute on function public.claim_device(uuid) to authenticated;
