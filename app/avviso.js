/* Technical Requirements — la pagina è spenta: il Tech Book ora sta nella piattaforma TGI.
   Se il browser conserva ancora il modulo della vecchia pagina (salvataggio automatico locale), si può scaricare
   nel formato di Export data e importarlo nella piattaforma (Import .json nella scheda Tech Book della partita). */
(() => {
  'use strict';

  const STORE = 'air-trd-v1';

  let d = null;
  try { d = JSON.parse(localStorage.getItem(STORE)); } catch { d = null; }
  if (!d || typeof d !== 'object') return;
  // modified c'è solo se qualcuno ha toccato il modulo: un modulo nuovo e mai compilato non serve
  const pieno = s => typeof s === 'string' && s.trim() !== '';
  if (!d.modified && !pieno(d.team_a) && !pieno(d.team_b)) return;

  const slug = s => (s || '').trim().replace(/\s+/g, '_');
  const baseName = `${slug(d.team_a) || 'TeamA'}-${slug(d.team_b) || 'TeamB'}`;

  if (pieno(d.team_a) || pieno(d.team_b)) {
    document.getElementById('partita').textContent = ` (${(d.team_a || '').trim() || 'Team A'} v ${(d.team_b || '').trim() || 'Team B'})`;
  }
  document.getElementById('salvato').hidden = false;
  document.getElementById('scarica').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ app: 'air-trd', version: 1, data: d }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `${baseName}_technical requirements data.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
})();
