-- =====================================================================
--  STRADE 2030 · Aggiornamento: foto del clan, membri e galleria
--  Incolla tutto in Supabase > SQL Editor > New query > Run.
--  Non cancella nessun dato. Si può rieseguire senza danni.
-- =====================================================================

-- ---------- Nuovi campi del clan ----------
alter table public.clans add column if not exists members text[] not null default '{}';
alter table public.clans add column if not exists photo   text;
alter table public.clans add column if not exists hidden  boolean not null default false;
alter table public.clans drop constraint if exists clans_members_max;
alter table public.clans add constraint clans_members_max check (cardinality(members) <= 40);

-- Il clan può aggiornare solo la propria foto e i propri membri
-- (non il nome, non il codice, non la visibilità in galleria).
grant update (members, photo) on public.clans to authenticated;
drop policy if exists clans_update_own on public.clans;
create policy clans_update_own on public.clans for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------- Galleria pubblica ----------
-- Espone solo nome, gruppo, città, membri e foto (mai il codice).
create or replace function public.galleria()
returns table (clan_id uuid, name text, grp text, city text, members text[], photo text)
language sql stable security definer set search_path = public as $$
  select id, name, grp, city, members, photo
  from clans
  where not hidden
  order by name;
$$;
revoke all on function public.galleria() from public;
grant execute on function public.galleria() to anon, authenticated;

-- La commissione può nascondere o mostrare un clan nella galleria.
create or replace function public.nascondi_clan(p_clan uuid, p_hidden boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Solo la commissione';
  end if;
  update clans set hidden = p_hidden where id = p_clan;
end;
$$;
revoke all on function public.nascondi_clan(uuid, boolean) from public;
grant execute on function public.nascondi_clan(uuid, boolean) to authenticated;

-- ---------- Foto dei clan (archivio pubblico, max 5 MB per foto) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('clan', 'clan', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true;

drop policy if exists clan_foto_insert on storage.objects;
drop policy if exists clan_foto_delete on storage.objects;
create policy clan_foto_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'clan' and (storage.foldername(name))[1] = auth.uid()::text);
create policy clan_foto_delete on storage.objects for delete to authenticated
  using (bucket_id = 'clan' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
