# Technical Requirements · TGI Sport

Pagina web per compilare il **Technical Requirements Document** degli eventi AIR® (versione REMOTE) e scaricarlo in Word, con la stessa impaginazione del modello ufficiale.

L'interfaccia è in inglese britannico; codice, commenti e questo README sono in italiano.

## Come si usa

1. Aprire il sito e inserire la **password del team**. Con *Remember on this device* non la chiede più su quel computer; *Sign out* la dimentica.
2. Compilare le sezioni (Event overview, Accreditation, Signals, Schedule, Contacts). Ogni campo indica chi deve fornirlo: **TGI**, **HB** (Host Broadcaster), **UEFA**, **LED** (fornitore LED), **BC** (broadcaster VBR). In alto i contatori mostrano cosa manca a ciascuno; *Show fields for* evidenzia solo i campi di una parte.
3. Lo schedule si compila in ora locale: la colonna CET/CEST si calcola dalla differenza di fuso impostata nella sezione 1, e CET o CEST si sceglie dalla data.
4. **Export data** salva un `.json` da mandare a una parte esterna; **Import data** unisce il `.json` ricevuto (i valori pieni sovrascrivono, quelli vuoti non cancellano nulla).
5. **Generate .docx** scarica il documento. I campi vuoti restano con il loro segnaposto `[...]`.

## Privacy

- I dati del modulo restano **solo nel browser** (salvataggio automatico locale): nessun server, nessun database, nessuna statistica.
- La pagina ha una Content-Security-Policy: carica solo i propri file e non si collega a nient'altro.
- Il **modello Word** (testi, loghi, diagramma) è **cifrato** con la password del team (AES-256-GCM, chiave PBKDF2-SHA256 con 600.000 iterazioni) in `modello/modello.js`. Nel modello non ci sono nomi né telefoni personali: i contatti TGI si inseriscono dalla pagina (*Remember TGI contacts in this browser*).

## Aggiornare il modello o cambiare la password

Il modello in chiaro e la password stanno solo in locale (`sorgente/template.docx`, `sorgente/password.txt`, mai pubblicati). Dopo una modifica:

```bash
node strumenti/cifra-modello.mjs sorgente/password.txt sorgente/template.docx modello/modello.js
```

La password è la prima riga di `sorgente/password.txt` che non inizia con `#`; lo strumento non la stampa mai. Per cambiarla basta scrivere la nuova nel file e rilanciare il comando. Poi si aumenta il numero `?v=` dei file in `index.html` e si pubblica.

Nel modello Word i campi sono `{tag}` (sintassi docxtemplater); le righe di persone e mezzi si ripetono tra `{#people}…{/people}` e `{#vehicles}…{/vehicles}`. Ogni tag deve restare con una sola formattazione.

## Struttura

| Percorso | Contenuto |
|---|---|
| `index.html` | pagina unica (accesso + modulo) |
| `app/` | `app.js` modulo e generazione, `accesso.js`, `cifratura.js`, `archivio.js` (IndexedDB), `stile.css` |
| `lib/` | PizZip e docxtemplater (copiati, nessun CDN; licenza MIT) |
| `modello/modello.js` | modello Word cifrato |
| `Logo/` | logo TGI Sport |

## Prova in locale

Un qualsiasi server statico in questa cartella, per esempio `python3 -m http.server`, poi http://localhost:8000.
