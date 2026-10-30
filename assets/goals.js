/* =====================================================================
   STRADE 2030 · Contenuti e impostazioni del gioco
   ---------------------------------------------------------------------
   IMPOSTAZIONI che puoi cambiare tu (le prime righe qui sotto).
   Le risposte giuste delle domande globali NON stanno qui: sono nel
   database (tabella quiz_key). Le risposte di riferimento delle domande
   campane le inserisce la commissione dalla sua area.
   ===================================================================== */

/* Come i clan consegnano i materiali delle sfide locali (foto, documenti, video).
   modo: "modulo" = Google Modulo con caricamento file (consigliato)
         "email"  = una mail per sfida all'indirizzo indicato
         ""       = nessuna istruzione (solo racconto e link nel sito)
   modulo: link "precompilato" del Google Modulo in cui hai scritto, nei campi,
           esattamente ZONA, CLAN, CODICE, OBIETTIVO, SFIDA (vedi LEGGIMI).
   email: indirizzo a cui inviare i materiali. */
const CONSEGNA = {
  modo: "modulo",
  modulo: "",
  email: "",
  limiteMB: 20
};

/* Zone AGESCI Campania (devono coincidere con quelle del database). */
const ZONE = ["Caserta","Faito","Felix","Hirpinia","Liternum","Napoli","Poseidonia","Salerno","Samnium","Vesuvio","Volturno"];

/* Punteggi (devono coincidere con la funzione classifica del database). */
const PTS_GLOBAL = 10, PTS_CAMPANA = 10, PTS_BONUS = 5, LOCAL_MAX = 200;

/* Sblocco degli obiettivi di futuro: tutte le domande globali e campane
   risposte, e almeno questo numero di sfide locali consegnate. */
const SBLOCCO_LOCALI = 1;

/* Icone ufficiali degli obiettivi: assets/img/sdg/goal-1.png ... goal-17.png
   (se mancano, si usano i riquadri colorati). */
const SDG_ICON = n => `assets/img/sdg/goal-${n}.png`;

/* ---------------------------------------------------------------------
   I 17 OBIETTIVI
   q, o      = domanda globale e opzioni
   campana   = domanda campana (q), nota facoltativa, fonti [nome, link]
   lt, ld    = titolo e descrizione della sfida locale
   variants  = varianti tra cui scegliere (facoltativo)
   parts     = consegne: t testo, p punti massimi, k criteri di qualità
   acts      = (solo obiettivo 3) attività tra cui sceglierne "choose"
   --------------------------------------------------------------------- */
