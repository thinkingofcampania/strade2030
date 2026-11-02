# Strade 2030: come metterla online

Servono circa 45 minuti, nessuna competenza di programmazione e nessuna spesa. Userai due servizi gratuiti:

- **Supabase**, il database che salva clan, risposte, prove e punteggi;
- **GitHub**, che conserva i file (con la cronologia di ogni modifica) e pubblica il sito con GitHub Pages.

La guida completa, passo per passo, è nel documento "Strade 2030 · Come mettere online il sito".

La cartella contiene:

| File | A cosa serve |
|---|---|
| `index.html` | L'app dei clan: è la pagina che si apre dal link pubblico |
| `commissione.html` | La tua area riservata per valutare le prove |
| `config.js` | Il collegamento al database (lo compili al passo 3) |
| `assets/goals.js` | Domande, missioni e punteggi, modificabili |
| `supabase/schema.sql` | Il database con tutte le regole di sicurezza |

---

## Passo 1 · Crea il database su Supabase

1. Vai su **supabase.com**, clicca *Start your project* e registrati (va bene anche con un account Google).
2. Clicca *New project*. Dai un nome (es. `strade2030`), scegli una password del database (conservala) e come regione **Central EU (Frankfurt)**. Crea il progetto e aspetta un paio di minuti.
3. Nel menu a sinistra apri **SQL Editor**, poi *New query*.
4. Apri il file `supabase/schema.sql` con un editor di testo, copia tutto, incollalo e premi **Run**. Deve comparire *Success*.

## Passo 2 · Due impostazioni di accesso

1. Vai su **Authentication > Sign In / Providers > Email** e **disattiva "Confirm email"**. Poi salva.
   *Perché:* i clan entrano con un codice e una password, non con una loro email. Senza questo passaggio la registrazione si blocca.
2. Crea il tuo account da organizzatore: **Authentication > Users > Add user > Create new user**. Inserisci la tua email vera e una password robusta, e spunta *Auto Confirm User*.
3. Torna nel **SQL Editor**, incolla questa riga con la tua email e premi Run:

   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'LA-TUA-EMAIL@esempio.it';
   ```

   Se altri capi ti aiutano a valutare, ripeti i punti 2 e 3 con le loro email.

## Passo 3 · Collega l'app al database

1. In Supabase premi **Connect** in alto, oppure vai su **Project Settings > API Keys**.
2. Copia il **Project URL** e la **Publishable key** (inizia con `sb_publishable_`). Nei progetti più vecchi si chiama *anon public*.
3. Apri `config.js` e sostituisci i due testi `INSERISCI_QUI_...` con quei valori, lasciando le virgolette. Salva.

La chiave publishable può essere pubblica: chi la vede non può fare nulla oltre a ciò che permettono le regole del database. Non usare mai la chiave *secret* o *service_role*.

## Passo 4 · Pubblica il sito con GitHub Pages

1. Crea un account su **github.com**, poi *New repository*: nome `strade2030`, visibilità **Public**, spunta *Add a README*.
2. Nel repository: *Add file > Upload files*, trascina **il contenuto** della cartella `strade2030` (non la cartella stessa) e premi *Commit changes*.
3. *Settings > Pages*: in *Source* scegli *Deploy from a branch*, branch `main`, cartella `/ (root)`, *Save*.
4. Dopo 1-2 minuti il sito è su `https://TUO-NOME-UTENTE.github.io/strade2030/`.

- **Link per i clan:** `https://TUO-NOME-UTENTE.github.io/strade2030/`
- **Link per te:** `https://TUO-NOME-UTENTE.github.io/strade2030/commissione.html`

La pagina della commissione è protetta da login. Anche chi conosce l'indirizzo non vede nulla senza un account inserito al passo 2.

## Passo 5 · Prova tutto prima del lancio

