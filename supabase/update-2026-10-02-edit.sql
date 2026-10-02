-- Hoofprint update: let people edit their own posts (same device).
-- Run once in Supabase: SQL Editor → New query → paste → Run. Safe to run again.

create or replace function public.update_own_route(target uuid, dev uuid, p jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if char_length(coalesce(p->>'name','')) not between 1 and 80
     or char_length(coalesce(p->>'region','')) > 80
     or char_length(coalesce(p->>'description','')) > 800
     or (p->>'difficulty') not in ('leicht','mittel','schwer')
     or jsonb_typeof(coalesce(p->'surfaces','{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p->'features','[]'::jsonb)) <> 'array' then
    raise exception 'invalid route data';
  end if;
  update public.routes set
    name        = p->>'name',
    region      = nullif(p->>'region',''),
    difficulty  = p->>'difficulty',
    surfaces    = coalesce(p->'surfaces','{}'::jsonb),
    features    = coalesce(array(select jsonb_array_elements_text(p->'features')), '{}'),
    description = nullif(p->>'description','')
  where id = target and device_id = dev and not hidden;
  return found;
end $$;

create or replace function public.update_own_review(target uuid, dev uuid, p_name text, p_stars int, p_text text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if p_stars not between 1 and 5 or char_length(coalesce(p_name,'')) > 60 or char_length(coalesce(p_text,'')) > 600 then
    raise exception 'invalid review data';
  end if;
  update public.reviews set name = p_name, stars = p_stars, text = p_text
  where id = target and device_id = dev and not hidden;
  return found;
end $$;

revoke all on function public.update_own_route(uuid, uuid, jsonb) from public;
revoke all on function public.update_own_review(uuid, uuid, text, int, text) from public;
grant execute on function public.update_own_route(uuid, uuid, jsonb) to anon, authenticated;
grant execute on function public.update_own_review(uuid, uuid, text, int, text) to anon, authenticated;