const GOALS = [
{
  "n": 1,
  "c": "#E5243B",
  "t": "Sconfiggere la povertà",
  "s": "Porre fine a ogni forma di povertà nel mondo",
  "q": "Muhammad Yunus ha ricevuto il Nobel per la Pace nel 2006 come pioniere del microcredito. Come si chiama la banca che ha fondato in Bangladesh?",
  "o": [
    "BRAC Bank",
    "Grameen Bank",
    "Banca Etica",
    "Asian Development Bank"
  ],
  "campana": {
    "q": "Quali sono i 10 comuni campani con il reddito medio dichiarato più basso?",
    "nota": "Per i comuni non esiste il PIL pro capite: si usa il reddito medio dichiarato ai fini IRPEF.",
    "src": [
      [
        "MEF – Dipartimento delle Finanze, Statistiche sulle dichiarazioni fiscali",
        "https://www.finanze.gov.it"
      ]
    ]
  },
  "lt": "Mappa della solidarietà",
  "ld": "Scoprite chi, nel vostro paese o quartiere, aiuta concretamente chi vive in povertà: Caritas parrocchiali, mense, banchi alimentari, empori solidali, dormitori.",
  "parts": [
    {
      "t": "Una mappa (anche Google My Maps) con tutti i punti trovati, orari e servizi offerti",
      "p": 50,
      "k": [
        "Completezza dei punti",
        "Dati verificati",
        "Mappa leggibile"
      ]
    },
    {
      "t": "Almeno un'intervista a un volontario o operatore: di cosa ha più bisogno oggi il vostro territorio?",
      "p": 75,
      "k": [
        "Domande pertinenti",
        "Ascolto vero",
        "Bisogni del territorio riportati"
      ]
    },
    {
      "t": "Un'ora di servizio in una di queste realtà, documentata con foto",
      "p": 75,
      "k": [
        "Servizio reale, non una visita",
        "Tutto il clan coinvolto",
        "Cosa avete imparato"
      ]
    }
  ]
},
{
  "n": 2,
  "c": "#DDA63A",
  "t": "Sconfiggere la fame",
  "s": "Sicurezza alimentare e agricoltura sostenibile",
  "q": "Quale agenzia delle Nazioni Unite, con sede a Roma, ha ricevuto il Premio Nobel per la Pace nel 2020?",
  "o": [
    "FAO",
    "IFAD",
    "World Food Programme (PAM)",
    "UNICEF"
  ],
  "campana": {
    "q": "Quanto cibo spreca in media una famiglia del Sud Italia a settimana, e quanto rispetto alla media nazionale?",
    "src": [
      [
        "Osservatorio Waste Watcher International",
        "https://www.sprecozero.it"
      ]
    ]
  },
  "lt": "Zero spreco in paese",
  "ld": "Il cibo buttato e la fame convivono anche sotto casa vostra. Trovate chi produce vicino a voi e chi spreca.",
  "parts": [
    {
      "t": "Mappate almeno 5 produttori locali, orti urbani o mercati contadini",
      "p": 50,
      "k": [
        "Numero e varietà",
        "Informazioni utili",
        "Luoghi verificati"
      ]
    },
    {
      "t": "Contattate un forno, un bar o un supermercato e organizzate il recupero di invenduto verso una realtà solidale (anche una sola volta)",
      "p": 100,
      "k": [
        "Recupero realizzato davvero",
        "Quantità e destinatario documentati",
        "Possibilità di continuare"
      ]
    },
    {
      "t": "Un racconto di com'è andata, con foto",
      "p": 50,
      "k": [
        "Chiarezza",
        "Difficoltà e soluzioni",
        "Foto che documentano"
      ]
    }
  ]
},
{
  "n": 3,
  "c": "#4C9F38",
  "t": "Salute e benessere",
  "s": "Salute e benessere per tutti e a tutte le età",
  "q": "Quale malattia è stata dichiarata ufficialmente eradicata dall'Organizzazione Mondiale della Sanità nel 1980?",
  "o": [
    "Poliomielite",
    "Morbillo",
    "Vaiolo",
    "Malaria"
  ],
  "campana": {
    "q": "Quanti consultori familiari pubblici ci sono nella vostra ASL e quali servizi offrono per la salute mentale dei giovani?",
    "src": [
      [
        "Regione Campania – Sanità",
        "https://www.regione.campania.it"
      ],
      [
        "Siti delle ASL",
        ""
      ],
      [
        "Ministero della Salute",
        "https://www.salute.gov.it"
      ]
    ]
  },
  "lt": "Prendersi cura",
  "ld": "La salute non è solo assenza di malattia: è ascolto, accesso alle cure, saper intervenire. Sceglietene 2 tra le 4 attività: contano al massimo 2, fino a 100 punti ciascuna.",
  "choose": 2,
  "acts": [
    {
      "id": "A",
      "t": "Mappa dell'ascolto",
      "d": "Mappate associazioni e servizi GRATUITI del vostro territorio che offrono ascolto attivo e supporto psicologico: consultori, sportelli d'ascolto scolastici, servizi ASL per i giovani, associazioni, linee telefoniche.",
      "parts": [
        {
          "t": "Mappa (anche Google My Maps) con indirizzo, orari, contatti, a chi si rivolge, come si accede",
          "p": 50,
          "k": [
            "Completezza",
            "Dati verificati",
            "Facilità d'uso per un ragazzo"
          ]
        },
        {
          "t": "Scheda su almeno 2 realtà verificate di persona o al telefono",
          "p": 50,
          "k": [
            "Verifica reale",
            "Informazioni pratiche",
            "Cura della scheda"
          ]
        }
      ]
    },
    {
      "id": "B",
      "t": "Il benessere psicologico dei giovani nel vostro territorio",
      "d": "Un'analisi basata su dati pubblici e su un questionario ANONIMO rivolto agli studenti.",
      "rules": [
        "Il questionario passa SOLO tramite la scuola, con l'autorizzazione del dirigente scolastico; per i minorenni seguite le indicazioni della scuola sul consenso.",
        "Nessun dato che permetta di identificare chi risponde (niente nomi, classi piccole, email): si consegnano solo risultati aggregati.",
        "Niente domande su autolesionismo, suicidio o diagnosi.",
        "In fondo al questionario indicate sempre dove chiedere aiuto: sportello d'ascolto della scuola, consultorio, Telefono Azzurro 19696, Telefono Amico 02 2327 2327."
      ],
      "parts": [
        {
          "t": "Le domande usate nel questionario",
          "p": 25,
          "k": [
            "Domande chiare",
            "Rispettose",
            "Coerenti con le regole"
          ]
        },
        {
          "t": "Sintesi dei dati pubblici (es. ISTAT, Openpolis, ISS)",
          "p": 25,
          "k": [
            "Fonti citate",
            "Dati del territorio",
            "Sintesi chiara"
          ]
        },
        {
          "t": "Risultati aggregati e 3 bisogni emersi",
          "p": 50,
          "k": [
            "Risultati leggibili",
            "Bisogni concreti",
            "Collegamento con i dati"
          ]
        }
      ]
    },
    {
      "id": "C",
      "t": "La salute come diritto universale",
      "d": "Un'indagine sull'offerta del Servizio Sanitario Nazionale nel vostro territorio: accessibilità alle cure, tempi di attesa, principali difficoltà di accesso.",
      "rules": [
        "Interviste a personale sanitario e operatori CUP SOLO con il loro consenso e, se in struttura, con il permesso della direzione.",
        "Non avvicinate pazienti dentro ospedali o ambulatori: le esperienze da utente raccoglietele nella vostra rete (famiglie, vicini, parrocchia, anziani del quartiere).",
        "Niente nomi né dati sanitari personali nel materiale consegnato."
      ],
      "fonti": "Fonti utili: tempi di attesa sul sito della vostra ASL; Regione Campania – Sanità; AGENAS – Portale statistico.",
      "parts": [
        {
          "t": "Almeno 2 interviste a operatori",
          "p": 40,
          "k": [
            "Interlocutori competenti",
            "Domande pertinenti",
            "Consenso rispettato"
          ]
        },
        {
          "t": "Almeno 5 testimonianze di utenti",
          "p": 30,
          "k": [
            "Varietà delle esperienze",
            "Ascolto",
            "Anonimato"
          ]
        },
        {
          "t": "Sintesi con le 3 criticità principali e una proposta concreta",
          "p": 30,
          "k": [
            "Criticità documentate",
            "Proposta realistica",
            "Chiarezza"
          ]
        }
      ]
    },
    {
      "id": "D",
      "t": "Parte pratica: primo soccorso",
      "d": "Inviate un video (massimo 3 minuti) in cui simulate alcune pratiche di primo soccorso: chiamata al 112, posizione laterale di sicurezza, disostruzione, sequenza di rianimazione.",
      "rules": [
        "Seguite le linee guida ufficiali (Croce Rossa Italiana, IRC – Italian Resuscitation Council) e citatele nel video.",
        "Compressioni toraciche e ventilazioni SOLO su manichino, mai su una persona.",
        "Se possibile, fatevi seguire da un istruttore o da un soccorritore."
      ],
      "parts": [
        {
          "t": "Correttezza delle manovre",
          "p": 60,
          "k": [
            "Sequenza corretta",
            "Manovre eseguite bene",
            "Sicurezza"
          ]
        },
        {
          "t": "Chiarezza della spiegazione",
          "p": 25,
          "k": [
            "Comprensibile",
            "Ben organizzata"
          ]
        },
        {
          "t": "Fonte citata (CRI o IRC)",
          "p": 15,
          "k": [
            "Fonte ufficiale",
            "Citata nel video"
          ]
        }
      ]
    }
  ]
},
{
  "n": 4,
  "c": "#C5192D",
  "t": "Istruzione di qualità",
  "s": "Istruzione inclusiva ed equa per tutti",
  "q": "Malala Yousafzai è la più giovane vincitrice di sempre del Nobel per la Pace (2014). Quanti anni aveva quando lo ricevette?",
  "o": [
    "15",
    "17",
    "19",
    "21"
  ],
  "campana": {
    "q": "Quante biblioteche pubbliche ci sono nel vostro comune e quali sono aperte e accessibili come aula studio?",
    "src": [
      [
        "Anagrafe delle biblioteche italiane – ICCU",
        "https://anagrafe.iccu.sbn.it"
      ]
    ]
  },
  "lt": "Chi resta indietro?",
  "ld": "La dispersione scolastica in Campania è tra le più alte d'Italia. E nel vostro comune? Scoprite quanti ragazzi della vostra età lasciano la scuola e perché.",
  "parts": [
    {
      "t": "Il dato più preciso possibile sulla dispersione o l'abbandono scolastico del vostro comune (se non esiste, della provincia), con la fonte: ISTAT, Openpolis, il Comune o l'Ufficio Scolastico",
      "p": 50,
      "k": [
        "Dato del vostro territorio",
        "Fonte citata e affidabile",
        "Confronto con la media"
      ]
    },
    {
      "t": "Un'intervista a un dirigente scolastico, un insegnante o un assistente sociale: quanti ragazzi lasciano la scuola nel vostro territorio, e perché?",
      "p": 75,
      "k": [
        "Interlocutore competente",
        "Domande sul perché",
        "Sintesi chiara"
      ]
    },
    {
      "t": "Una mappa di biblioteche, doposcuola e spazi studio gratuiti del vostro comune",
      "p": 75,
      "k": [
        "Completezza",
        "Orari e modalità di accesso",
        "Gratuità verificata"
      ]
    }
  ]
},
{
  "n": 5,
  "c": "#FF3A21",
  "t": "Parità di genere",
  "s": "Uguaglianza di genere ed emancipazione",
  "q": "In che anno le donne italiane hanno votato per la prima volta in una consultazione nazionale?",
  "o": [
    "1919",
    "1936",
    "1946",
    "1968"
  ],
  "campana": {
    "q": "Quanti sono oggi i sindaci donna in Campania, su quanti comuni?",
    "src": [
      [
        "Ministero dell'Interno – Anagrafe degli amministratori locali",
        "https://dait.interno.gov.it"
      ]
    ]
  },
  "lt": "Strade al femminile",
  "ld": "Quante strade, piazze e scuole del vostro comune portano il nome di una donna? La toponomastica racconta chi una comunità ha scelto di ricordare.",
  "parts": [
    {
      "t": "Contate le intitolazioni a uomini e a donne nel vostro comune (una tabella basta)",
      "p": 75,
      "k": [
        "Conteggio completo",
        "Metodo spiegato",
        "Percentuale calcolata"
      ]
    },
    {
      "t": "Scegliete una donna del vostro territorio che meriterebbe una strada e raccontate la sua storia",
      "p": 75,
      "k": [
        "Ricerca accurata",
        "Legame con il territorio",
        "Racconto coinvolgente"
      ]
    },
    {
      "t": "Inviate la proposta al Comune e allegate la lettera",
      "p": 50,
      "k": [
        "Lettera inviata davvero",
        "Motivazione",
        "Ricevuta o risposta allegata"
      ]
    }
  ]
},
{
  "n": 6,
  "c": "#26BDE2",
  "t": "Acqua pulita",
  "s": "Acqua e servizi igienici per tutti",
  "q": "In che anno l'Assemblea Generale dell'ONU ha riconosciuto esplicitamente l'accesso all'acqua potabile e ai servizi igienici come diritto umano?",
  "o": [
    "1948",
    "1992",
    "2010",
    "2015"
  ],
  "campana": {
    "q": "Indicate 3 fiumi campani con lo stato ecologico o chimico peggiore e spiegate la causa principale.",
    "nota": "La risposta è valutata sulla motivazione, non su un'unica classifica giusta.",
    "src": [
      [
        "ARPAC – Monitoraggio delle acque superficiali",
        "https://www.arpacampania.it"
      ]
    ]
  },
  "lt": "Il fiume di casa",
  "ld": "Dal Sarno ai Regi Lagni, i corsi d'acqua campani raccontano una storia di inquinamento e di riscatto. Qual è l'acqua del vostro territorio?",
  "parts": [
    {
      "t": "Mappate le fontanine pubbliche del paese: funzionano o no?",
      "p": 50,
      "k": [
        "Copertura del paese",
        "Stato verificato",
        "Guasti segnalati"
      ]
    },
    {
      "t": "Visitate un fiume, torrente o sorgente vicino e documentatene lo stato (foto, scarichi, rifiuti)",
      "p": 100,
      "k": [
        "Stato documentato",
        "Cause e scarichi individuati",
        "Uscita in sicurezza"
      ]
    },
    {
      "t": "Scoprite da dove arriva l'acqua del vostro rubinetto e chi la gestisce",
      "p": 50,
      "k": [
        "Fonte e gestore corretti",
        "Percorso spiegato",
        "Dato sulla qualità dell'acqua"
      ]
    }
  ]
},
{
  "n": 7,
  "c": "#FCC30B",
  "t": "Energia pulita",
  "s": "Energia sostenibile e accessibile",
  "dark": true,
  "q": "La prima centrale geotermica al mondo per la produzione di elettricità è nata in Italia. Dove?",
  "o": [
    "Larderello",
    "Pozzuoli",
    "Ischia",
    "Pantelleria"
  ],
  "campana": {
    "q": "Quale fonte di energia rinnovabile produce più elettricità in Campania?",
    "src": [
      [
        "GSE – Rapporto statistico sulle fonti rinnovabili",
        "https://www.gse.it"
      ],
      [
        "Terna – Statistiche regionali",
        "https://www.terna.it"
      ]
    ]
  },
  "lt": "Caccia al watt",
  "ld": "Il sole in Campania non manca. Quanto lo usiamo?",
  "parts": [
    {
      "t": "Contate gli edifici pubblici del comune (scuole, municipio, palestre) con pannelli solari",
      "p": 50,
      "k": [
        "Conteggio completo",
        "Fonte o verifica sul posto",
        "Confronto con il totale"
      ]
    },
    {
      "t": "Check-up energetico della vostra sede: contate lampadine e apparecchi, controllate il riscaldamento e cercate gli spifferi (una candela vicino agli infissi: se la fiamma si muove, c'è uno spiffero). Poi proponete al gruppo almeno 3 miglioramenti concreti",
      "p": 100,
      "k": [
        "Rilevazioni concrete",
        "Proposte fattibili",
        "Gruppo coinvolto"
      ]
    },
    {
      "t": "Scoprite se nel vostro comune esiste o si progetta una comunità energetica rinnovabile",
      "p": 50,
      "k": [
        "Informazione verificata",
        "Chi la promuove",
        "Come si partecipa"
      ]
    }
  ]
},
{
  "n": 8,
  "c": "#A21942",
  "t": "Lavoro dignitoso",
  "s": "Lavoro dignitoso e crescita economica",
  "q": "Qual è la più antica agenzia specializzata delle Nazioni Unite, fondata nel 1919, che si occupa di diritti dei lavoratori?",
  "o": [
    "OMS",
    "UNESCO",
    "OIL (Organizzazione Internazionale del Lavoro)",
    "OCSE"
  ],
  "campana": {
    "q": "Indicate 3 mestieri artigianali tipici della Campania e dove si praticano ancora.",
    "nota": "Risposta aperta, valutata sulla motivazione.",
    "src": [
      [
        "Regione Campania – Artigianato",
        "https://www.regione.campania.it"
      ],
      [
        "Confartigianato Campania",
        ""
      ]
    ]
  },
  "lt": "Mestieri che resistono",
  "ld": "Ogni paese ha un mestiere che rischia di sparire: il liutaio, il ceramista, il casaro, il pastaio, il presepista.",
  "parts": [
    {
      "t": "Intervistate un artigiano o un lavoratore del vostro territorio (video o audio)",
      "p": 75,
      "k": [
        "Qualità dell'intervista",
        "Storia del mestiere",
        "Audio o video comprensibile"
      ]
    },
    {
      "t": "Riflessione: è un lavoro dignitoso? Chi lo continuerà?",
      "p": 50,
      "k": [
        "Argomenti concreti",
        "Voce dell'artigiano",
        "Il vostro punto di vista"
      ]
    },
    {
      "t": "Passate una mattinata a imparare il mestiere con lui",
      "p": 75,
      "k": [
        "Esperienza reale",
        "Cosa avete imparato",
        "Foto o video"
      ]
    }
  ]
},
{
  "n": 9,
  "c": "#FD6925",
  "t": "Industria e innovazione",
  "s": "Infrastrutture resilienti e innovazione",
  "q": "Quale azienda italiana presentò nel 1965 la \"Programma 101\", considerata uno dei primi personal computer della storia?",
  "o": [
    "Fiat",
    "Olivetti",
    "Montedison",
    "Pirelli"
  ],
  "campana": {
    "q": "Che percentuale di famiglie campane è raggiunta dalla banda ultralarga? E nel vostro comune?",
    "src": [
      [
        "Piano Banda Ultralarga",
        "https://bandaultralarga.italia.it"
      ],
      [
        "AGCOM",
        "https://www.agcom.it"
      ]
    ]
  },
  "lt": "Senza barriere",
  "ld": "Un'infrastruttura non serve a nessuno se non tutti possono usarla. Guardate il vostro paese con gli occhi di chi è in carrozzina o ha un passeggino.",
  "parts": [
    {
      "t": "Percorrete un tragitto quotidiano (stazione-scuola, piazza-municipio) e mappate ogni barriera architettonica",
      "p": 75,
      "k": [
        "Tragitto significativo",
        "Barriere complete",
        "Posizioni precise"
      ]
    },
    {
      "t": "Foto di ogni ostacolo con la sua posizione",
      "p": 50,
      "k": [
        "Foto chiare",
        "Ostacolo riconoscibile",
        "Posizione indicata"
      ]
    },
    {
      "t": "Inviate la segnalazione al Comune e allegate la ricevuta",
      "p": 75,
      "k": [
        "Segnalazione inviata",
        "Proposte di soluzione",
        "Ricevuta o risposta"
      ]
    }
  ]
},
{
  "n": 10,
  "c": "#DD1367",
  "t": "Ridurre le disuguaglianze",
  "s": "Ridurre le disuguaglianze tra e nei Paesi",
  "q": "Come si chiama l'indice che misura la disuguaglianza nella distribuzione del reddito, ideato da uno statistico italiano?",
  "o": [
    "Indice di Gini",
    "Indice di Pareto",
    "Indice di Lorenz",
    "Indice di Sen"
  ],
  "campana": {
    "q": "Qual è il tasso di NEET (giovani di 15-29 anni che non studiano e non lavorano) in Campania, rispetto alla media italiana?",
    "src": [
      [
        "ISTAT",
        "https://www.istat.it"
      ],
      [
        "Eurostat",
        "https://ec.europa.eu/eurostat"
      ]
    ]
  },
  "lt": "Fare strada insieme",
  "ld": "Incontrate chi vive ai margini del vostro territorio: persone migranti, persone con disabilità, detenuti, anziani soli.",
  "parts": [
    {
      "t": "Contattate una realtà di accoglienza o inclusione (progetto SAI, cooperativa sociale, casa famiglia)",
      "p": 50,
      "k": [
        "Realtà pertinente",
        "Contatto diretto",
        "Presentazione della realtà"
      ]
    },
    {
      "t": "Organizzate un'attività insieme: una partita, una cena, un laboratorio",
      "p": 100,
      "k": [
        "Fatta insieme, non \"per\"",
        "Partecipazione",
        "Cura dell'organizzazione"
      ]
    },
    {
      "t": "Raccontate l'incontro dal punto di vista di chi avete conosciuto",
      "p": 50,
      "k": [
        "Ascolto",
        "Rispetto della persona",
        "Nessun dato che la renda riconoscibile senza il suo consenso"
      ]
    }
  ]
},
{
  "n": 11,
  "c": "#FD9D24",
  "t": "Città sostenibili",
  "s": "Città inclusive, sicure e sostenibili",
  "q": "Da quale anno il Centro storico di Napoli è Patrimonio dell'Umanità UNESCO?",
  "o": [
    "1987",
    "1995",
    "2004",
    "2011"
  ],
  "campana": {
    "q": "Quanti metri quadrati di verde urbano per abitante ha il capoluogo della vostra provincia?",
    "src": [
      [
        "ISTAT – Dati ambientali nelle città",
        "https://www.istat.it"
      ]
    ]
  },
  "lt": "Spazi da ridare vita",
  "ld": "Ogni paese ha un luogo abbandonato: una villa comunale chiusa, un campetto rotto, una scuola vuota.",
  "parts": [
    {
      "t": "Mappate i luoghi abbandonati o degradati del vostro territorio",
      "p": 50,
      "k": [
        "Completezza",
        "Descrizione dello stato",
        "Foto"
      ]
    },
    {
      "t": "Sceglietene uno e progettate come potrebbe rinascere (disegno, plastico, presentazione)",
      "p": 100,
      "k": [
        "Idea realistica",
        "Risponde a un bisogno",
        "Presentazione curata"
      ]
    },
    {
      "t": "Presentate il progetto al Comune oppure fate una giornata di pulizia e cura sul posto",
      "p": 50,
      "k": [
        "Azione realizzata",
        "Coinvolgimento di altri",
        "Documentazione"
      ]
    }
  ]
},
{
  "n": 12,
  "c": "#BF8B2E",
  "t": "Consumo responsabile",
  "s": "Consumo e produzione responsabili",
  "q": "La legge italiana 166 del 2016, detta \"legge Gadda\", riguarda:",
  "o": [
    "Il divieto delle buste di plastica",
    "La lotta allo spreco alimentare",
    "Il riciclo dei RAEE",
    "L'etichettatura degli OGM"
  ],
  "campana": {
    "q": "Qual è la percentuale di raccolta differenziata del vostro comune, e com'è rispetto alla media regionale?",
    "src": [
      [
        "ISPRA – Catasto rifiuti",
        "https://www.catasto-rifiuti.isprambiente.it"
      ]
    ]
  },
  "lt": "Ripara, scambia, riusa",
  "ld": "Prima di comprare, si può riparare, prendere in prestito o scambiare?",
  "parts": [
    {
      "t": "Mappate negozi di prodotti sfusi, riparatori (calzolai, sarti, elettricisti), mercatini dell'usato",
      "p": 50,
      "k": [
        "Completezza",
        "Informazioni utili",
        "Luoghi verificati"
      ]
    },
    {
      "t": "Organizzate uno swap party (scambio di vestiti, libri, attrezzatura scout) aperto al paese",
      "p": 100,
      "k": [
        "Evento realizzato",
        "Partecipazione esterna al clan",
        "Organizzazione"
      ]
    },
    {
      "t": "Pesate o contate gli oggetti che hanno trovato una seconda vita",
      "p": 50,
      "k": [
        "Dato misurato",
        "Metodo chiaro",
        "Confronto con un dato di riferimento"
      ]
    }
  ]
},
{
  "n": 13,
  "c": "#3F7E44",
  "t": "Agire per il clima",
  "s": "Lotta contro il cambiamento climatico",
  "q": "Quale accordo, adottato alla COP21 del 2015, punta a contenere il riscaldamento globale ben sotto i 2°C, possibilmente entro 1,5°C?",
  "o": [
    "Protocollo di Kyoto",
    "Accordo di Parigi",
    "Patto di Glasgow",
    "Convenzione di Rio"
  ],
  "campana": {
    "q": "Quanti eventi climatici estremi ha registrato la Campania nell'ultimo anno, e dove?",
    "src": [
      [
        "Legambiente – Osservatorio CittàClima",
        "https://cittaclima.it"
      ]
    ]
  },
  "lt": "L'impronta del clan",
  "ld": "Anche le uscite e le route hanno un costo per il clima. Misuratelo e riducetelo.",
  "parts": [
    {
      "t": "Calcolate l'impronta di CO₂ della vostra ultima route o uscita (trasporti, cibo, rifiuti) con un calcolatore online",
      "p": 75,
      "k": [
        "Dati completi",
        "Strumento indicato",
        "Voci principali individuate"
      ]
    },
    {
      "t": "Scrivete una \"carta clima\" del clan con 3 impegni concreti",
      "p": 50,
      "k": [
        "Impegni concreti e misurabili",
        "Legati al calcolo",
        "Condivisi da tutto il clan"
      ]
    },
    {
      "t": "Piantate almeno un albero con il permesso del Comune o di un'associazione, e adottatelo",
      "p": 75,
      "k": [
        "Permesso ottenuto",
        "Specie adatta al luogo",
        "Piano di cura"
      ]
    }
  ]
},
{
  "n": 14,
  "c": "#0A97D9",
  "t": "La vita sott'acqua",
  "s": "Conservare mari e risorse marine",
  "q": "In quale quartiere di Napoli si trova il Parco Sommerso di Gaiola, area marina protetta con resti di ville romane?",
  "o": [
    "Posillipo",
    "Chiaia",
    "Bagnoli",
    "San Giovanni a Teduccio"
  ],
  "campana": {
    "q": "Che percentuale delle acque costiere campane è classificata come \"eccellente\", e quali tratti sono vietati alla balneazione?",
    "src": [
      [
        "Portale Acque – Ministero della Salute",
        "https://www.portaleacque.salute.gov.it"
      ],
      [
        "ARPAC",
        "https://www.arpacampania.it"
      ]
    ]
  },
  "lt": "Da qui al mare",
  "ld": "Tutto ciò che buttiamo a terra, prima o poi, arriva al mare, anche dall'entroterra. Scegliete la variante che fa per voi.",
  "variants": [
    [
      "Se avete il mare vicino",
      "Ripulite un tratto di spiaggia, scogliera o lungomare per almeno un'ora."
    ],
    [
      "Se il mare è lontano",
      "Il fiume, torrente o canale più vicino a voi dove arriva? Seguitene il percorso sulla mappa fino al mare, visitatene almeno un tratto e raccontate cosa porta con sé fino alla costa."
    ]
  ],
  "parts": [
    {
      "t": "L'attività principale: la pulizia (costa) oppure il percorso del corso d'acqua fino al mare (entroterra)",
      "p": 100,
      "k": [
        "Durata e partecipazione",
        "Documentazione",
        "Sicurezza"
      ]
    },
    {
      "t": "Foto prima e dopo la pulizia, oppure foto di almeno 3 punti del percorso",
      "p": 50,
      "k": [
        "Foto chiare",
        "Confronto evidente",
        "Luoghi indicati"
      ]
    },
    {
      "t": "Il rifiuto più frequente, o cosa arriva fino al mare, e un'idea concreta per ridurlo",
      "p": 50,
      "k": [
        "Basato su ciò che avete visto",
        "Idea concreta",
        "A chi la proponete"
      ]
    }
  ]
},
{
  "n": 15,
  "c": "#56C02B",
  "t": "La vita sulla terra",
  "s": "Proteggere ecosistemi e biodiversità",
  "q": "Qual è il fiore simbolo del Parco Nazionale del Cilento, Vallo di Diano e Alburni?",
  "o": [
    "Stella alpina",
    "Primula di Palinuro",
    "Giglio di mare",
    "Orchidea selvatica"
  ],
  "campana": {
    "q": "Quanto suolo è consumato in Campania (in percentuale), e come si colloca la vostra provincia?",
    "src": [
      [
        "ISPRA – Rapporto sul consumo di suolo",
        "https://www.isprambiente.gov.it"
      ]
    ]
  },
  "lt": "BioBlitz",
  "ld": "Quante specie vivono nel vostro territorio? Diventate naturalisti per un giorno, in campagna o in città.",
  "variants": [
    [
      "Area naturale",
      "Un bosco, un parco, una riva, un sentiero."
    ],
    [
      "Area urbana",
      "Verde pubblico, alberi dei viali, fauna di città (uccelli, insetti, piccoli animali), aree abbandonate riconquistate dalla natura."
    ]
  ],
  "parts": [
    {
      "t": "Almeno 20 osservazioni caricate con l'app iNaturalist: inviate il link al progetto",
      "p": 100,
      "k": [
        "Numero e varietà delle specie",
        "Foto riconoscibili",
        "Area indicata"
      ]
    },
    {
      "t": "Una scheda dell'area scelta (naturale o urbana): com'è, quali specie vi hanno colpito",
      "p": 50,
      "k": [
        "Descrizione dell'area",
        "Specie più interessanti",
        "Foto"
      ]
    },
    {
      "t": "Una minaccia per quell'area (incendi, discariche, cemento, incuria) e una proposta",
      "p": 50,
      "k": [
        "Minaccia documentata",
        "Cause",
        "Proposta concreta"
      ]
    }
  ]
},
{
  "n": 16,
  "c": "#00689D",
  "t": "Pace e giustizia",
  "s": "Pace, giustizia e istituzioni solide",
  "q": "Don Peppe Diana, sacerdote e capo scout AGESCI ucciso dalla camorra il 19 marzo 1994, era parroco a:",
  "o": [
    "Scampia",
    "Casal di Principe",
    "Afragola",
    "Torre Annunziata"
  ],
  "campana": {
    "q": "Quanti beni confiscati alla criminalità organizzata ci sono in Campania, e quanti sono riutilizzati a fini sociali?",
    "src": [
      [
        "ANBSC – OpenRE.G.I.O.",
        "https://openregio.anbsc.it"
      ],
      [
        "Libera",
        "https://www.libera.it"
      ]
    ]
  },
  "lt": "I beni tornati alla comunità",
  "ld": "Case, terreni e aziende confiscati alla camorra oggi possono diventare scuole, cooperative, centri per ragazzi.",
  "parts": [
    {
      "t": "Cercate i beni confiscati nel vostro comune o provincia (il sito dell'ANBSC o Libera possono aiutarvi) e mappateli",
      "p": 50,
      "k": [
        "Fonte citata",
        "Completezza",
        "Stato di riutilizzo indicato"
      ]
    },
    {
      "t": "Visitate un bene riutilizzato e intervistate chi ci lavora",
      "p": 100,
      "k": [
        "Visita reale",
        "Domande pertinenti",
        "Cosa avete imparato"
      ]
    },
    {
      "t": "Raccontate cosa si potrebbe fare di un bene ancora inutilizzato",
      "p": 50,
      "k": [
        "Bene reale e indicato",
        "Idea realistica",
        "Risponde a un bisogno"
      ]
    }
  ]
},
{
  "n": 17,
  "c": "#19486A",
  "t": "Partnership",
  "s": "Rafforzare il partenariato globale",
  "q": "Quanti sono in totale i traguardi (target) dei 17 obiettivi dell'Agenda 2030?",
  "o": [
    "100",
    "169",
    "200",
    "232"
  ],
  "campana": {
    "q": "Quanti enti del Terzo Settore iscritti al RUNTS hanno sede nella vostra provincia?",
    "src": [
      [
        "RUNTS – Ministero del Lavoro",
        "https://servizi.lavoro.gov.it/runts"
      ]
    ]
  },
  "lt": "Insieme verso uno scopo comune",
  "ld": "Nessun obiettivo si raggiunge da soli. Trovate un'altra realtà del territorio (un altro clan, una scuola, un'associazione, il Comune) e costruite qualcosa insieme. Non conta il documento firmato: conta lo scopo che vi unisce e quello che riuscite a fare insieme.",
  "parts": [
    {
      "t": "Un'azione di uno qualsiasi degli altri obiettivi, realizzata insieme a un'altra realtà",
      "p": 100,
      "k": [
        "Azione realizzata davvero",
        "Contributo di entrambi",
        "Legame con un obiettivo"
      ]
    },
    {
      "t": "Lo scopo comune: cosa costruite insieme, chi fa cosa, cosa continua dopo",
      "p": 50,
      "k": [
        "Scopo chiaro",
        "Ruoli definiti",
        "Cosa continua dopo"
      ]
    },
    {
      "t": "Racconto e foto dell'azione",
      "p": 50,
      "k": [
        "Chiarezza",
        "Voce dell'altra realtà",
        "Foto"
      ]
    }
  ]
}
];
