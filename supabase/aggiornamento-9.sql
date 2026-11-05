-- =====================================================================
--  STRADE 2030 · Aggiornamento 9
--  Comunità R/S: oltre al nome del clan si può indicare il nome del
--  noviziato. Le pagine pubbliche mostrano il nome completo, per esempio
--  "Clan Croce del Sud e Noviziato Stella Polare".
--  Incolla in Supabase > SQL Editor > New query > Run. Non cancella dati.
-- =====================================================================

-- 1. Nuova colonna, modificabile dalla comunità stessa
alter table public.clans add column if not exists noviziato text
  check (noviziato is null or char_length(noviziato) <= 60);
grant update (members, photo, email, noviziato) on public.clans to authenticated;

-- 2. Nome completo della comunità
create or replace function public.nome_comunita(p_clan text, p_noviziato text)
returns text language sql immutable as $$
  select p_clan || case when nullif(btrim(p_noviziato), '') is not null then ' e ' || btrim(p_noviziato) else '' end;
$$;

-- 3. Galleria
drop function if exists public.galleria();
create function public.galleria()
returns table (clan_id uuid, name text, grp text, zona text, members text[], photo text)
language sql stable security definer set search_path = public as $$
  select id, public.nome_comunita(name, noviziato), grp, zona, members, photo
  from clans where not hidden
  order by zona, name;
$$;
revoke all on function public.galleria() from public;
grant execute on function public.galleria() to anon, authenticated;

-- 4. Classifica (stesso calcolo dell'aggiornamento 7, con il nome completo)
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
    select c.id, public.nome_comunita(c.name, c.noviziato) as name, c.zona, c.grp,
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

-- 5. Obiettivi di futuro (stesse regole dell'aggiornamento 4, con il nome completo)
create or replace function public.scelte_pubbliche()
returns table (livello text, soggetto text, nome text, zona text, grp text, goal int, perche text)
language sql stable security definer set search_path = public as $$
  select s.livello, s.soggetto,
         case when s.livello = 'clan' then public.nome_comunita(c.name, c.noviziato) else s.soggetto end,
         case when s.livello = 'clan' then c.zona when s.livello = 'zona' then s.soggetto end,
         c.grp, s.goal, s.perche
  from scelte s
  left join clans c on s.livello = 'clan' and c.id::text = s.soggetto
  where s.livello <> 'clan'
     or (c.id is not null and (public.is_admin() or c.id = auth.uid()))
  order by 1, 4, 3, 6;
$$;
revoke all on function public.scelte_pubbliche() from public;
grant execute on function public.scelte_pubbliche() to anon, authenticated;
