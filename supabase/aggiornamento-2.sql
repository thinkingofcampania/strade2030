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
