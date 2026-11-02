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
delete from public.campana_answers;

-- ---------- 3. Corsivo nella spiegazione della domanda globale 15 ----------
update public.quiz_key set feedback = $f$La *Primula palinuri* è una specie endemica che cresce solo su alcune scogliere tra Campania, Basilicata e Calabria.$f$ where goal = 15;
