-- =====================================================================
--  STRADE 2030 · Aggiornamento 10
--  Quando la commissione elimina un account, il sito se lo ricorda:
--  chi prova a rientrare con quel codice vede "Questo account è stato
--  eliminato dalla commissione perché non valido" (con il motivo).
--  Incolla in Supabase > SQL Editor > New query > Run. Non cancella dati.
-- =====================================================================

-- 1. Registro degli account eliminati (lo legge solo il sito, tramite le funzioni qui sotto)
create table if not exists public.comunita_eliminate (
  user_id      uuid primary key,
  code         text,
  name         text,
  zona         text,
  motivo       text,
  eliminata_at timestamptz not null default now()
);
alter table public.comunita_eliminate enable row level security;
drop policy if exists elim_admin on public.comunita_eliminate;
create policy elim_admin on public.comunita_eliminate for select to authenticated using (public.is_admin());

-- 2. Eliminazione: ora salva anche codice, nome e motivo
drop function if exists public.elimina_clan(uuid);
create or replace function public.elimina_clan(p_clan uuid, p_motivo text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo la commissione'; end if;
  if exists (select 1 from public.admins where user_id = p_clan) then raise exception 'Non si può eliminare un account della commissione'; end if;
  insert into public.comunita_eliminate (user_id, code, name, zona, motivo)
  select c.id, upper(c.code), public.nome_comunita(c.name, c.noviziato), c.zona, nullif(left(btrim(coalesce(p_motivo,'')), 200), '')
  from public.clans c where c.id = p_clan
  on conflict (user_id) do update set motivo = excluded.motivo, eliminata_at = now();
  if not found then
    insert into public.comunita_eliminate (user_id, code, motivo)
    select id, upper(split_part(email,'@',1)), nullif(left(btrim(coalesce(p_motivo,'')), 200), '')
    from auth.users where id = p_clan and email like '%@clan.strade2030.it'
    on conflict (user_id) do nothing;
  end if;
  delete from auth.users where id = p_clan and email like '%@clan.strade2030.it';
  if not found then raise exception 'Comunità R/S non trovata'; end if;
end;
$$;
revoke all on function public.elimina_clan(uuid, text) from public;
grant execute on function public.elimina_clan(uuid, text) to authenticated;

-- 3. Il sito chiede: questo codice è stato eliminato? (risponde solo con il motivo)
create or replace function public.stato_eliminazione(p_code text)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(motivo, 'account non valido')
  from public.comunita_eliminate
  where code = upper(btrim(p_code))
  order by eliminata_at desc limit 1;
$$;
revoke all on function public.stato_eliminazione(text) from public;
grant execute on function public.stato_eliminazione(text) to anon, authenticated;

-- 4. Per chi era già dentro quando è stato eliminato
create or replace function public.mia_eliminazione()
returns text language sql stable security definer set search_path = public as $$
  select coalesce(motivo, 'account non valido') from public.comunita_eliminate where user_id = auth.uid();
$$;
revoke all on function public.mia_eliminazione() from public;
grant execute on function public.mia_eliminazione() to authenticated;
