/* Technical Requirements — accesso con la password del team (il modello Word è cifrato). */
(function (TRD) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const CHIAVE_RICORDATA = 'chiave-team';

  // La chiave (non esportabile) può restare nel browser, così la password si scrive una volta sola.
  async function chiaveRicordata(protezione) {
    const r = await TRD.archivio.leggi(CHIAVE_RICORDATA);
    if (r && r.chiave && r.sale === protezione.sale && (await TRD.cifratura.chiaveValida(r.chiave, protezione))) return r.chiave;
    return null;
  }

  async function ricorda(chiave, protezione, si) {
    await TRD.archivio.scrivi(CHIAVE_RICORDATA, si ? { chiave, sale: protezione.sale } : null);
  }

  function chiediPassword(protezione) {
    return new Promise((fatto) => {
      const box = $('accesso'), form = $('accesso-form'), campo = $('accesso-password');
      const errore = $('accesso-errore'), bottone = $('accesso-entra');
      box.hidden = false;
      box.classList.remove('in-attesa');
      requestAnimationFrame(() => campo.focus());
      const invio = async (e) => {
        e.preventDefault();
        if (!campo.value) return;
        bottone.disabled = true;
        bottone.textContent = 'Checking…';
        errore.hidden = true;
        try {
          const chiave = await TRD.cifratura.derivaChiave(campo.value, protezione.sale, protezione.iterazioni);
          if (!(await TRD.cifratura.chiaveValida(chiave, protezione))) {
            errore.textContent = 'Wrong password.';
            errore.hidden = false;
            campo.select();
            return;
          }
          await ricorda(chiave, protezione, $('accesso-ricorda').checked);
          form.removeEventListener('submit', invio);
          campo.value = '';
          box.hidden = true;
          fatto(chiave);
        } catch (err) {
          errore.textContent = 'Sign-in failed: ' + err.message;
          errore.hidden = false;
        } finally {
          bottone.disabled = false;
          bottone.textContent = 'Sign in';
        }
      };
      form.addEventListener('submit', invio);
    });
  }

  // Si risolve con la chiave del team quando si può usare la pagina.
  async function sblocca() {
    const box = $('accesso');
    const modello = self.TRD_MODELLO;
    if (!modello || !modello.protezione) {
      box.classList.remove('in-attesa');
      $('accesso-form').innerHTML = '<p class="errore">The template file is missing: the page cannot start.</p>';
      return new Promise(() => {});
    }
    if (!TRD.cifratura.disponibile()) {
      box.classList.remove('in-attesa');
      $('accesso-form').innerHTML = '<p class="errore">This browser cannot open the protected template. Please use an up-to-date version of Google Chrome.</p>';
      return new Promise(() => {});
    }
    let chiave = null;
    try { chiave = await chiaveRicordata(modello.protezione); } catch (e) { chiave = null; }
    if (chiave) box.hidden = true;
    else chiave = await chiediPassword(modello.protezione);
    return chiave;
  }

  async function esci() {
    await TRD.archivio.scrivi(CHIAVE_RICORDATA, null);
    location.reload();
  }

  TRD.accesso = { sblocca, esci };
})(window.TRD = window.TRD || {});
