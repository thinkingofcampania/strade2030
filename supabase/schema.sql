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

-- =====================================================================
--  STRADE 2030 · Aggiornamento 2
--  Zone, email di riferimento, sfide campane, punteggi per consegna
--  (sfide locali fino a 200), obiettivi di futuro, recupero accesso,
--  risposte delle domande globali protette.
--
--  Incolla tutto in Supabase > SQL Editor > New query > Run.
--  ATTENZIONE: la sezione 0 CANCELLA TUTTI I CLAN (erano di prova).
--  Si può rieseguire: ogni volta cancella di nuovo i clan.
-- =====================================================================

-- ---------- 0. Cancella tutti i clan di prova ----------
-- (spariscono anche risposte, prove, valutazioni, scelte)
delete from auth.users where email like '%@clan.strade2030.it';

-- ---------- 1. Clan: zona ed email di riferimento ----------
alter table public.clans add column if not exists zona  text;
alter table public.clans add column if not exists email text;
alter table public.clans alter column city drop not null;
alter table public.clans drop constraint if exists clans_zona_check;
alter table public.clans add constraint clans_zona_check check (zona in
  ('Caserta','Faito','Felix','Hirpinia','Liternum','Napoli','Poseidonia','Salerno','Samnium','Vesuvio','Volturno'));
