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