1. Apri il link dei clan dal telefono e registra un clan di prova.
2. Rispondi a una domanda e invia una prova locale, anche con una foto.
3. Apri `commissione.html`, entra con la tua email e valuta la prova.
4. Controlla che il punteggio compaia in classifica.

Per cancellare il clan di prova: **Authentication > Users**, trova l'utente `nomeclan-1234@clan.strade2030.it` e cancellalo. Spariscono anche i suoi dati.

---

## Gestione durante la sfida

**Un clan ha dimenticato il codice.** Lo trovi nella tua area, scheda *Clan*.

**Un clan ha dimenticato la password.** Nel SQL Editor esegui questo comando, cambiando la nuova password e il codice del clan:

```sql
update auth.users
set encrypted_password = extensions.crypt('NuovaPassword123', extensions.gen_salt('bf'))
where email = lower('FENICE-4821') || '@clan.strade2030.it';
```

**Modificare domande o missioni.** Modifica `assets/goals.js` direttamente su GitHub (icona della matita, poi *Commit changes*): il sito si aggiorna in 1-2 minuti. Se cambi la risposta giusta di una domanda (il campo `a`, dove 0 è la prima opzione), aggiorna anche la tabella `quiz_key` nel database. Cambiarla a gioco iniziato ricalcola i punti di tutti.

**Esportare la classifica.** Scheda *Clan*, pulsante *Scarica classifica (CSV)*. Il file si apre con Excel.

**Punteggi.** Domanda giusta: 10 punti. Missione locale: fino a 40 punti (4 criteri da 0 a 10). Bonus tappa completa: 5 punti. Se vuoi cambiarli, chiedi pure: vanno aggiornati sia in `goals.js` sia nella funzione `classifica` del database.

## Limiti dei piani gratuiti

- **Supabase** mette in pausa i progetti che restano **inattivi per 7 giorni**. Durante la sfida l'uso quotidiano lo tiene attivo. Nei periodi di pausa basta entrare nella dashboard e cliccare *Restore*: i dati restano.
- **Spazio:** 500 MB di database e 1 GB di foto. L'app riduce ogni foto a circa 300 KB, quindi ci stanno più di 3.000 foto. Per video e materiali pesanti i clan usano i link (Drive, YouTube).
- **GitHub Pages:** gratuito per i repository pubblici, con aggiornamenti illimitati per un sito di queste dimensioni.
- **Registrazioni:** Supabase limita le registrazioni troppo ravvicinate dalla stessa rete. Se molti clan si registrano insieme dallo stesso Wi-Fi, alza il limite in *Authentication > Rate Limits*.


## Aggiornamento · Foto del clan, membri e pagina "I clan"

Da fare **una sola volta**, prima di caricare la nuova versione del sito:

1. Supabase > **SQL Editor** > *New query*.
2. Incolla tutto il file `supabase/aggiornamento-galleria.sql` e premi **Run**. Deve comparire *Success*. Non cancella nessun dato.

Poi carica su GitHub i file nuovi. Da quel momento:

- all'iscrizione i clan possono aggiungere **foto di gruppo** e **nomi dei membri** (facoltativo);
- dopo, li modificano dalla mappa con il pulsante **Foto e membri del clan**;
- la scheda **I clan** mostra a tutti, anche senza accesso, nome, gruppo, città, foto e membri;
- link diretto alla galleria: `https://thinkingofcampania.github.io/strade2030/#clan`;
- nell'area commissione, scheda *Clan*, il pulsante **Nascondi** toglie un clan dalla galleria (e **Mostra** lo rimette).

Per pubblicare foto e nomi il clan deve spuntare la conferma del consenso (dei membri e, per i minorenni, dei genitori).

## Aggiornamento 2 · Zone, sfide campane, punteggi, obiettivi di futuro, recupero accesso

### 1. Database (prima di tutto)

Supabase > **SQL Editor** > *New query*: incolla tutto `supabase/aggiornamento-2.sql` e premi **Run**.
**Attenzione: cancella tutti i clan** (erano di prova), con risposte, prove e valutazioni. Gli account della commissione restano.

