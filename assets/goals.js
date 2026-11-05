/* =====================================================================
   STRADE 2030 · Contenuti e impostazioni del gioco
   ---------------------------------------------------------------------
   IMPOSTAZIONI che puoi cambiare tu (le prime righe qui sotto).
   Le risposte giuste delle domande globali NON stanno qui: sono nel
   database (tabella quiz_key). Le risposte di riferimento delle domande
   campane sono nel database (tabella campana_key).
   ===================================================================== */

/* Come le Comunità R/S consegnano i materiali delle sfide locali (foto, documenti, video).
   modo: "email"  = una mail per sfida all'indirizzo indicato qui sotto
         "modulo" = Google Modulo con caricamento file
         ""       = nessuna istruzione (solo racconto e link nel sito)
   modulo: link "precompilato" del Google Modulo in cui hai scritto, nei campi,
           esattamente ZONA, CLAN, CODICE, OBIETTIVO, SFIDA (vedi LEGGIMI).
   email: indirizzo a cui inviare i materiali. */
const CONSEGNA = {
  modo: "email",
  modulo: "",
  email: "strade2030@gmail.com",
  limiteMB: 20
};

/* Zone AGESCI Campania (devono coincidere con quelle del database). */
const ZONE = ["Caserta","Faito","Felix","Hirpinia","Liternum","Napoli","Poseidonia","Salerno","Samnium","Vesuvio","Volturno"];

/* Punteggi (devono coincidere con la funzione classifica del database).
   Sfida locale: 3 prove da 10 punti, quindi al massimo 30. */
const PTS_GLOBAL = 10, PTS_CAMPANA = 10, PTS_BONUS = 10, LOCAL_MAX = 30;

/* Sblocco degli obiettivi di futuro: tutte le domande globali e campane
   risposte, e almeno questo numero di sfide locali consegnate. */
const SBLOCCO_LOCALI = 1;

/* Icone ufficiali degli obiettivi: assets/img/sdg/goal-1.png ... goal-17.png
   Finché SDG_ICONE è false si usano i riquadri colorati con numero e nome. */
const SDG_ICONE = true;    // icone ufficiali sulla mappa, da assets/img/sdg/ (false = caselle colorate)
const SDG_ICON = n => `assets/img/sdg/goal-${n}.png`;

/* Nomi dei 3 livelli di difficoltà delle prove locali (dalla prima alla quarta). */
const LIVELLI = ["Primo passo", "Si entra nel vivo", "Il passo più lungo"];

