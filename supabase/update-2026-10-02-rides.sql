-- Hoofprint update 2026-10-02: "Geritten!" check-ins with trail conditions.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.

create table if not exists public.rides (
  id         uuid primary key,
  route_id   text not null,
  name       text check (char_length(name) <= 60),
  horse      text check (char_length(horse) <= 40),
  ridden_on  date not null default current_date check (ridden_on between date '2000-01-01' and current_date + 1),
  conditions text[] not null default '{}' check (cardinality(conditions) <= 6 and conditions <@ array['dry','muddy','highwater','overgrown','blocked','mowed']),
  note       text check (char_length(note) <= 300),
  device_id  uuid not null,
  user_id    uuid,
  hidden     boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists rides_route_idx on public.rides(route_id, ridden_on desc);

alter table public.rides enable row level security;
drop policy if exists "read visible rides" on public.rides;
drop policy if exists "post rides"         on public.rides;
create policy "read visible rides" on public.rides for select to anon, authenticated using (not hidden);
create policy "post rides"         on public.rides for insert to anon, authenticated with check (not hidden and user_id is null);
revoke all on public.rides from anon, authenticated;
grant select (id, route_id, name, horse, ridden_on, conditions, note, hidden, created_at) on public.rides to anon, authenticated;
grant insert (id, route_id, name, horse, ridden_on, conditions, note, device_id) on public.rides to anon, authenticated;

-- spam brake now also counts rides
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
    union all
    select created_at from public.rides   where device_id = new.device_id and created_at > now() - interval '10 minutes'
  ) recent;
  if n >= 10 then
    raise exception 'rate limit: too many posts' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists limit_rides on public.rides;
create trigger limit_rides before insert on public.rides for each row execute function public.limit_posts();

-- rides can be reported and are hidden after 3 reports
alter table public.reports drop constraint if exists reports_kind_check;
alter table public.reports add constraint reports_kind_check check (kind in ('route','review','photo','ride'));
create or replace function public.auto_hide() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(*) into n from public.reports where kind = new.kind and target_id = new.target_id;
  if n >= 3 then
    if new.kind = 'route'  then update public.routes  set hidden = true where id::text = new.target_id; end if;
    if new.kind = 'review' then update public.reviews set hidden = true where id::text = new.target_id; end if;
    if new.kind = 'photo'  then update public.photos  set hidden = true where id::text = new.target_id; end if;
    if new.kind = 'ride'   then update public.rides   set hidden = true where id::text = new.target_id; end if;
  end if;
  return new;
end $$;

-- delete your own ride; deleting a route also removes its rides
create or replace function public.delete_own(kind text, target uuid, dev uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if kind = 'route' then
    delete from public.routes where id = target and device_id = dev;
    if found then
      delete from public.reviews where route_id = target::text;
      delete from public.photos  where route_id = target::text;
      delete from public.rides   where route_id = target::text;
      return true;
    end if;
  elsif kind = 'review' then
    delete from public.reviews where id = target and device_id = dev;
    return found;
  elsif kind = 'photo' then
    delete from public.photos where id = target and device_id = dev;
    return found;
  elsif kind = 'ride' then
    delete from public.rides where id = target and device_id = dev;
    return found;
  end if;
  return false;
end $$;
revoke all on function public.delete_own(text, uuid, uuid) from public;
grant execute on function public.delete_own(text, uuid, uuid) to anon, authenticated;
revoke all on function public.limit_posts() from public, anon, authenticated;
revoke all on function public.auto_hide()  from public, anon, authenticated;