Facoltativo: in **Storage** svuota le cartelle `prove` e `clan` dalle foto di prova.

### 2. Sito

Carica su GitHub tutto il contenuto della cartella (il `config.js` è già il tuo). I file nuovi sono `assets/app.js` e `assets/commissione.js`.

### 3. Email per i materiali

In `assets/goals.js`, alla riga `email: "strade2030@gmail.com",` c'è l'indirizzo a cui i clan devono mandare foto, documenti e video (es. `email: "strade2030@esempio.it",`).
In ogni sfida locale i clan trovano il pulsante "Scrivi la mail" con l'oggetto già compilato: `ZONA - NOME CLAN - Obiettivo N - Sfida locale`, una mail per sfida, file oltre 20 MB come link. Finché l'indirizzo è vuoto, i clan vedono "le istruzioni arriveranno a breve".

### 4. Icone degli obiettivi

Metti le 17 icone in `assets/img/sdg/` con i nomi `goal-1.png` ... `goal-17.png`, poi in `assets/goals.js` cambia `SDG_ICONE = false` in `SDG_ICONE = true`. Fino ad allora si vedono i riquadri colorati.

### Cosa cambia per i clan

- Iscrizione con **zona** (menu a tendina) ed **email di riferimento**; la città non c'è più.
- Pop-up "Lo spirito del gioco" al primo accesso, richiamabile dalla mappa e dalle regole.
- Ogni obiettivo ha 3 sfide: **globale** (10 punti, la soluzione arriva dal database), **campana** (risposta aperta con fonte, 0-10 punti dalla commissione), **locale** (fino a 200 punti, divisi tra le consegne con i loro criteri).
- **Obiettivi di futuro**: si sbloccano quando il clan ha risposto a tutte le 17 domande globali e campane e ha consegnato almeno una sfida locale. Le scelte e il grafico sono pubblici.
- "Codice o password dimenticati?" manda una richiesta alla commissione; dal profilo il clan può cambiare password.

### Cosa cambia per la commissione

- **Locali**: un voto per consegna, il totale si calcola da solo (obiettivo 3: contano le 2 attività migliori).
- **Campane**: risposte per obiettivo, voto 0-10 e **risposta di riferimento** riservata.
- **Richieste**: chi ha dimenticato codice o password; genera una password temporanea e scrivi al clan.
- **Clan**: zona, email, codice, nuova password, galleria, CSV.

### Dove si cambiano le regole

- Punti di ogni consegna, testi, domande campane e fonti: `assets/goals.js`.
- Punti di domanda globale, campana e bonus: `goals.js` **e** la funzione `classifica` nel database.
- Zone: `goals.js` **e** il vincolo `clans_zona_check` nel database.
- Numero di sfide locali per lo sblocco: `SBLOCCO_LOCALI` in `goals.js` **e** la funzione `stato_sblocco` nel database.

## Aggiornamento 3 · Campane a risposta multipla, sfide locali solo via email

1. Supabase > **SQL Editor** > *New query*: incolla tutto `supabase/aggiornamento-3.sql` e premi **Run**. Non cancella dati.
2. Carica su GitHub tutto il contenuto della cartella.

- **Domande campane 1-17** tutte a risposta multipla: un tentativo, 10 punti automatici, fonte visibile sotto la domanda. Le risposte giuste e le spiegazioni sono solo nel database (tabella `campana_key`); la commissione può cambiarle dalla scheda **Campane** e i punti si ricalcolano. Per cambiare una domanda: testo e opzioni in `goals.js`, risposta giusta e spiegazione dalla scheda Campane della commissione.
- **Sfide locali**: niente più racconto e link nel sito. I clan mandano tutto a strade2030@gmail.com, una mail per sfida con l'oggetto indicato, e premono "Abbiamo inviato la mail". In commissione ogni consegna ha il pulsante **Cerca in Gmail**; se un clan dimentica il tasto, puoi registrare tu la consegna.

