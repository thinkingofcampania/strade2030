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