alter table public.clans drop constraint if exists clans_email_check;
alter table public.clans add constraint clans_email_check
  check (char_length(email) <= 120 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');
alter table public.clans alter column zona  set not null;
alter table public.clans alter column email set not null;
-- il clan può aggiornare foto, membri ed email (non nome, codice, zona)
grant update (members, photo, email) on public.clans to authenticated;

-- ---------- 2. Domande globali: risposte giuste solo nel database ----------
alter table public.quiz_key add column if not exists feedback text;
update public.quiz_key set feedback = $f$La Grameen Bank ("banca del villaggio") presta piccole somme senza garanzie, soprattutto a donne.$f$ where goal = 1;
update public.quiz_key set feedback = $f$Il Programma Alimentare Mondiale è stato premiato per la lotta alla fame e il suo uso come arma di guerra.$f$ where goal = 2;
update public.quiz_key set feedback = $f$Il vaiolo è l'unica malattia umana finora eradicata, grazie a una campagna vaccinale globale.$f$ where goal = 3;
update public.quiz_key set feedback = $f$Malala è stata colpita dai talebani nel 2012 per aver difeso il diritto delle ragazze a studiare.$f$ where goal = 4;
update public.quiz_key set feedback = $f$Il 2 giugno 1946, per il referendum tra monarchia e repubblica e per l'Assemblea Costituente.$f$ where goal = 5;
update public.quiz_key set feedback = $f$Con la risoluzione 64/292 del 28 luglio 2010.$f$ where goal = 6;
update public.quiz_key set feedback = $f$A Larderello, in Toscana, nel 1904 il principe Ginori Conti accese le prime lampadine con il vapore della terra.$f$ where goal = 7;
update public.quiz_key set feedback = $f$L'OIL nasce con il Trattato di Versailles e ha vinto il Nobel per la Pace nel 1969.$f$ where goal = 8;
update public.quiz_key set feedback = $f$La P101 della Olivetti fu usata anche dalla NASA per calcoli legati alle missioni Apollo.$f$ where goal = 9;
update public.quiz_key set feedback = $f$Corrado Gini lo propose nel 1912: 0 indica perfetta uguaglianza, 1 massima disuguaglianza.$f$ where goal = 10;
update public.quiz_key set feedback = $f$Iscritto nel 1995, è uno dei centri storici più estesi d'Europa.$f$ where goal = 11;
update public.quiz_key set feedback = $f$Semplifica la donazione di cibo invenduto e farmaci a enti caritativi.$f$ where goal = 12;
update public.quiz_key set feedback = $f$L'Accordo di Parigi è stato firmato da quasi tutti i Paesi del mondo.$f$ where goal = 13;
update public.quiz_key set feedback = $f$Istituito nel 2002, custodisce resti archeologici e una ricca biodiversità marina.$f$ where goal = 14;
update public.quiz_key set feedback = $f$La Primula palinuri è una specie endemica che cresce solo su alcune scogliere tra Campania, Basilicata e Calabria.$f$ where goal = 15;
update public.quiz_key set feedback = $f$Il suo documento "Per amore del mio popolo non tacerò" è ancora oggi un manifesto di impegno civile.$f$ where goal = 16;
update public.quiz_key set feedback = $f$169 traguardi, misurati da oltre 230 indicatori statistici.$f$ where goal = 17;

-- Registra la risposta (un solo tentativo) e restituisce la soluzione.
create or replace function public.rispondi(p_goal int, p_answer int)
returns table (correct int, feedback text)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Accesso richiesto'; end if;
  insert into quiz_answers (clan_id, goal, answer) values (auth.uid(), p_goal, p_answer);
  return query select k.correct, k.feedback from quiz_key k where k.goal = p_goal;
end;
$$;
-- Le risposte già date dal proprio clan, con soluzione e spiegazione.
create or replace function public.mie_risposte()
returns table (goal int, answer int, correct int, feedback text)
language sql stable security definer set search_path = public as $$
  select a.goal, a.answer, k.correct, k.feedback
  from quiz_answers a join quiz_key k on k.goal = a.goal
  where a.clan_id = auth.uid();
$$;
revoke all on function public.rispondi(int,int) from public;
revoke all on function public.mie_risposte() from public;
grant execute on function public.rispondi(int,int) to authenticated;
grant execute on function public.mie_risposte() to authenticated;

-- ---------- 3. Sfide campane (risposta aperta, 0-10 punti) ----------
create table if not exists public.campana_answers (
  clan_id    uuid not null references public.clans on delete cascade,
  goal       int  not null check (goal between 1 and 17),
  answer     text not null check (char_length(answer) between 1 and 3000),
  updated_at timestamptz not null default now(),
  primary key (clan_id, goal)
);
create table if not exists public.campana_evals (
  clan_id      uuid not null,
  goal         int  not null,
  points       int  not null check (points between 0 and 10),
  comment      text check (char_length(comment) <= 1000),
  evaluated_at timestamptz not null default now(),
  primary key (clan_id, goal),
  foreign key (clan_id, goal) references public.campana_answers (clan_id, goal) on delete cascade
);
-- Risposte di riferimento: le vede e le scrive SOLO la commissione.
create table if not exists public.campana_key (
  goal      int primary key check (goal between 1 and 17),
  reference text check (char_length(reference) <= 4000),
  updated_at timestamptz not null default now()
);
alter table public.campana_answers enable row level security;
alter table public.campana_evals   enable row level security;
alter table public.campana_key     enable row level security;

drop policy if exists ca_select on public.campana_answers;
drop policy if exists ca_insert on public.campana_answers;
drop policy if exists ca_update on public.campana_answers;
create policy ca_select on public.campana_answers for select to authenticated
  using (clan_id = auth.uid() or public.is_admin());
create policy ca_insert on public.campana_answers for insert to authenticated
  with check (clan_id = auth.uid());
-- si può correggere la risposta finché la commissione non l'ha valutata
create policy ca_update on public.campana_answers for update to authenticated
  using (clan_id = auth.uid() and not exists
    (select 1 from public.campana_evals e where e.clan_id = campana_answers.clan_id and e.goal = campana_answers.goal))
  with check (clan_id = auth.uid());

drop policy if exists ce_select on public.campana_evals;
drop policy if exists ce_admin on public.campana_evals;
create policy ce_select on public.campana_evals for select to authenticated
  using (clan_id = auth.uid() or public.is_admin());
create policy ce_admin on public.campana_evals for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists ck_admin on public.campana_key;
create policy ck_admin on public.campana_key for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update on public.campana_answers to authenticated;
grant select, insert, update, delete on public.campana_evals to authenticated;
grant select, insert, update, delete on public.campana_key to authenticated;

-- ---------- 4. Sfide locali: fino a 200 punti, voto per consegna ----------
alter table public.evaluations drop constraint if exists evaluations_points_check;
alter table public.evaluations add constraint evaluations_points_check check (points between 0 and 200);

-- ---------- 5. Classifica ----------
-- 10 per domanda globale giusta, campane (0-10), locali (0-200),
-- +5 per ogni obiettivo con risposta globale giusta e sfida locale valutata > 0.
drop function if exists public.classifica();
create function public.classifica()
returns table (clan_id uuid, name text, zona text, grp text,
               globale int, campana int, locale int, bonus int, totale int, completate int)
language sql stable security definer set search_path = public as $$
  with ok as (
    select a.clan_id, a.goal
    from quiz_answers a join quiz_key k on k.goal = a.goal and k.correct = a.answer
  ), p as (
    select c.id, c.name, c.zona, c.grp,
      (select count(*) from ok where ok.clan_id = c.id)::int * 10 as globale,
      coalesce((select sum(e.points) from campana_evals e where e.clan_id = c.id), 0)::int as campana,
      coalesce((select sum(e.points) from evaluations e where e.clan_id = c.id), 0)::int as locale,
      (select count(*) from ok join evaluations e
         on e.clan_id = ok.clan_id and e.goal = ok.goal and e.points > 0
       where ok.clan_id = c.id)::int * 5 as bonus,
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

-- ---------- 6. Galleria dei clan, con la zona ----------
drop function if exists public.galleria();
create function public.galleria()
returns table (clan_id uuid, name text, grp text, zona text, members text[], photo text)
language sql stable security definer set search_path = public as $$
  select id, name, grp, zona, members, photo
  from clans where not hidden
  order by zona, name;
$$;
revoke all on function public.galleria() from public;
grant execute on function public.galleria() to anon, authenticated;

-- ---------- 7. Obiettivi di futuro (3 livelli: clan, zona, regionale) ----------
-- soggetto: id del clan (livello clan), nome della zona (livello zona),
-- 'Campania' (livello regionale). Ora si usa il livello clan.
create table if not exists public.scelte (
  livello    text not null check (livello in ('clan','zona','regionale')),
  soggetto   text not null check (char_length(soggetto) <= 60),
  goal       int  not null check (goal between 1 and 17),
  perche     text check (char_length(perche) <= 300),
  updated_at timestamptz not null default now(),
  primary key (livello, soggetto, goal)
);
alter table public.scelte enable row level security;
drop policy if exists scelte_admin on public.scelte;
create policy scelte_admin on public.scelte for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.scelte to authenticated;

-- Stato dello sblocco: tutte le 17 globali risposte, tutte le 17 campane
-- inviate, almeno 1 sfida locale consegnata.
create or replace function public.stato_sblocco()
returns table (globali int, campane int, locali int, sbloccato boolean)
language sql stable security definer set search_path = public as $$
  select g::int, c::int, l::int, (g >= 17 and c >= 17 and l >= 1)
  from (select
    (select count(*) from quiz_answers   where clan_id = auth.uid()) as g,
    (select count(*) from campana_answers where clan_id = auth.uid()) as c,
    (select count(*) from submissions    where clan_id = auth.uid()) as l) s;
$$;

-- Salva esattamente 3 obiettivi per il proprio clan (solo se sbloccato).
create or replace function public.salva_scelte(p_goals int[], p_perche text[])
returns void language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  if auth.uid() is null or not exists (select 1 from clans where id = auth.uid()) then
    raise exception 'Accesso richiesto';
  end if;
  select s.sbloccato into ok from public.stato_sblocco() s;
  if not ok then raise exception 'Sezione non ancora sbloccata'; end if;
  if cardinality(p_goals) <> 3 or (select count(distinct x) from unnest(p_goals) x where x between 1 and 17) <> 3 then
    raise exception 'Servono esattamente 3 obiettivi diversi';
  end if;
  delete from scelte where livello = 'clan' and soggetto = auth.uid()::text;
  insert into scelte (livello, soggetto, goal, perche)
  select 'clan', auth.uid()::text, p_goals[i], nullif(left(trim(coalesce(p_perche[i], '')), 300), '')
  from generate_subscripts(p_goals, 1) i;
end;
$$;

-- Vista pubblica delle scelte (nome clan e zona, mai il codice).
create or replace function public.scelte_pubbliche()
returns table (livello text, soggetto text, nome text, zona text, grp text, goal int, perche text)
language sql stable security definer set search_path = public as $$
  select s.livello, s.soggetto,
         case when s.livello = 'clan' then c.name else s.soggetto end,
         case when s.livello = 'clan' then c.zona when s.livello = 'zona' then s.soggetto end,
         c.grp, s.goal, s.perche
  from scelte s
  left join clans c on s.livello = 'clan' and c.id::text = s.soggetto
  where s.livello <> 'clan' or (c.id is not null and not c.hidden)
  order by 1, 4, 3, 6;
$$;
revoke all on function public.stato_sblocco() from public;
revoke all on function public.salva_scelte(int[], text[]) from public;
revoke all on function public.scelte_pubbliche() from public;
grant execute on function public.stato_sblocco() to authenticated;
grant execute on function public.salva_scelte(int[], text[]) to authenticated;
grant execute on function public.scelte_pubbliche() to anon, authenticated;
-- le scelte del clan spariscono se il clan viene cancellato
create or replace function public.pulisci_scelte_clan() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from scelte where livello = 'clan' and soggetto = old.id::text;
  return old;
end;
$$;
drop trigger if exists clans_pulisci_scelte on public.clans;
create trigger clans_pulisci_scelte after delete on public.clans
  for each row execute function public.pulisci_scelte_clan();
delete from public.scelte where livello = 'clan';

-- ---------- 8. Recupero di codice e password ----------
create table if not exists public.richieste_accesso (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  zona       text check (char_length(zona) <= 40),
  clan       text not null check (char_length(clan) between 2 and 80),
  email      text not null check (char_length(email) between 5 and 120),
  messaggio  text check (char_length(messaggio) <= 500),
  gestita    boolean not null default false
);
alter table public.richieste_accesso enable row level security;
drop policy if exists ra_insert on public.richieste_accesso;
drop policy if exists ra_admin on public.richieste_accesso;
create policy ra_insert on public.richieste_accesso for insert to anon, authenticated
  with check (gestita = false);
create policy ra_admin on public.richieste_accesso for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant insert on public.richieste_accesso to anon, authenticated;
grant select, update, delete on public.richieste_accesso to authenticated;

-- La commissione genera una password temporanea per un clan.
create or replace function public.reset_password_clan(p_clan uuid)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare tmp text;
begin
  if not public.is_admin() then raise exception 'Solo la commissione'; end if;
  tmp := 'strade-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);
  update auth.users set encrypted_password = extensions.crypt(tmp, extensions.gen_salt('bf'))
  where id = p_clan and email like '%@clan.strade2030.it';
  if not found then raise exception 'Clan non trovato'; end if;
  return tmp;
end;
$$;
revoke all on function public.reset_password_clan(uuid) from public;
grant execute on function public.reset_password_clan(uuid) to authenticated;

-- =====================================================================
--  STRADE 2030 · Aggiornamento 3
--  - Domande campane a risposta multipla (un tentativo, 10 punti
--    automatici); le risposte giuste stanno SOLO qui nel database.
--  - Sfide locali consegnate via email: il clan segna "inviata",
--    la commissione può registrare una consegna anche da sé.
--  Incolla tutto in Supabase > SQL Editor > New query > Run.
--  Non cancella dati. Si può rieseguire senza danni.
-- =====================================================================

-- ---------- 1. Domande campane a risposta multipla ----------
alter table public.campana_key add column if not exists correct  int check (correct between 0 and 5);
alter table public.campana_key add column if not exists feedback text check (char_length(feedback) <= 1000);
alter table public.campana_answers add column if not exists choice int check (choice between 0 and 5);

-- Risposte giuste e spiegazioni delle 17 domande campane (indice: 0 = prima opzione).
-- Devono corrispondere all'ordine delle opzioni in assets/goals.js.
insert into public.campana_key (goal, correct, feedback) values
 (1, 1, $f$Nel 2024 il 20,8% delle famiglie campane è in povertà relativa: quasi il doppio della media italiana (10,9%) e tra i valori più alti d'Italia.$f$),
 (2, 1, $f$Frutta e verdura fresca sono gli alimenti che finiscono più spesso nella spazzatura di casa, seguiti da pane e derivati.$f$),
 (3, 1, $f$Circa il 12-13% degli adulti campani è obeso, più della media italiana (circa 10%). Sommando il sovrappeso si arriva a circa 1 adulto su 2: la Campania è tra le regioni con i valori più alti.$f$),
 (4, 1, $f$In Campania lascia gli studi prima del tempo circa il 13-16% dei giovani tra 18 e 24 anni, contro meno del 10% della media italiana.$f$),
 (5, 0, $f$Circa 40 sindache su oltre 530 sindaci in carica (dato ottobre 2026): meno di un comune campano su dieci è guidato da una donna.$f$),
 (6, 1, $f$Nella classificazione ARPAC 2021-2023 Sarno, Solofrana e Cavaiola, tutti nel bacino del Sarno, hanno stato ecologico "cattivo": pesano scarichi civili non depurati e industriali (concerie, conserviere). Tristemente noti anche i Regi Lagni.$f$),
 (7, 1, $f$L'eolico: quasi 2 GW di pale, soprattutto in Irpinia e nel Sannio, producono oltre 4 TWh l'anno. La Campania è seconda in Italia per energia prodotta dal vento.$f$),
 (8, 0, $f$Presepi di San Gregorio Armeno, ceramiche di Vietri e corallo e cammei di Torre del Greco sono tradizioni ancora vive. Ma la Campania ha anche la seta di San Leucio, la pasta di Gragnano, la liuteria e molto altro.$f$),
 (9, 1, $f$A San Giovanni a Teduccio, nella periferia est di Napoli, in un'ex area industriale oggi sorge il polo universitario della Federico II con l'Apple Developer Academy: un esempio di innovazione che rigenera un quartiere.$f$),
 (10, 2, $f$In Campania circa il 27% dei giovani tra 15 e 29 anni non studia e non lavora: oltre 10 punti sopra la media italiana (circa 16%) e tra i valori più alti d'Italia.$f$),
 (11, 1, $f$Napoli ha circa 13,5 m² di verde urbano per abitante, contro una media italiana di circa 32,5 m² (Coldiretti su dati ISTAT): meno della metà.$f$),
 (12, 1, $f$Nel 2024 la Campania ha differenziato il 58,05% dei rifiuti urbani: in crescita, ma ancora sotto la media italiana del 67,7% (ISPRA).$f$),
 (13, 0, $f$Il 26 novembre 2022 una colata di fango scese dal monte Epomeo su Casamicciola Terme: 12 vittime. Piogge sempre più intense e un territorio fragile e cementificato sono un mix pericoloso.$f$),
 (14, 2, $f$Nella classificazione 2025 l'88,7% della costa balneabile campana ha acque eccellenti; solo l'1,9% è in classe "scarsa".$f$),
 (15, 2, $f$Nel 2024 il 10,61% del territorio campano risulta consumato, contro una media italiana del 7,17%: la Campania è terza dopo Lombardia e Veneto.$f$),
 (16, 1, $f$Secondo i dati ANBSC del 2023 la Campania ha oltre 3.100 immobili confiscati, terza dopo Sicilia e Calabria. Molti sono tornati alla comunità come cooperative, scuole e centri per ragazzi.$f$),
 (17, 0, $f$Nel 2023 la Campania aveva circa 1,6 enti iscritti al RUNTS ogni 1.000 abitanti, tra i valori più bassi d'Italia, anche perché molte realtà non si erano ancora iscritte al nuovo registro.$f$)
on conflict (goal) do update set correct = excluded.correct, feedback = excluded.feedback;

-- È a risposta multipla? (funzione "sicura": i clan non vedono la tabella)
create or replace function public.campana_mc(p_goal int) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from campana_key where goal = p_goal and correct is not null);
$$;
grant execute on function public.campana_mc(int) to authenticated;

-- Per le domande a risposta multipla non si scrive testo libero.
drop policy if exists ca_insert on public.campana_answers;
create policy ca_insert on public.campana_answers for insert to authenticated
  with check (clan_id = auth.uid() and not public.campana_mc(goal));

-- Risponde (un solo tentativo), registra subito il punteggio, restituisce la soluzione.
create or replace function public.rispondi_campana(p_goal int, p_answer int)
returns table (correct int, feedback text)
language plpgsql security definer set search_path = public as $$
declare k record;
begin
  if auth.uid() is null then raise exception 'Accesso richiesto'; end if;
  select * into k from campana_key where goal = p_goal and campana_key.correct is not null;
  if not found then raise exception 'Domanda non a risposta multipla'; end if;
  insert into campana_answers (clan_id, goal, answer, choice)
    values (auth.uid(), p_goal, 'Opzione ' || (p_answer + 1), p_answer);
  insert into campana_evals (clan_id, goal, points, comment)
    values (auth.uid(), p_goal, case when p_answer = k.correct then 10 else 0 end, null);
  return query select k.correct, k.feedback;
end;
$$;
-- Le proprie risposte multiple, con soluzione e spiegazione.
create or replace function public.mie_campane()
returns table (goal int, choice int, correct int, feedback text)
language sql stable security definer set search_path = public as $$
  select a.goal, a.choice, k.correct, k.feedback
  from campana_answers a join campana_key k on k.goal = a.goal
  where a.clan_id = auth.uid() and a.choice is not null and k.correct is not null;
$$;
-- Se la commissione corregge la risposta giusta, ricalcola i punti.
create or replace function public.ricalcola_campana(p_goal int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo la commissione'; end if;
  update campana_evals e set points = case when a.choice = k.correct then 10 else 0 end, evaluated_at = now()
  from campana_answers a, campana_key k
  where e.clan_id = a.clan_id and e.goal = a.goal and a.goal = p_goal and k.goal = p_goal
    and a.choice is not null and k.correct is not null;
end;
$$;
revoke all on function public.rispondi_campana(int,int) from public;
revoke all on function public.mie_campane() from public;
revoke all on function public.ricalcola_campana(int) from public;
grant execute on function public.rispondi_campana(int,int) to authenticated;
grant execute on function public.mie_campane() to authenticated;
grant execute on function public.ricalcola_campana(int) to authenticated;

-- ---------- 2. Sfide locali consegnate via email ----------
-- La commissione può registrare una consegna (se il clan ha mandato la mail
-- ma non ha premuto "Abbiamo inviato la mail").
drop policy if exists sub_admin on public.submissions;
create policy sub_admin on public.submissions for insert to authenticated
  with check (public.is_admin());


-- =====================================================================
--  STRADE 2030 · Aggiornamento 4
--  Sfide locali a 3 prove (max 30 punti), domande campane a risposta
--  aperta con risposta di riferimento, obiettivi di futuro riservati.
--  Incolla tutto in Supabase > SQL Editor > New query > Run.
--  Non cancella dati. Si può rieseguire senza danni.
-- =====================================================================

-- ---------- 1. Sfide locali: 3 prove da 10 punti, massimo 30 ----------
-- NOT VALID: le valutazioni di prova già salvate restano come sono.
alter table public.evaluations drop constraint if exists evaluations_points_check;
alter table public.evaluations add constraint evaluations_points_check
  check (points between 0 and 30) not valid;

-- ---------- 2. Obiettivi di futuro: ogni clan vede solo le proprie scelte ----------
-- La commissione vede tutto; le scelte di Zona e dell'Agorà restano pubbliche.
create or replace function public.scelte_pubbliche()
returns table (livello text, soggetto text, nome text, zona text, grp text, goal int, perche text)
language sql stable security definer set search_path = public as $$
  select s.livello, s.soggetto,
         case when s.livello = 'clan' then c.name else s.soggetto end,
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

-- ---------- 3. Domande campane: risposta aperta ----------
-- Tolta la risposta multipla (correct = null) e inserita la risposta di
-- riferimento, che vede solo la commissione (scheda Campane).
insert into public.campana_key (goal, reference, correct, feedback, updated_at) values (1, $r$La Campania è la prima regione d'Italia per famiglie beneficiarie e Napoli è la prima provincia. Dati gennaio-giugno 2024 (Osservatorio INPS, ripresi dalla stampa): Napoli 100.665 nuclei (287.581 persone, circa il 14% del totale nazionale), Caserta 26.430, Salerno 17.028; Avellino e Benevento seguono con numeri più bassi. Accettate i dati di un report INPS più recente se citato. Punteggio pieno: classifica delle 5 province corretta secondo la fonte, posizione della Campania e di Napoli, anno indicato.$r$, null, null, now())
  on conflict (goal) do update set reference = excluded.reference, correct = null, feedback = null, updated_at = now();
insert into public.campana_key (goal, reference, correct, feedback, updated_at) values (2, $r$Il prodotto campano che vale di più è la Mozzarella di Bufala Campana DOP (oltre 400 milioni di euro di valore alla produzione secondo il Rapporto Ismea-Qualivita; da sola è più della metà del valore dei prodotti campani di qualità). Il numero esatto di DOP e IGP alimentari va verificato sull'Atlante Qualivita (cerca Campania, filtro cibo): accettate il conteggio se coerente con la fonte e con la data indicata. Punteggio pieno: numero totale, elenco corretto per la propria provincia, prodotto di maggior valore con il dato.$r$, null, null, now())
  on conflict (goal) do update set reference = excluded.reference, correct = null, feedback = null, updated_at = now();
insert into public.campana_key (goal, reference, correct, feedback, updated_at) values (3, $r$BES dei territori 2025, dati 2024 (provvisori): Italia 83,4 anni; Campania 81,7. Province: Salerno 82,6; Avellino 82,5; Benevento 82,3; Caserta 81,5; Napoli 81,4. Anche la provincia migliore (Salerno) è 0,8 anni sotto la media italiana; Napoli 2 anni sotto. Punteggio pieno: tutti i 7 valori, ordine corretto, differenza calcolata.$r$, null, null, now())
  on conflict (goal) do update set reference = excluded.reference, correct = null, feedback = null, updated_at = now();
insert into public.campana_key (goal, reference, correct, feedback, updated_at) values (4, $r$BES dei territori 2025, dati 2024, NEET 15-29 anni: Italia 15,2%; Campania 24,9%. Province: Avellino 15,5% (la migliore); Benevento 18,5%; Salerno 19,1%; Caserta 24,1%; Napoli 28,6% (la peggiore, quasi un giovane su tre). Punteggio pieno: tutti i valori, migliore e peggiore indicate, anno.$r$, null, null, now())
  on conflict (goal) do update set reference = excluded.reference, correct = null, feedback = null, updated_at = now();
insert into public.campana_key (goal, reference, correct, feedback, updated_at) values (5, $r$BES dei territori 2025, dati 2024, donne nei consigli comunali: Italia 34,1%; Campania 27,6%. Province: Napoli 32,0%; Caserta 29,8%; Salerno 26,6%; Avellino 25,1%; Benevento 22,2%. Il dato del proprio comune si verifica sul sito del Comune o sull'Anagrafe degli amministratori. Punteggio pieno: dati regionali e provinciali corretti più il conteggio del proprio comune con il confronto.$r$, null, null, now())
  on conflict (goal) do update set reference = excluded.reference, correct = null, feedback = null, updated_at = now();
insert into public.campana_key (goal, reference, correct, feedback, updated_at) values (6, $r$La risposta dipende dal tratto scelto: va controllata sul Portale Acque (mappa, classe di qualità dell'ultima stagione). In Campania esistono tratti con divieto permanente di balneazione, soprattutto vicino alle foci inquinate (per esempio Sarno, Regi Lagni) e a scarichi. Punteggio pieno: tratto indicato con classificazione e anno, almeno un esempio di divieto con la causa, fonte citata.$r$, null, null, now())
  on conflict (goal) do update set reference = excluded.reference, correct = null, feedback = null, updated_at = now();
insert into public.campana_key (goal, reference, correct, feedback, updated_at) values (7, $r$La risposta dipende dal comune: si verifica su Atlaimpianti (filtro fonte solare, comune). Punteggio pieno: numero di impianti e potenza totale (in kW o MW) per il proprio comune e per uno vicino, confronto ragionato (meglio se in rapporto agli abitanti), data della consultazione.$r$, null, null, now())
  on conflict (goal) do update set reference = excluded.reference, correct = null, feedback = null, updated_at = now();
insert into public.campana_key (goal, reference, correct, feedback, updated_at) values (8, $r$BES dei territori 2025, dati 2024, tasso di occupazione 20-64 anni: Italia 67,1%; Campania 49,4% (mancano 17,7 punti). Province: Avellino 58,4% (la più vicina alla media); Salerno 56,0%; Benevento 53,5%; Caserta 46,7%; Napoli 46,4%. Punteggio pieno: tutti i valori, differenza calcolata, provincia migliore.$r$, null, null, now())
  on conflict (goal) do update set reference = excluded.reference, correct = null, feedback = null, updated_at = now();
insert into public.campana_key (goal, reference, correct, feedback, updated_at) values (9, $r$Rapporto Pendolaria (20ª edizione, dicembre 2025): l'ex Circumvesuviana gestita da EAV è tra le peggiori linee d'Italia. Dati: oltre 13 milioni di passeggeri persi in un decennio; età media dei treni EAV 23,9 anni contro 14 dei treni Trenitalia in Campania; corse soppresse e bus sostitutivi in ritardo, treni sovraffollati e senza aria condizionata o riscaldamento, stazioni senza personale e in parte senza ascensori, nuovi treni consegnati in ritardo. Punteggio pieno: linea corretta, almeno 3 dati, confronto sull'età dei treni.$r$, null, null, now())
  on conflict (goal) do update set reference = excluded.reference, correct = null, feedback = null, updated_at = now();
insert into public.campana_key (goal, reference, correct, feedback, updated_at) values (10, $r$Dichiarazioni 2024 (redditi 2023), reddito medio dichiarato: più alti Positano 31.815 €, Capri 30.092 €, Sorrento 25.404 €; più bassi Castelvetere in Val Fortore 11.087 €, Castelfranco in Miscano 11.385 €, Rofrano 11.949 €. Media campana circa 20.000 €; Napoli 21.940 €. Accettate dati di un anno più recente se citati. Punteggio pieno: 3+3 comuni corretti con i valori, posizione del proprio comune, anno.$r$, null, null, now())
  on conflict (goal) do update set reference = excluded.reference, correct = null, feedback = null, updated_at = now();
insert into public.campana_key (goal, reference, correct, feedback, updated_at) values (11, $r$Ecosistema Urbano 2025 (106 città): Avellino 52ª (la migliore campana), Benevento 80ª, Salerno 87ª, Caserta 98ª, Napoli 103ª (quartultima). Se esce un'edizione più recente, valgono le sue posizioni. Punteggio pieno: 5 posizioni corrette con l'edizione, migliore indicata, un indicatore debole del proprio capoluogo spiegato.$r$, null, null, now())
  on conflict (goal) do update set reference = excluded.reference, correct = null, feedback = null, updated_at = now();
insert into public.campana_key (goal, reference, correct, feedback, updated_at) values (12, $r$BES dei territori 2025, dati 2023, raccolta differenziata: Italia 66,6%; Campania 56,6%. Province: Benevento 72,8% (la migliore); Salerno 67,6%; Avellino 62,2%; Caserta 56,7%; Napoli 51,5%. Il dato comunale si verifica sul Catasto rifiuti ISPRA. Punteggio pieno: dato del comune con anno, confronto con provincia, Campania e Italia, provincia migliore.$r$, null, null, now())
  on conflict (goal) do update set reference = excluded.reference, correct = null, feedback = null, updated_at = now();
insert into public.campana_key (goal, reference, correct, feedback, updated_at) values (13, $r$BES dei territori 2025, dati 2023, suolo impermeabilizzato da copertura artificiale: Italia 7,16%; Campania 10,57%. Province: Napoli 34,88% (più di un terzo del territorio); Caserta 10,47%; Salerno 7,98%; Avellino 7,38%; Benevento 7,37%. Il dato comunale è nel rapporto ISPRA sul consumo di suolo (tabelle per comune). Punteggio pieno: valori corretti, dato del proprio comune, collegamento con caldo e allagamenti.$r$, null, null, now())
  on conflict (goal) do update set reference = excluded.reference, correct = null, feedback = null, updated_at = now();
insert into public.campana_key (goal, reference, correct, feedback, updated_at) values (14, $r$Bandiere Blu 2025: 20 località in Campania. Salerno 14 (Agropoli, Ascea, Camerota, Casal Velino, Castellabate, Centola, Ispani, Montecorice, Pisciotta, Pollica, Positano, San Mauro Cilento, Sapri, Vibonati); Napoli 5 (Anacapri, Massa Lubrense, Piano di Sorrento, Sorrento, Vico Equense); Caserta 1 (Cellole). Se i clan usano l'edizione 2026, verificate l'elenco sul sito FEE. Criteri: acque di balneazione eccellenti, depurazione, gestione dei rifiuti, servizi e sicurezza in spiaggia, educazione ambientale. Punteggio pieno: numero ed elenco per provincia corretti, provincia con più bandiere, almeno 3 criteri.$r$, null, null, now())
  on conflict (goal) do update set reference = excluded.reference, correct = null, feedback = null, updated_at = now();
insert into public.campana_key (goal, reference, correct, feedback, updated_at) values (15, $r$Parchi nazionali: Vesuvio; Cilento, Vallo di Diano e Alburni. Parchi regionali (verificare l'elenco aggiornato sul sito della Regione): Campi Flegrei, Matese, Monti Lattari, Monti Picentini, Partenio, Roccamonfina-Foce Garigliano, Taburno-Camposauro, Bacino idrografico del fiume Sarno, oltre al Parco metropolitano delle Colline di Napoli. Punteggio pieno: 2 nazionali corretti, elenco regionale coerente con la fonte, parco più vicino con superficie e specie simbolo.$r$, null, null, now())
  on conflict (goal) do update set reference = excluded.reference, correct = null, feedback = null, updated_at = now();
insert into public.campana_key (goal, reference, correct, feedback, updated_at) values (16, $r$I numeri cambiano spesso: vanno verificati su OpenRE.G.I.O. (statistiche per regione, provincia e comune) alla data della consultazione. La Campania è tra le prime regioni d'Italia per beni confiscati, dopo la Sicilia; tra i comuni con più beni ci sono Napoli e diversi comuni del Casertano. Punteggio pieno: numero per la propria provincia con data, 3 comuni con i loro numeri, quota di beni destinati, fonte citata.$r$, null, null, now())
  on conflict (goal) do update set reference = excluded.reference, correct = null, feedback = null, updated_at = now();
insert into public.campana_key (goal, reference, correct, feedback, updated_at) values (17, $r$La risposta dipende dal comune: si verifica sulla pagina del comune in OpenCoesione (sezione Territori). Punteggio pieno: numero di progetti e valore totale, progetto più grande con importo, un progetto scelto con stato di avanzamento, data della consultazione e link.$r$, null, null, now())
  on conflict (goal) do update set reference = excluded.reference, correct = null, feedback = null, updated_at = now();



-- =====================================================================
--  STRADE 2030 · Aggiornamento 5
--  Nuove risposte di riferimento per le domande campane 1 e 10.
--  Incolla in Supabase > SQL Editor > Run. Si può rieseguire senza danni.
-- =====================================================================
update public.campana_key set reference = $r$Il PIL pro capite esiste solo per regioni e province: per i comuni si usa il reddito medio dichiarato (open data MEF). Gli ultimi posti in Campania sono occupati quasi tutti da piccoli comuni del Sannio (Fortore) e del Cilento. Dichiarazioni 2024 (redditi 2023): Castelvetere in Val Fortore 11.087 €, Castelfranco in Miscano 11.385 €, Rofrano 11.949 €. Tra gli ultimi compaiono anche, secondo la stampa locale, Castelpagano, Baselice, San Giorgio la Molara, Ginestra degli Schiavoni, Montefalcone di Val Fortore, San Bartolomeo in Galdo. Il MEF pubblica ogni anno nuovi dati e la classifica cambia: verificate la lista dei clan sul file open data dell'anno che citano (ordinate i comuni della Campania per reddito medio). Punteggio pieno: 10 comuni corretti per l'anno citato, con provincia e reddito, posizione del proprio comune.$r$, correct = null, feedback = null, updated_at = now() where goal = 1;
update public.campana_key set reference = $r$BES dei territori 2025. Reddito disponibile equivalente mediano (2022): Italia 18.600 €; Campania 13.800 € (circa 4.800 € in meno, -26%). Province: Avellino 15.000 €; Benevento 14.700 €; Salerno 14.500 €; Caserta 13.600 €; Napoli 13.400 € (la più bassa). Pensionati con pensione bassa (2023): Italia 8,9%; Campania 14,2%; Napoli 15,6% (la peggiore); Caserta 13,4%; Avellino 13,6%; Benevento 12,7%; Salerno 11,7%. Punteggio pieno: valori corretti con l'anno, differenza con l'Italia, provincia peggiore.$r$, correct = null, feedback = null, updated_at = now() where goal = 10;


-- =====================================================================
--  STRADE 2030 · Aggiornamento 6
--  Domande campane di nuovo a risposta multipla (un tentativo, 10 punti
--  automatici), con nuove domande e fonti. Nome scientifico in corsivo
--  nella spiegazione della domanda globale 15.
--  Incolla tutto in Supabase > SQL Editor > New query > Run.
-- =====================================================================

-- ---------- 1. Risposte giuste e spiegazioni (0 = prima opzione) ----------
insert into public.campana_key (goal, correct, feedback, reference, updated_at) values (1, 1, $f$Castelvetere in Val Fortore (BN), con circa 11.087 € di reddito medio. Seguono Castelfranco in Miscano (11.385 €) e Rofrano (11.949 €). In cima alla classifica c'è Positano, con 31.815 €.$f$, null, now())
  on conflict (goal) do update set correct = excluded.correct, feedback = excluded.feedback, reference = null, updated_at = now();
insert into public.campana_key (goal, correct, feedback, reference, updated_at) values (2, 0, $f$La Mozzarella di Bufala Campana DOP: da sola vale oltre 400 milioni di euro alla produzione, più della metà del valore di tutti i prodotti DOP e IGP campani.$f$, null, now())
  on conflict (goal) do update set correct = excluded.correct, feedback = excluded.feedback, reference = null, updated_at = now();
insert into public.campana_key (goal, correct, feedback, reference, updated_at) values (3, 2, $f$Napoli, con 81,4 anni: due anni in meno della media italiana (83,4). La più alta in Campania è Salerno, con 82,6 anni.$f$, null, now())
  on conflict (goal) do update set correct = excluded.correct, feedback = excluded.feedback, reference = null, updated_at = now();
insert into public.campana_key (goal, correct, feedback, reference, updated_at) values (4, 2, $f$Avellino, con il 15,5%, quasi come la media italiana (15,2%). A Napoli i NEET sono il 28,6%: quasi un giovane su tre.$f$, null, now())
  on conflict (goal) do update set correct = excluded.correct, feedback = excluded.feedback, reference = null, updated_at = now();
insert into public.campana_key (goal, correct, feedback, reference, updated_at) values (5, 1, $f$Il 27,6%, contro il 34,1% della media italiana. La provincia con più donne nei consigli comunali è Napoli (32%), quella con meno è Benevento (22,2%).$f$, null, now())
  on conflict (goal) do update set correct = excluded.correct, feedback = excluded.feedback, reference = null, updated_at = now();
insert into public.campana_key (goal, correct, feedback, reference, updated_at) values (6, 1, $f$0,90 miliardi di metri cubi, il 9,8% del totale nazionale. E in Italia il 42,4% dell'acqua immessa nelle reti si perde prima di arrivare ai rubinetti (2022).$f$, null, now())
  on conflict (goal) do update set correct = excluded.correct, feedback = excluded.feedback, reference = null, updated_at = now();
insert into public.campana_key (goal, correct, feedback, reference, updated_at) values (7, 2, $f$Salerno, con 450 MW, davanti a Caserta (414 MW) e Napoli (370 MW). In tutta la Campania ci sono 84.869 impianti, per 1.525 MW.$f$, null, now())
  on conflict (goal) do update set correct = excluded.correct, feedback = excluded.feedback, reference = null, updated_at = now();
insert into public.campana_key (goal, correct, feedback, reference, updated_at) values (8, 2, $f$Campania 49,4% contro Italia 67,1%: 17,7 punti di distanza. In Campania lavora meno di una persona su due tra i 20 e i 64 anni; la provincia più vicina alla media è Avellino (58,4%).$f$, null, now())
  on conflict (goal) do update set correct = excluded.correct, feedback = excluded.feedback, reference = null, updated_at = now();
insert into public.campana_key (goal, correct, feedback, reference, updated_at) values (9, 3, $f$L'ex Circumvesuviana (EAV): ha perso oltre 13 milioni di passeggeri in dieci anni e i suoi treni hanno in media 23,9 anni, contro i 14 dei treni Trenitalia in Campania.$f$, null, now())
  on conflict (goal) do update set correct = excluded.correct, feedback = excluded.feedback, reference = null, updated_at = now();
insert into public.campana_key (goal, correct, feedback, reference, updated_at) values (10, 1, $f$Napoli, con 13.400 € l'anno, contro i 18.600 € della media italiana. La provincia con il valore più alto è Avellino (15.000 €); in tutta la Campania è 13.800 €.$f$, null, now())
  on conflict (goal) do update set correct = excluded.correct, feedback = excluded.feedback, reference = null, updated_at = now();
insert into public.campana_key (goal, correct, feedback, reference, updated_at) values (11, 3, $f$Avellino, 52ª su 106 città. Poi Benevento (80ª), Salerno (87ª), Caserta (98ª) e Napoli (103ª).$f$, null, now())
  on conflict (goal) do update set correct = excluded.correct, feedback = excluded.feedback, reference = null, updated_at = now();
insert into public.campana_key (goal, correct, feedback, reference, updated_at) values (12, 0, $f$Benevento, con il 72,8%, sopra la media italiana (66,6%). Seguono Salerno (67,6%) e Avellino (62,2%); Napoli ha la percentuale più bassa, 51,5%.$f$, null, now())
  on conflict (goal) do update set correct = excluded.correct, feedback = excluded.feedback, reference = null, updated_at = now();
insert into public.campana_key (goal, correct, feedback, reference, updated_at) values (13, 2, $f$Il 34,88%: più di un terzo del territorio, il valore più alto della Campania (media regionale 10,57%, italiana 7,16%). Più cemento significa città più calde e più allagamenti quando piove forte.$f$, null, now())
  on conflict (goal) do update set correct = excluded.correct, feedback = excluded.feedback, reference = null, updated_at = now();
insert into public.campana_key (goal, correct, feedback, reference, updated_at) values (14, 2, $f$20: 14 in provincia di Salerno (soprattutto nel Cilento), 5 in provincia di Napoli e 1 in provincia di Caserta (Cellole).$f$, null, now())
  on conflict (goal) do update set correct = excluded.correct, feedback = excluded.feedback, reference = null, updated_at = now();
insert into public.campana_key (goal, correct, feedback, reference, updated_at) values (15, 1, $f$Due: il Parco nazionale del Vesuvio e il Parco nazionale del Cilento, Vallo di Diano e Alburni, uno dei più grandi d'Italia. A questi si aggiungono diversi parchi regionali, come Campi Flegrei, Matese, Monti Lattari, Monti Picentini e Partenio.$f$, null, now())
  on conflict (goal) do update set correct = excluded.correct, feedback = excluded.feedback, reference = null, updated_at = now();
insert into public.campana_key (goal, correct, feedback, reference, updated_at) values (16, 2, $f$Circa il 60% degli oltre 47.000 beni confiscati in Italia (43.326 immobili e 4.836 aziende a novembre 2025). Molti di questi beni oggi sono scuole, cooperative e centri per ragazzi.$f$, null, now())
  on conflict (goal) do update set correct = excluded.correct, feedback = excluded.feedback, reference = null, updated_at = now();
insert into public.campana_key (goal, correct, feedback, reference, updated_at) values (17, 2, $f$Circa 20,4 miliardi di euro per 38.728 progetti, di cui 17 miliardi da fondi europei e nazionali per la coesione. Su OpenCoesione potete cercare i progetti del vostro comune.$f$, null, now())
  on conflict (goal) do update set correct = excluded.correct, feedback = excluded.feedback, reference = null, updated_at = now();

-- ---------- 2. Azzera le risposte campane date finora ----------
-- Le domande sono cambiate: le risposte già date si riferiscono a domande
-- che non esistono più. Si cancellano solo le risposte CAMPANE (e i loro
-- punti), così ogni clan può rispondere alle nuove. Globali, sfide locali,
-- clan e scelte non vengono toccati.
-- (installazione nuova: niente da cancellare)

-- ---------- 3. Corsivo nella spiegazione della domanda globale 15 ----------
update public.quiz_key set feedback = $f$La *Primula palinuri* è una specie endemica che cresce solo su alcune scogliere tra Campania, Basilicata e Calabria.$f$ where goal = 15;
