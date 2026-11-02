-- =====================================================================
--  STRADE 2030 · Aggiornamento 7
--  Bonus "sfida completa": +10 punti per ogni sfida locale con tutte
--  e 3 le prove valutate (sostituisce il vecchio +5 "tappa completa").
--  Incolla in Supabase > SQL Editor > New query > Run. Non cancella dati.
-- =====================================================================
drop function if exists public.classifica();
create function public.classifica()
returns table (clan_id uuid, name text, zona text, grp text,
               globale int, campana int, locale int, bonus int, totale int, completate int)
language sql stable security definer set search_path = public as $$
  with ok as (
    select a.clan_id, a.goal
    from quiz_answers a join quiz_key k on k.goal = a.goal and k.correct = a.answer
  ), complete as (
    select e.clan_id, e.goal
    from evaluations e
    where coalesce((e.criteria->>'d1')::numeric, 0) > 0
      and coalesce((e.criteria->>'d2')::numeric, 0) > 0
      and coalesce((e.criteria->>'d3')::numeric, 0) > 0
  ), p as (
    select c.id, c.name, c.zona, c.grp,
      (select count(*) from ok where ok.clan_id = c.id)::int * 10 as globale,
      coalesce((select sum(e.points) from campana_evals e where e.clan_id = c.id), 0)::int as campana,
      coalesce((select sum(e.points) from evaluations e where e.clan_id = c.id), 0)::int as locale,
      (select count(*) from complete x where x.clan_id = c.id)::int * 10 as bonus,
      (select count(*) from evaluations e where e.clan_id = c.id)::int as completate
    from clans c
  )
  select id, name, zona, grp, globale, campana, locale, bonus,
         globale + campana + locale + bonus as totale, completate
  from p
  order by totale desc, name;
$$;
revoke all on function public.classifica() from public;
grant execute on function public.classifica() to anon, authenticated;
