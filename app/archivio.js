/* Technical Requirements — piccolo archivio chiave/valore in IndexedDB (serve per ricordare la chiave non esportabile). */
(function (TRD) {
  'use strict';

  const DB = 'technical-requirements', TAB = 'kv';
  let apertura = null;

  function apri() {
    if (!apertura) {
      apertura = new Promise((ok, ko) => {
        const r = indexedDB.open(DB, 1);
        r.onupgradeneeded = () => r.result.createObjectStore(TAB);
        r.onsuccess = () => ok(r.result);
        r.onerror = () => ko(r.error);
      });
    }
    return apertura;
  }

  async function operazione(modo, fn) {
    const db = await apri();
    return new Promise((ok, ko) => {
      const t = db.transaction(TAB, modo);
      const r = fn(t.objectStore(TAB));
      t.oncomplete = () => ok(r && r.result);
      t.onerror = () => ko(t.error);
    });
  }

  // Se IndexedDB non è disponibile (finestra privata, dati bloccati) si lavora senza ricordare nulla.
  async function leggi(k) {
    try { return await operazione('readonly', (s) => s.get(k)); } catch (e) { return null; }
  }

  async function scrivi(k, v) {
    try {
      await operazione('readwrite', (s) => (v == null ? s.delete(k) : s.put(v, k)));
      return true;
    } catch (e) {
      return false;
    }
  }

  TRD.archivio = { leggi, scrivi };
})(window.TRD = window.TRD || {});
