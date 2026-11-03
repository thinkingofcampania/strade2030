-- =====================================================================
--  STRADE 2030 · Aggiornamento 8
--  La commissione può eliminare un clan (per esempio un account doppio).
--  Si cancellano anche tutti i suoi dati collegati. Solo la commissione.
--  Incolla in Supabase > SQL Editor > New query > Run. Non cancella dati.
-- =====================================================================
create or replace function public.elimina_clan(p_clan uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo la commissione'; end if;
  if exists (select 1 from public.admins where user_id = p_clan) then raise exception 'Non si può eliminare un account della commissione'; end if;
  delete from auth.users where id = p_clan and email like '%@clan.strade2030.it';
  if not found then raise exception 'Clan non trovato'; end if;
end;
$$;
revoke all on function public.elimina_clan(uuid) from public;
grant execute on function public.elimina_clan(uuid) to authenticated;