## Aggiornamento 5 · Carattere, icone, commissione solo sfide locali

- Carattere unico **Titillium Web** su tutto il sito.
- Icone ufficiali degli obiettivi sulla **mappa** (cartella `assets/img/sdg/`). Per tornare alle caselle colorate: `SDG_ICONE = false` in `assets/goals.js`.
- La commissione valuta **solo le sfide locali**: la scheda Campane non c'è più, perché globali e campane si correggono da sole.
- Se un giorno una risposta giusta di una domanda campana fosse sbagliata: Supabase → Table Editor → `campana_key`, cambia `correct` (0 = prima opzione, 1 = seconda, …) per quell'obiettivo, poi in SQL Editor esegui `select ricalcola_campana(N);` con il numero dell'obiettivo. I punti dei clan si aggiornano.

## Aggiornamento 6 · Percorso verso la coppa, sfide locali a 3 prove, campane "guarda le fonti"

**Database:** esegui `supabase/aggiornamento-4.sql` in Supabase > SQL Editor > Run (una volta sola, si può rieseguire senza danni).

- **Mappa:** sotto il riquadro dello sblocco c'è il percorso verso il traguardo (la coppa), con il triangolino "Voi" che mostra a che punto è il clan e una frase che li sprona a continuare dopo lo sblocco.
- **Sfide locali:** titolo unico "Sfida locale", 3 prove sul territorio dalla più semplice alla più impegnativa (Primo passo, Si entra nel vivo, Il passo più lungo), 10 punti ciascuna, massimo 30. Niente scelte tra attività o varianti. I clan possono mandare le prove anche in momenti diversi: se segnalano nuove prove dopo la valutazione, la sfida torna "da valutare" in commissione.
- **Domande campane:** piccole ricerche a risposta aperta, con le fonti da leggere. La commissione le valuta da 0 a 10 nella scheda **Campane**, dove trova anche la risposta di riferimento (solo la commissione la vede e può modificarla).
- **Obiettivi di futuro:** ogni clan vede e cambia solo le proprie scelte. Il grafico e l'elenco di tutti i clan sono nella scheda **Futuro** della commissione (con filtro per zona e file per Excel), da mostrare alla fine.
- Testi delle prove e delle domande: `assets/goals.js` (campo `parts` e `campana`). Nomi dei livelli: `LIVELLI` nello stesso file.

## Aggiornamento 7 · Campane di nuovo a risposta multipla

**Database:** esegui `supabase/aggiornamento-6.sql` (SQL Editor > Run). Cancella le risposte campane date finora, perché le domande sono cambiate.

- Le 17 domande campane sono a risposta multipla, con le fonti da consultare: un tentativo, 10 punti automatici. La commissione non le valuta più (la scheda Campane non c'è).
- Risposte giuste e spiegazioni: tabella `campana_key` (colonna `correct`: 0 = prima opzione). L'ordine delle opzioni in `assets/goals.js` deve restare lo stesso.
- Nei testi di `goals.js`: `*parola*` diventa corsivo; i link `https://...` diventano cliccabili.

## Aggiornamento 8 · Comunicazione

**Database:** esegui `supabase/aggiornamento-7.sql` (nuovo calcolo del bonus in classifica).

- Schermata iniziale: "Diciassette obiettivi, diciassette tappe: guardare il mondo, conoscere la Campania, cambiare il vostro territorio."
- Nuovo testo de "Lo spirito del gioco" (in `index.html`) e pulsante fisso "Perché giochiamo?" in basso a destra in tutte le pagine: il cuore batte finché non lo si apre.
- Sulla mappa resta solo l'indicatore per sbloccare gli obiettivi di futuro (tolto il percorso con la coppa).
- Bonus "Sfida completa": +10 punti per ogni sfida locale con tutte e 3 le prove valutate (sostituisce il vecchio +5).

