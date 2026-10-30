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

-- ---------- 4. (Facoltativo) Ripartire puliti prima del via ----------
-- Le risposte campane e le valutazioni fatte durante le prove sono del
-- vecchio formato. Per cancellarle togli i due trattini davanti alle righe:
-- delete from public.campana_answers;
-- delete from public.evaluations;
