-- =====================================================================
--  STRADE 2030 · Schema del database
--  Incolla tutto in Supabase > SQL Editor > New query > Run.
--  Si può rieseguire senza danni.
-- =====================================================================

-- ---------- Organizzatori (commissione) ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users on delete cascade
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- Clan ----------
create table if not exists public.clans (
  id         uuid primary key references auth.users on delete cascade,
  name       text not null check (char_length(name) between 2 and 60),
  city       text not null check (char_length(city) between 2 and 60),
  grp        text check (char_length(grp) <= 60),
  code       text not null unique,
  created_at timestamptz not null default now()
);
alter table public.clans enable row level security;

-- ---------- Chiave delle risposte (non leggibile dai clan) ----------
create table if not exists public.quiz_key (
  goal    int primary key check (goal between 1 and 17),
  correct int not null check (correct between 0 and 3)
);
alter table public.quiz_key enable row level security;
-- Indice (0 = prima opzione) della risposta giusta per ciascun obiettivo.
-- Deve coincidere con il campo "a" in assets/goals.js
insert into public.quiz_key (goal, correct) values
 (1,1),(2,2),(3,2),(4,1),(5,2),(6,2),(7,0),(8,2),(9,1),
 (10,0),(11,1),(12,1),(13,1),(14,0),(15,1),(16,1),(17,1)
on conflict (goal) do update set correct = excluded.correct;

-- ---------- Risposte alla sfida globale (un solo tentativo) ----------
create table if not exists public.quiz_answers (
  clan_id    uuid not null references public.clans on delete cascade,
  goal       int  not null check (goal between 1 and 17),
  answer     int  not null check (answer between 0 and 3),
  created_at timestamptz not null default now(),
  primary key (clan_id, goal)
);
alter table public.quiz_answers enable row level security;

-- ---------- Prove della sfida locale ----------
create table if not exists public.submissions (
  clan_id    uuid not null references public.clans on delete cascade,
  goal       int  not null check (goal between 1 and 17),
  text       text not null check (char_length(text) between 1 and 4000),
  links      text[] not null default '{}' check (cardinality(links) <= 10),
  photos     text[] not null default '{}' check (cardinality(photos) <= 5),
  updated_at timestamptz not null default now(),
  primary key (clan_id, goal)
);
alter table public.submissions enable row level security;

-- ---------- Valutazioni della commissione ----------
create table if not exists public.evaluations (
  clan_id      uuid not null,
  goal         int  not null,
  criteria     jsonb not null default '{}',
  points       int  not null check (points between 0 and 40),
  comment      text check (char_length(comment) <= 1000),
  evaluated_at timestamptz not null default now(),
  primary key (clan_id, goal),
  foreign key (clan_id, goal) references public.submissions (clan_id, goal) on delete cascade
);
alter table public.evaluations enable row level security;

-- =====================================================================
--  REGOLE DI ACCESSO
--  Ogni clan vede e scrive solo i propri dati; la commissione vede tutto
--  e solo la commissione assegna i punti.
-- =====================================================================
drop policy if exists clans_select on public.clans;
drop policy if exists clans_insert on public.clans;
create policy clans_select on public.clans for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy clans_insert on public.clans for insert to authenticated
  with check (id = auth.uid());

drop policy if exists qa_select on public.quiz_answers;
drop policy if exists qa_insert on public.quiz_answers;
create policy qa_select on public.quiz_answers for select to authenticated
  using (clan_id = auth.uid() or public.is_admin());
create policy qa_insert on public.quiz_answers for insert to authenticated
  with check (clan_id = auth.uid());
-- Nessuna policy di update/delete: la risposta non si può cambiare.

drop policy if exists sub_select on public.submissions;
drop policy if exists sub_insert on public.submissions;
drop policy if exists sub_update on public.submissions;
create policy sub_select on public.submissions for select to authenticated
  using (clan_id = auth.uid() or public.is_admin());
create policy sub_insert on public.submissions for insert to authenticated
  with check (clan_id = auth.uid());
create policy sub_update on public.submissions for update to authenticated
  using (clan_id = auth.uid()) with check (clan_id = auth.uid());

drop policy if exists ev_select on public.evaluations;
drop policy if exists ev_admin on public.evaluations;
create policy ev_select on public.evaluations for select to authenticated
  using (clan_id = auth.uid() or public.is_admin());
create policy ev_admin on public.evaluations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
--  CLASSIFICA PUBBLICA
--  Espone solo nome, città, gruppo e punti (mai il codice né le prove).
--  Punti: 10 per risposta giusta, somma delle valutazioni locali,
--  +5 per ogni obiettivo con risposta giusta e missione valutata > 0.
-- =====================================================================
create or replace function public.classifica()
returns table (clan_id uuid, name text, city text, grp text,
               globale int, locale int, bonus int, totale int, completate int)
language sql stable security definer set search_path = public as $$
  with ok as (
    select a.clan_id, a.goal
    from quiz_answers a join quiz_key k on k.goal = a.goal and k.correct = a.answer
  ), p as (
    select c.id, c.name, c.city, c.grp,
      (select count(*) from ok where ok.clan_id = c.id)::int * 10 as globale,
      coalesce((select sum(e.points) from evaluations e where e.clan_id = c.id), 0)::int as locale,
      (select count(*) from ok join evaluations e
         on e.clan_id = ok.clan_id and e.goal = ok.goal and e.points > 0
       where ok.clan_id = c.id)::int * 5 as bonus,
      (select count(*) from evaluations e where e.clan_id = c.id)::int as completate
    from clans c
  )
  select id, name, city, grp, globale, locale, bonus,
         globale + locale + bonus as totale, completate
  from p
  order by totale desc, name;
$$;
revoke all on function public.classifica() from public;
grant execute on function public.classifica() to anon, authenticated;
grant execute on function public.is_admin() to authenticated;

-- =====================================================================
--  PERMESSI ESPLICITI (servono sui progetti Supabase più recenti;
--  le regole qui sopra continuano a decidere chi vede cosa)
-- =====================================================================
grant usage on schema public to anon, authenticated;
grant select, insert on public.clans to authenticated;
grant select, insert on public.quiz_answers to authenticated;
grant select, insert, update on public.submissions to authenticated;
grant select, insert, update, delete on public.evaluations to authenticated;

-- =====================================================================
--  FOTO DELLE PROVE (Storage privato, max 5 MB per foto)
--  Ogni clan carica solo nella propria cartella; la commissione vede tutto.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('prove', 'prove', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists prove_insert on storage.objects;
drop policy if exists prove_select on storage.objects;
create policy prove_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'prove' and (storage.foldername(name))[1] = auth.uid()::text);
create policy prove_select on storage.objects for select to authenticated
  using (bucket_id = 'prove' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
