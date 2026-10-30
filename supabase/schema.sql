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