/* ---------------------------------------------------------------------
   I 17 OBIETTIVI
   q, o      = domanda globale e opzioni
   campana   = domanda sulla Campania a risposta multipla: domanda (q),
               opzioni (o), fonti da consultare [nome, link], nota
               facoltativa. La risposta giusta e la spiegazione sono nel
               database (tabella campana_key): l'ordine delle opzioni qui
               deve restare lo stesso.
   Nei testi: *parola* = corsivo; i link che iniziano con https://
   diventano cliccabili.
   ld        = breve introduzione della sfida locale
   parts     = le 3 prove della sfida locale, dalla più facile alla più
               difficile: t cosa fare, p punti (10), k criteri di
               valutazione, r regole obbligatorie (facoltative)
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
      "q": "Qual è il comune campano con il reddito medio dichiarato più basso (dichiarazioni 2024, redditi 2023)?",
      "o": [
        "Rofrano",
        "Castelvetere in Val Fortore",
        "Castelfranco in Miscano",
        "Baselice"
      ],
      "src": [
        [
          "MEF – Statistiche sulle dichiarazioni dei redditi (open data per comune)",
          "https://www1.finanze.gov.it/finanze/analisi_stat/public/index.php?opendata=yes"
        ],
        [
          "QuiFinanza – I comuni più ricchi (e più poveri) della Campania",
          "https://quifinanza.it/economia/comuni-piu-ricchi-campania/904186/"
        ]
      ],
      "nota": "Il PIL non si calcola per ogni comune: per confrontare i comuni si usa il reddito medio dichiarato."
    },
    "ld": "La povertà ha tante facce: cibo, casa, bollette, scuola. Scoprite chi è in difficoltà vicino a voi e chi lo aiuta.",
    "parts": [
      {
        "t": "Mappate le realtà che aiutano chi vive in povertà nel vostro paese o quartiere: Caritas parrocchiali, mense, banchi alimentari, empori solidali, dormitori. Per ognuna: orari e servizi offerti (anche con Google My Maps).",
        "p": 10,
        "k": [
          "Completezza dei punti",
          "Dati verificati",
          "Mappa leggibile"
        ]
      },
      {
        "t": "Fate almeno un'ora di servizio in una delle realtà mappate, documentatela con foto e intervistate un volontario: quali povertà vede oggi (cibo, casa, bollette, lavoro, scuola)?",
        "p": 10,
        "k": [
          "Servizio reale, non una visita",
          "Ascolto vero",
          "Cosa avete imparato"
        ]
      },
      {
        "t": "Organizzate una raccolta aperta al paese (alimenti, prodotti per l'igiene o materiale scolastico) su un bisogno concordato con la realtà che la riceverà, e consegnatela insieme.",
        "p": 10,
        "k": [
          "Raccolta realizzata davvero",
          "Bisogno concordato prima",
          "Quantità e destinatario documentati"
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
      "q": "Qual è il prodotto DOP o IGP campano che vale di più sul mercato, secondo il Rapporto Ismea-Qualivita?",
      "o": [
        "Mozzarella di Bufala Campana DOP",
        "Pasta di Gragnano IGP",
        "Limone Costa d'Amalfi IGP",
        "Pomodoro San Marzano dell'Agro Sarnese-Nocerino DOP"
      ],
      "src": [
        [
          "Qualivita – Atlante e rapporti sui prodotti DOP IGP",
          "https://www.qualivita.it"
        ],
        [
          "FirstOnline – Il food di qualità porta la Campania al vertice",
          "https://www.firstonline.info/en/il-food-di-qualita-porta-la-campania-al-vertice-delle-regioni-con-fatturati-record/"
        ]
      ]
    },
    "ld": "Il cibo buttato e la fame convivono anche sotto casa vostra. Scoprite chi produce vicino a voi e quanto si spreca.",
    "parts": [
      {
        "t": "Mappate almeno 5 produttori locali, orti urbani o mercati contadini del vostro territorio.",
        "p": 10,
        "k": [
          "Numero e varietà",
          "Informazioni utili",
          "Luoghi verificati"
        ]
      },
      {
        "t": "Per una settimana pesate il cibo buttato nelle vostre famiglie. Raccogliete i dati in una tabella e proponete 3 idee per ridurlo.",
        "p": 10,
        "k": [
          "Dati misurati davvero",
          "Tabella chiara",
          "Idee concrete"
        ]
      },
      {
        "t": "Contattate un forno, un bar o un supermercato e organizzate il recupero dell'invenduto verso una realtà solidale (anche una sola volta), raccontando com'è andata.",
        "p": 10,
        "k": [
          "Recupero realizzato davvero",
          "Quantità e destinatario documentati",
          "Possibilità di continuare"
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
      "q": "Quale provincia campana ha la speranza di vita alla nascita più bassa (ISTAT, 2024)?",
      "o": [
        "Salerno",
        "Avellino",
        "Napoli",
        "Benevento"
      ],
      "src": [
        [
          "ISTAT – Il benessere equo e sostenibile dei territori: Campania (BES 2025)",
          "https://www.istat.it/wp-content/uploads/2025/12/BesT2025_Campania.pdf"
        ]
      ]
    },
    "ld": "La salute non è solo assenza di malattia: è ascolto, saper intervenire, accesso alle cure, benessere dei giovani.",
    "parts": [
      {
        "t": "Mappate i servizi GRATUITI del vostro territorio che offrono ascolto e supporto psicologico: consultori, sportelli d'ascolto scolastici, servizi ASL per i giovani, associazioni, linee telefoniche. Per ognuno: indirizzo, orari, contatti, come si accede.",
        "p": 10,
        "k": [
          "Completezza",
          "Dati verificati",
          "Facile da usare per un ragazzo"
        ]
      },
      {
        "t": "Primo soccorso: inviate un video (massimo 3 minuti) in cui simulate la chiamata al 112, la posizione laterale di sicurezza, la disostruzione e la sequenza di rianimazione.",
        "p": 10,
        "k": [
          "Manovre corrette",
          "Spiegazione chiara",
          "Fonte ufficiale citata"
        ],
        "r": [
          "Seguite le linee guida ufficiali (Croce Rossa Italiana, IRC – Italian Resuscitation Council) e citatele nel video.",
          "Compressioni toraciche e ventilazioni SOLO su manichino, mai su una persona.",
          "Se possibile, fatevi seguire da un istruttore o da un soccorritore."
        ]
      },
      {
        "t": "La salute come diritto: indagate l'accesso alle cure nel vostro territorio (tempi di attesa, distanze, difficoltà). Almeno 2 interviste a operatori sanitari o del CUP, almeno 5 testimonianze di persone della vostra rete, poi le 3 criticità principali e una proposta.",
        "p": 10,
        "k": [
          "Interlocutori competenti",
          "Criticità documentate",
          "Proposta realistica"
        ],
        "r": [
          "Interviste agli operatori SOLO con il loro consenso e, se in struttura, con il permesso della direzione.",
          "Non avvicinate pazienti dentro ospedali o ambulatori: le testimonianze raccoglietele nella vostra rete (famiglie, vicini, parrocchia).",
          "Niente nomi né dati sanitari personali nel materiale consegnato. Fonti utili: tempi di attesa sul sito della vostra ASL, Regione Campania – Sanità, AGENAS."
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
      "q": "In quale provincia campana è più bassa la quota di giovani tra 15 e 29 anni che non studiano e non lavorano (NEET, 2024)?",
      "o": [
        "Napoli",
        "Caserta",
        "Avellino",
        "Salerno"
      ],
      "src": [
        [
          "ISTAT – Il benessere equo e sostenibile dei territori: Campania (BES 2025)",
          "https://www.istat.it/wp-content/uploads/2025/12/BesT2025_Campania.pdf"
        ],
        [
          "Openpolis – Dispersione e abbandono scolastico",
          "https://openpolis.it/3_labbandono-scolastico-e-un-problema-serio-al-sud-e-non-solo"
        ]
      ]
    },
    "ld": "La dispersione scolastica in Campania è tra le più alte d'Italia. E nel vostro comune? Scoprite chi resta indietro e perché.",
    "parts": [
      {
        "t": "Trovate il dato più preciso possibile sulla dispersione o l'abbandono scolastico del vostro comune (se non esiste, della provincia), con la fonte (ISTAT, Openpolis, Comune, Ufficio Scolastico), e confrontatelo con la media italiana.",
        "p": 10,
        "k": [
          "Dato del vostro territorio",
          "Fonte citata e affidabile",
          "Confronto con la media"
        ]
      },
      {
        "t": "Intervistate un dirigente scolastico, un insegnante o un assistente sociale: quanti ragazzi lasciano la scuola nel vostro territorio, e perché?",
        "p": 10,
        "k": [
          "Interlocutore competente",
          "Domande sul perché",
          "Sintesi chiara"
        ]
      },
      {
        "t": "Offrite almeno due pomeriggi di aiuto compiti a ragazzi più piccoli, insieme a una parrocchia, un'associazione o un doposcuola del territorio.",
        "p": 10,
        "k": [
          "Attività realizzata davvero",
          "Continuità e cura",
          "Cosa avete imparato"
        ],
        "r": [
          "Sempre in un luogo della realtà che vi ospita e con un suo adulto responsabile presente.",
          "Foto solo con il consenso delle famiglie, meglio senza volti dei bambini."
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
      "q": "Quale percentuale dei consiglieri comunali in Campania sono donne (2024)?",
      "o": [
        "Circa il 12%",
        "Circa il 28%",
        "Circa il 34%",
        "Circa il 45%"
      ],
      "src": [
        [
          "ISTAT – Il benessere equo e sostenibile dei territori: Campania (BES 2025)",
          "https://www.istat.it/wp-content/uploads/2025/12/BesT2025_Campania.pdf"
        ],
        [
          "Ministero dell'Interno – Anagrafe degli amministratori locali",
          "https://dait.interno.gov.it/elezioni/anagrafe-amministratori"
        ]
      ]
    },
    "ld": "La parità passa dai nomi delle strade, dal lavoro, dalla rappresentanza e dalla libertà dalla violenza. Guardate il vostro comune con questi occhi.",
    "parts": [
      {
        "t": "Mappate i centri antiviolenza, i consultori e gli sportelli che aiutano le donne nel vostro territorio, con orari, contatti e come si accede (ricordate anche il numero nazionale 1522).",
        "p": 10,
        "k": [
          "Completezza",
          "Dati verificati",
          "Informazioni pratiche"
        ]
      },
      {
        "t": "Quante donne ci sono nel consiglio comunale, nella giunta e alla guida delle scuole del vostro comune? Raccogliete i dati e intervistate una donna che ha un ruolo pubblico o fa un mestiere considerato \"maschile\".",
        "p": 10,
        "k": [
          "Dati raccolti",
          "Intervista significativa",
          "Riflessione della Comunità R/S"
        ]
      },
      {
        "t": "Contate le strade, piazze e scuole del vostro comune intitolate a uomini e a donne. Poi scegliete una donna del vostro territorio che meriterebbe una strada, raccontate la sua storia e inviate la proposta al Comune (allegate lettera e ricevuta).",
        "p": 10,
        "k": [
          "Conteggio completo",
          "Storia ben raccontata",
          "Proposta inviata davvero"
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
      "q": "Quanta acqua potabile preleva ogni anno la Campania, e che quota è del totale italiano (ISTAT, 2022)?",
      "o": [
        "0,3 miliardi di m³, circa il 3%",
        "0,9 miliardi di m³, quasi il 10%",
        "2,4 miliardi di m³, circa il 25%",
        "4,5 miliardi di m³, circa la metà"
      ],
      "src": [
        [
          "ISTAT – Le statistiche sull'acqua, Giornata mondiale dell'acqua 2024",
          "https://www.istat.it/it/files/2024/03/Report-GMA-Anno-2024.pdf"
        ],
        [
          "ISTAT – Le statistiche dell'Istat sull'acqua",
          "https://www.istat.it/comunicato-stampa/le-statistiche-dellistat-sullacqua-anni-2020-2022/"
        ]
      ]
    },
    "ld": "Dal Sarno ai Regi Lagni, i corsi d'acqua campani raccontano una storia di inquinamento e di riscatto. Qual è l'acqua del vostro territorio?",
    "parts": [
      {
        "t": "Mappate le fontanine pubbliche del paese: quali funzionano e quali no?",
        "p": 10,
        "k": [
          "Copertura del paese",
          "Stato verificato",
          "Guasti segnalati sulla mappa"
        ]
      },
      {
        "t": "Visitate un fiume, torrente o sorgente vicino a voi e documentatene lo stato: foto, scarichi, rifiuti, cosa c'è intorno.",
        "p": 10,
        "k": [
          "Stato documentato",
          "Cause e scarichi individuati",
          "Uscita in sicurezza"
        ],
        "r": [
          "Mai in acqua né su argini franosi; sempre con un capo."
        ]
      },
      {
        "t": "Inviate una segnalazione documentata al Comune o all'ente competente (gestore idrico, ARPAC, consorzio di bonifica) sui guasti o sugli scarichi che avete trovato, con una proposta. Allegate la ricevuta o la risposta.",
        "p": 10,
        "k": [
          "Segnalazione inviata davvero",
          "Documentazione",
          "Proposta concreta"
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
      "q": "Quale provincia campana ha più potenza fotovoltaica installata (GSE, fine 2024)?",
      "o": [
        "Napoli",
        "Caserta",
        "Salerno",
        "Avellino"
      ],
      "src": [
        [
          "GSE – Solare fotovoltaico, Rapporto statistico 2024",
          "https://www.rinnovabili.it/wp-content/uploads/2025/09/Solare-Fotovoltaico-Rapporto-Statistico-2024.pdf"
        ],
        [
          "GSE – Gestore dei Servizi Energetici",
          "https://www.gse.it"
        ]
      ]
    },
    "ld": "Il sole in Campania non manca. Quanto lo usiamo, e quanta energia sprechiamo?",
    "parts": [
      {
        "t": "Contate gli edifici pubblici del comune (scuole, municipio, palestre) che hanno pannelli solari e confrontateli con il totale.",
        "p": 10,
        "k": [
          "Conteggio completo",
          "Fonte o verifica sul posto",
          "Confronto con il totale"
        ]
      },
      {
        "t": "Fate il check-up energetico della vostra sede: lampadine, apparecchi, riscaldamento, spifferi (una candela vicino agli infissi: se la fiamma si muove, c'è uno spiffero). Proponete al gruppo almeno 3 miglioramenti.",
        "p": 10,
        "k": [
          "Rilevazioni concrete",
          "Proposte fattibili",
          "Gruppo coinvolto"
        ]
      },
      {
        "t": "Realizzate davvero almeno uno dei miglioramenti, insieme al gruppo, e misurate la differenza (bolletta, potenza, ore di accensione).",
        "p": 10,
        "k": [
          "Miglioramento realizzato",
          "Differenza misurata",
          "Gruppo coinvolto"
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
      "q": "Quanti punti separano il tasso di occupazione della Campania (20-64 anni) dalla media italiana (2024)?",
      "o": [
        "Circa 5 punti",
        "Circa 10 punti",
        "Circa 18 punti",
        "Circa 30 punti"
      ],
      "src": [
        [
          "ISTAT – Il benessere equo e sostenibile dei territori: Campania (BES 2025)",
          "https://www.istat.it/wp-content/uploads/2025/12/BesT2025_Campania.pdf"
        ]
      ]
    },
    "ld": "Lavoro dignitoso vuol dire mestieri che non spariscono, opportunità per i giovani, sicurezza e diritti.",
    "parts": [
      {
        "t": "Intervistate un artigiano o un lavoratore di un mestiere che rischia di sparire (il liutaio, il ceramista, il casaro, il pastaio, il presepista...). Video o audio di massimo 3-5 minuti.",
        "p": 10,
        "k": [
          "Qualità dell'intervista",
          "Storia del mestiere",
          "Audio o video comprensibile"
        ]
      },
      {
        "t": "Passate una mattinata a imparare il mestiere con lui, poi riflettete: è un lavoro dignitoso? Chi lo continuerà?",
        "p": 10,
        "k": [
          "Esperienza reale",
          "Cosa avete imparato",
          "Riflessione concreta"
        ]
      },
      {
        "t": "Incontrate un sindacato, un patronato o un'associazione contro il lavoro nero e il caporalato, e preparate una guida semplice per chi cerca il primo lavoro (contratto, paga, sicurezza, a chi rivolgersi). Diffondetela nel vostro territorio.",
        "p": 10,
        "k": [
          "Informazioni corrette",
          "Guida chiara e utile",
          "Diffusione reale"
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
      "q": "Quale linea ferroviaria campana il rapporto Pendolaria di Legambiente indica tra le peggiori d'Italia?",
      "o": [
        "Cumana",
        "Linea 1 della metropolitana di Napoli",
        "Napoli-Salerno via Cava de' Tirreni",
        "Ex Circumvesuviana"
      ],
      "src": [
        [
          "Legambiente – Rapporto Pendolaria (20ª edizione)",
          "https://www.legambiente.it/wp-content/uploads/2025/12/Rapporto-Pendolaria-20esima-edizione-1.pdf"
        ]
      ]
    },
    "ld": "Un'infrastruttura serve se tutti possono usarla: trasporti, internet, strade senza barriere.",
    "parts": [
      {
        "t": "Come si arriva dal vostro paese al capoluogo di provincia con i mezzi pubblici? Tempi, costi e frequenze, confrontati con l'auto.",
        "p": 10,
        "k": [
          "Dati verificati",
          "Confronto chiaro",
          "Lettura del problema"
        ]
      },
      {
        "t": "Percorrete un tragitto quotidiano (stazione-scuola, piazza-municipio) con gli occhi di chi è in carrozzina o ha un passeggino: mappate ogni barriera architettonica con foto e posizione.",
        "p": 10,
        "k": [
          "Tragitto significativo",
          "Barriere complete",
          "Foto e posizioni precise"
        ]
      },
      {
        "t": "Inviare al Comune una segnalazione delle barriere riscontrate, accompagnata da una proposta di soluzione, allegando la ricevuta di invio o l'eventuale risposta ricevuta. Inviare inoltre suggerimenti relativi agli orari e ai collegamenti che la popolazione ritiene utili (prova 1), ma che attualmente risultano mancanti.",
        "p": 10,
        "k": [
          "Segnalazione inviata",
          "Proposte di soluzione",
          "Suggerimenti su orari e collegamenti"
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
      "q": "Quale provincia campana ha il reddito disponibile delle famiglie più basso (valore mediano per persona, 2022)?",
      "o": [
        "Avellino",
        "Napoli",
        "Benevento",
        "Salerno"
      ],
      "src": [
        [
          "ISTAT – Il benessere equo e sostenibile dei territori: Campania (BES 2025)",
          "https://www.istat.it/wp-content/uploads/2025/12/BesT2025_Campania.pdf"
        ]
      ]
    },
    "ld": "Le disuguaglianze hanno tante forme: reddito, età, disabilità, origine. Incontrate chi le vive nel vostro territorio.",
    "parts": [
      {
        "t": "Anziani soli: passate un pomeriggio con persone anziane (in una casa di riposo, un centro anziani o nella vostra rete) e raccogliete una loro storia.",
        "p": 10,
        "k": [
          "Ascolto vero",
          "Storia raccolta",
          "Rispetto della persona"
        ],
        "r": [
          "Con il permesso della struttura e delle persone coinvolte; niente foto o nomi senza il loro consenso."
        ]
      },
      {
        "t": "Disabilità: organizzate un'attività insieme a persone con disabilità (sport, laboratorio, uscita) con un'associazione del territorio.",
        "p": 10,
        "k": [
          "Fatta insieme, non \"per\"",
          "Partecipazione",
          "Cura dell'organizzazione"
        ]
      },
      {
        "t": "Migrazione: contattate un progetto di accoglienza (SAI, cooperativa sociale, casa famiglia), organizzate un'attività insieme (una partita, una cena, un laboratorio) e raccontate l'incontro dal punto di vista di chi avete conosciuto.",
        "p": 10,
        "k": [
          "Fatta insieme",
          "Ascolto",
          "Rispetto della persona"
        ],
        "r": [
          "Nessun dato o foto che renda riconoscibile una persona senza il suo consenso."
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
      "q": "Quale capoluogo campano ha la posizione migliore nella classifica Ecosistema Urbano 2025 di Legambiente?",
      "o": [
        "Salerno",
        "Napoli",
        "Caserta",
        "Avellino"
      ],
      "src": [
        [
          "Legambiente – Ecosistema Urbano",
          "https://www.legambiente.it/attivita-scientifiche/ecosistema-urbano/"
        ],
        [
          "Ecosistema Urbano 2025: le posizioni dei capoluoghi campani",
          "https://occhiodisalerno.it/salerno-ecosistema-urbano-2025"
        ]
      ]
    },
    "ld": "Una città sostenibile ha spazi vivi, si muove bene e si prende cura dei suoi luoghi.",
    "parts": [
      {
        "t": "Mappate i luoghi abbandonati o degradati del vostro territorio (una villa chiusa, un campetto inutilizzabile, una scuola vuota), con foto e stato.",
        "p": 10,
        "k": [
          "Completezza",
          "Descrizione dello stato",
          "Foto"
        ]
      },
      {
        "t": "Organizzate una giornata di pulizia e cura in uno dei luoghi mappati, coinvolgendo altre persone del paese e/o associazioni.",
        "p": 10,
        "k": [
          "Azione realizzata",
          "Coinvolgimento di altri",
          "Documentazione"
        ],
        "r": [
          "Con il permesso del Comune o del proprietario; guanti e attrezzi adatti."
        ]
      },
      {
        "t": "Progettate come potrebbe rinascere uno dei luoghi (disegno, plastico, presentazione) e presentate il progetto al Comune, con un incontro o una lettera protocollata.",
        "p": 10,
        "k": [
          "Idea realistica",
          "Risponde a un bisogno",
          "Presentato davvero"
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
      "q": "Quale provincia campana ha la percentuale di raccolta differenziata più alta (2023)?",
      "o": [
        "Benevento",
        "Napoli",
        "Salerno",
        "Caserta"
      ],
      "src": [
        [
          "ISPRA – Catasto rifiuti",
          "https://www.catasto-rifiuti.isprambiente.it"
        ],
        [
          "ISTAT – Il benessere equo e sostenibile dei territori: Campania (BES 2025)",
          "https://www.istat.it/wp-content/uploads/2025/12/BesT2025_Campania.pdf"
        ]
      ]
    },
    "ld": "Prima di comprare e buttare, si può scegliere lo sfuso, riparare, scambiare, differenziare.",
    "parts": [
      {
        "t": "Mappate negozi di prodotti sfusi, riparatori (calzolai, sarti, elettricisti, ciclisti) e mercatini dell'usato del vostro territorio.",
        "p": 10,
        "k": [
          "Completezza",
          "Informazioni utili",
          "Luoghi verificati"
        ]
      },
      {
        "t": "Riparare invece di buttare: con l'aiuto di un riparatore del territorio o di una persona che ha conoscenze in materia, imparate a riparare uno o più oggetti di uso comune della Comunità R/S o del paese (bici, zaini, attrezzatura: ad esempio rattoppare, cucire, sostituire un pezzo o riparare una camera d'aria) e mettetelo in pratica con le vostre mani.",
        "p": 10,
        "k": [
          "Riparazione fatta con le vostre mani",
          "Cosa avete imparato",
          "Foto prima e dopo"
        ]
      },
      {
        "t": "Organizzate uno swap party (scambio di vestiti, libri, attrezzatura) aperto al paese e contate gli oggetti che hanno trovato una seconda vita.",
        "p": 10,
        "k": [
          "Evento realizzato",
          "Partecipazione esterna alla Comunità R/S",
          "Oggetti contati"
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
      "q": "Quale parte del territorio della provincia di Napoli è coperta da cemento e asfalto (suolo impermeabilizzato, 2023)?",
      "o": [
        "Circa il 7%",
        "Circa il 15%",
        "Circa il 35%",
        "Circa il 60%"
      ],
      "src": [
        [
          "ISPRA – Consumo di suolo",
          "https://www.isprambiente.gov.it"
        ],
        [
          "ISTAT – Il benessere equo e sostenibile dei territori: Campania (BES 2025)",
          "https://www.istat.it/wp-content/uploads/2025/12/BesT2025_Campania.pdf"
        ]
      ]
    },
    "ld": "Il clima cambia anche nel vostro territorio. Misurate il vostro impatto e riducetelo.",
    "parts": [
      {
        "t": "Calcolate l'impronta di CO₂ della vostra ultima route o uscita (trasporti, cibo, rifiuti) con il calcolatore di myclimate: https://co2.myclimate.org/it/event_calculators/new",
        "p": 10,
        "k": [
          "Dati completi",
          "Strumento indicato",
          "Voci principali individuate"
        ]
      },
      {
        "t": "Scrivete una \"carta clima\" della Comunità R/S con 3 impegni concreti e applicatela nella prossima uscita, misurando quanto avete ridotto.",
        "p": 10,
        "k": [
          "Impegni concreti",
          "Applicati davvero",
          "Riduzione misurata"
        ]
      },
      {
        "t": "Piantate almeno un albero, con il permesso del Comune o di un'associazione, e adottatelo con un piano di cura.",
        "p": 10,
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
      "q": "Quante località campane hanno ricevuto la Bandiera Blu 2025?",
      "o": [
        "8",
        "14",
        "20",
        "27"
      ],
      "src": [
        [
          "FEE Italia – Bandiera Blu",
          "https://www.bandierablu.org"
        ],
        [
          "Tuttitalia – Le località Bandiera Blu 2025",
          "https://www.tuttitalia.it/bandiera-blu/2025-spiagge/"
        ]
      ]
    },
    "ld": "Tutto ciò che buttiamo a terra, prima o poi, arriva al mare, anche dall'entroterra.",
    "parts": [
      {
        "t": "Seguite sulla mappa il corso d'acqua più vicino a voi fino al mare (se siete sulla costa, il tratto di mare davanti a voi e le foci vicine): cosa attraversa lungo la strada?",
        "p": 10,
        "k": [
          "Percorso corretto",
          "Cosa attraversa",
          "Mappa chiara"
        ]
      },
      {
        "t": "Ripulite un tratto di spiaggia, scogliera o riva per almeno un'ora: contate e dividete per tipo i rifiuti raccolti, con foto prima e dopo.",
        "p": 10,
        "k": [
          "Durata e partecipazione",
          "Rifiuti contati",
          "Foto prima e dopo"
        ],
        "r": [
          "Guanti sempre; mai in acqua; con il permesso se è un'area protetta."
        ]
      },
      {
        "t": "Partendo dal rifiuto più frequente, proponete un'idea concreta per ridurlo a chi può realizzarla (Comune, scuola, stabilimento, commercianti) e allegate la risposta o la ricevuta.",
        "p": 10,
        "k": [
          "Basata su ciò che avete visto",
          "Idea concreta",
          "Proposta inviata davvero"
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
      "*Primula palinuri*",
      "Giglio di mare",
      "Orchidea selvatica"
    ],
    "campana": {
      "q": "Quanti parchi nazionali ci sono in Campania?",
      "o": [
        "1",
        "2",
        "4",
        "6"
      ],
      "src": [
        [
          "Regione Campania – Parchi e aree protette",
          "https://www.regione.campania.it"
        ],
        [
          "Ministero dell'Ambiente – Elenco ufficiale delle aree protette",
          "https://www.mase.gov.it"
        ]
      ]
    },
    "ld": "Quante specie vivono nel vostro territorio? Conoscete un'area verde vicina, in campagna o in città, e prendetevene cura.",
    "parts": [
      {
        "t": "BioBlitz: scegliete un'area verde vicino a voi (bosco, parco, riva, verde urbano), descrivetela in una scheda e caricate almeno 20 osservazioni di piante e animali con l'app iNaturalist (inviate il link).",
        "p": 10,
        "k": [
          "Scheda dell'area",
          "Numero e varietà delle specie",
          "Foto riconoscibili"
        ]
      },
      {
        "t": "Documentate una minaccia per quell'area (incendi, discariche, cemento, incuria) e le sue cause, con l'intervista a un esperto (guardaparco, Carabinieri forestali, associazione ambientalista).",
        "p": 10,
        "k": [
          "Minaccia documentata",
          "Cause",
          "Esperto coinvolto"
        ]
      },
      {
        "t": "Fate un'azione di cura con un'associazione o l'ente che gestisce l'area (pulizia, sentiero, casette per uccelli o insetti) e proponete come proteggerla.",
        "p": 10,
        "k": [
          "Azione realizzata",
          "Con chi gestisce l'area",
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
      "q": "Secondo i dati dell'Agenzia nazionale analizzati da Eurispes, quale quota dei beni confiscati alla criminalità in Italia si trova in Sicilia, Campania e Calabria insieme?",
      "o": [
        "Circa il 20%",
        "Circa il 40%",
        "Circa il 60%",
        "Circa l'85%"
      ],
      "src": [
        [
          "QdS – Beni confiscati, il 60% tra Sicilia, Campania e Calabria (ricerca Eurispes)",
          "https://qds.it/beni-confiscati-patrimonio-nazionale-da-46-miliardi-60-percento-distribuito-sicilia-campania-calabria/"
        ],
        [
          "ANBSC – OpenRE.G.I.O., i dati sui beni confiscati",
          "https://openregio.anbsc.it"
        ]
      ]
    },
    "ld": "Pace e giustizia si costruiscono con la memoria, la legalità e la partecipazione, a partire dal vostro comune.",
    "parts": [
      {
        "t": "Scoprite una vittima innocente delle mafie o una figura di pace e legalità legata al vostro territorio e raccontatene la storia.",
        "p": 10,
        "k": [
          "Ricerca accurata",
          "Legame con il territorio",
          "Racconto coinvolgente"
        ]
      },
      {
        "t": "Assistete a un consiglio comunale (le sedute sono pubbliche), riassumete cosa si è deciso e intervistate un consigliere o il sindaco su un tema che riguarda i giovani.",
        "p": 10,
        "k": [
          "Presenza reale",
          "Sintesi chiara",
          "Domande pertinenti"
        ]
      },
      {
        "t": "Visitate un bene confiscato riutilizzato, intervistate chi ci lavora e fate con loro almeno mezza giornata di servizio.",
        "p": 10,
        "k": [
          "Visita e servizio reali",
          "Domande pertinenti",
          "Cosa avete imparato"
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
      "q": "Quanto valgono in tutto i progetti delle politiche di coesione in Campania nel ciclo 2014-2020, secondo OpenCoesione?",
      "o": [
        "Circa 2 miliardi di euro",
        "Circa 8 miliardi di euro",
        "Circa 20 miliardi di euro",
        "Circa 60 miliardi di euro"
      ],
      "src": [
        [
          "OpenCoesione – i progetti finanziati nel tuo territorio",
          "https://opencoesione.gov.it"
        ],
        [
          "Eunews – Il profilo della coesione in Campania",
          "https://www.eunews.it/post_true/il-profilo-della-coesione-in-regione-campania-briefing-note/"
        ]
      ]
    },
    "ld": "Nessun obiettivo si raggiunge da soli. Trovate un'altra realtà del territorio e costruite qualcosa insieme.",
    "parts": [
      {
        "t": "Trovate una realtà del vostro territorio (associazione, scuola, altro gruppo, ente) che lavora su un obiettivo che vi sta a cuore e incontratela: cosa fa, di cosa ha bisogno, cosa potreste fare insieme.",
        "p": 10,
        "k": [
          "Incontro reale",
          "Ascolto",
          "Idee emerse"
        ]
      },
      {
        "t": "Scrivete insieme lo scopo comune: cosa costruite, chi fa cosa, cosa continua dopo.",
        "p": 10,
        "k": [
          "Scopo chiaro",
          "Ruoli definiti",
          "Cosa continua dopo"
        ]
      },
      {
        "t": "Realizzate insieme un'azione legata a uno degli altri obiettivi e raccontatela con foto e la voce dell'altra realtà.",
        "p": 10,
        "k": [
          "Azione realizzata davvero",
          "Contributo di entrambi",
          "Voce dell'altra realtà"
        ]
      }
    ]
  }
];
