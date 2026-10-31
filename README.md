# Technical Requirements · TGI Sport

**Pagina spenta il 2026-10-31.** Il Tech Book (Technical Requirements Document delle partite remote) ora si compila nella piattaforma TGI, https://tgi-availability.web.app, nella scheda **Tech Book** della partita: competizione, squadre, data e KO arrivano dall'evento, il salvataggio è automatico e condiviso, il modello Word sta nella piattaforma (caricato dall'admin in *Settings → Tech Book*) senza la password del team.

Il sito mostra solo un avviso con il link alla piattaforma. Se il browser conserva ancora il modulo della vecchia pagina (salvataggio locale `air-trd-v1`), l'avviso offre *Download data (.json)* nello stesso formato di *Export data*: il file si importa con *Import .json* nel Tech Book della partita.

L'interfaccia è in inglese britannico; codice, commenti e questo README sono in italiano.

## Struttura

| Percorso | Contenuto |
|---|---|
| `index.html` | avviso con il link alla piattaforma |
| `app/avviso.js` | scarica il modulo rimasto nel browser, se c'è |
| `app/avviso.css` | stile dell'avviso |
| `Logo/` | logo TGI Sport |

## La vecchia pagina

Il modulo con il modello Word cifrato è nella storia del repository fino al commit `09a405c`. Per riaverlo in locale:

```bash
git worktree add ../webapp-vecchia 09a405c
```

`sorgente/` (modello in chiaro e password, mai pubblicati) e `strumenti/` restano solo in locale.

## Prova in locale

Un qualsiasi server statico in questa cartella, per esempio `python3 -m http.server`, poi http://localhost:8000.
