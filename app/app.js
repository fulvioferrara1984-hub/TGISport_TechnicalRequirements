/* Technical Requirements — modulo → .docx, tutto nel browser (nessun server). */
(() => {
  'use strict';

  const STORE = 'air-trd-v1';
  const DEFAULTS_STORE = 'air-trd-tgi-defaults';
  const form = document.getElementById('form');

  // Righe dello schedule: chiave, attività, durata, chi la compila. Il kick-off arriva dalla sezione 1.
  const SCHEDULE = [
    ['arrive_stadium', 'TGI crew arrive at stadium', '', 'TGI'],
    ['arrive_roc', 'TGI crew arrive remote ROC', '', 'TGI'],
    ['lines_open', 'Lines open', '', 'TGI'],
    ['calibration', 'Calibration window', '30 min', 'TGI'],
    ['facs', 'TGI FACS check', '15 min', 'TGI'],
    ['uefa_e2e', 'UEFA Sync test & E2E', '', 'UEFA'],
    ['tx_start', 'VBR Transmission start', '', 'TGI'],
    ['ko', 'Kick-off', '', 'KO'],
    ['tx_end', 'VBR Transmission end', '', 'TGI'],
  ];

  // Testo scritto nel .docx quando un campo resta vuoto (lo stesso segnaposto del modello Word)
  const PH = {
    team_a: '[Team A]', team_b: '[Team B]', date: '[Date]', stadium: '[Stadium]', city: '[City Country]',
    ko_local: '[KO time]', broadcaster: '[VBR broadcaster]', services: '[1st row LED replacement]\n[2nd row LED replacement]\n[Static replacement – n carpets / delete if not used]',
    video_format: '[1080i50]', colour_space: '[SDR / HDR]', audio_12: '[e.g. Stereo – international sound]',
    audio_34: '[content]', audio_56: '[content]', audio_78: '[content]', link_type: '[Satellite/Fiber]',
    vobm_name: '[Name]', vobm_phone: '[+xx phone]', led_name: '[Name]', led_phone: '[+xx phone]',
    broadcaster_phone: '[+xx phone]', mcrl_name: '[Name]', mcrl_phone: '[+xx phone]', mcr_phone: '[+xx phone]',
    version: '[date]', time: '[hh:mm]',
    surname: '[Surname]', first_name: '[Name]', role: 'VBRS', id_no: '[ID / Passport no.]', accr_type: '[Accr. type]', phone: '[+xx phone]',
    vehicle: '[Crew car / van]', plate: '[Plate]', dims: '[L x W x H]', driver: '[Driver]', parking: '[Car park / permit]',
  };

  const PARTY_NAMES = { TGI: 'TGI Sport', HB: 'Host Broadcaster', UEFA: 'UEFA', LED: 'LED provider', BC: 'Broadcaster' };

  // ---------- archivio locale (può mancare: finestra privata, dati del sito bloccati) ----------
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  };

  // ---------- tabella dello schedule ----------
  const schedBody = document.getElementById('schedule');
  for (const [key, label, dur, owner] of SCHEDULE) {
    const tr = document.createElement('tr');
    tr.className = 'f';
    tr.dataset.owner = owner === 'KO' ? 'TGI' : owner;
    const local = owner === 'KO'
      ? '<span class="from-ko" data-ko-copy></span>'
      : `<input type="time" name="${key}_local" aria-label="${label} – local time">`;
    tr.innerHTML = `<td>${label}${owner === 'UEFA' ? ' <em class="tag">UEFA</em>' : ''}</td><td>${local}</td><td class="cet" data-cet="${key}"></td><td>${dur}</td>`;
    schedBody.appendChild(tr);
  }

  // ---------- righe ripetibili ----------
  const ROWS = { people: 'tpl-person', vehicles: 'tpl-vehicle' };
  function addRow(kind, values = {}) {
    const node = document.getElementById(ROWS[kind]).content.firstElementChild.cloneNode(true);
    node.querySelectorAll('[data-k]').forEach(el => { if (values[el.dataset.k] != null) el.value = values[el.dataset.k]; });
    node.querySelector('.del').addEventListener('click', () => { node.remove(); changed(); });
    document.getElementById(kind).appendChild(node);
    return node;
  }
  const readRows = kind => [...document.getElementById(kind).children].map(row => {
    const o = {}; row.querySelectorAll('[data-k]').forEach(el => { o[el.dataset.k] = el.value.trim(); }); return o;
  });
  document.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => { addRow(b.dataset.add); changed(); }));

  // ---------- lettura / scrittura del modulo ----------
  function read() {
    const d = {};
    for (const el of form.elements) {
      if (!el.name) continue;
      d[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim();
    }
    d.people = readRows('people');
    d.vehicles = readRows('vehicles');
    d.modified = ultimaModifica;
    return d;
  }
  function write(d) {
    ultimaModifica = d.modified || null;
    // dati salvati con la versione precedente (scarto orario fisso): il fuso si ricava dalla città
    if (!d.tz && d.city) { const p = F.trovaPaese(d.city); if (p) d = { ...d, tz: p.fuso }; }
    for (const el of form.elements) {
      if (!el.name || !(el.name in d)) continue;
      if (el.type === 'checkbox') el.checked = !!d[el.name]; else el.value = d[el.name] ?? '';
    }
    for (const kind of Object.keys(ROWS)) {
      document.getElementById(kind).innerHTML = '';
      (d[kind] || []).forEach(v => addRow(kind, v));
    }
  }

  // ---------- orari (fuso della città, ora legale del giorno partita: vedi fusi.js) ----------
  const F = TRD.fusi;
  const tzSelect = document.getElementById('tz');
  [...F.PAESI].sort((x, y) => x.nome.localeCompare(y.nome)).forEach((p) => tzSelect.add(new Option(p.nome, p.fuso)));
  const toCet = (d, hhmm) => F.inCet(d.date, hhmm, d.tz);
  const cetLabel = (iso) => F.siglaCet(iso);
  const dataBreve = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');
  const longDate = iso => iso ? new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';

  function refreshDerived(d) {
    const nota = document.getElementById('tz-nota');
    nota.textContent = d.tz ? F.descrivi(d.date, d.tz) : (d.city ? 'City not recognised: choose the country' : '');
    nota.classList.toggle('avviso', !d.tz && !!d.city);
    document.getElementById('modificato').textContent = dataBreve(d.modified) || '–';
    document.getElementById('cet-head').textContent = cetLabel(d.date);
    document.querySelectorAll('[data-ko-copy]').forEach(el => { el.textContent = d.ko_local || '—'; });
    document.querySelectorAll('[data-cet]').forEach(el => {
      const k = el.dataset.cet;
      el.textContent = toCet(d, k === 'ko' ? d.ko_local : d[`${k}_local`]) || '—';
    });
  }

  // ---------- campi mancanti per ciascuna parte ----------
  function isFilled(f) {
    const els = f.matches('input,select') ? [f] : [...f.querySelectorAll('input,select')];
    if (!els.length) return true;
    return els.some(el => el.type === 'checkbox' ? el.checked : el.value.trim() !== '');
  }
  function refreshProgress() {
    const party = document.getElementById('party').value;
    const counts = {};
    document.querySelectorAll('.f[data-owner]').forEach(f => {
      const o = f.dataset.owner, ok = isFilled(f);
      f.classList.toggle('missing', !ok);
      f.classList.toggle('dim', party !== 'all' && o !== party);
      (counts[o] ||= [0, 0]); counts[o][1]++; if (ok) counts[o][0]++;
    });
    const box = document.getElementById('progress');
    box.innerHTML = Object.keys(PARTY_NAMES).filter(p => counts[p]).map(p => {
      const [ok, all] = counts[p];
      return `<button type="button" class="chip ${ok === all ? 'done' : ''}" data-p="${p}">${PARTY_NAMES[p]} <b>${ok}/${all}</b></button>`;
    }).join('');
    box.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
      const sel = document.getElementById('party'); sel.value = sel.value === c.dataset.p ? 'all' : c.dataset.p; refreshProgress();
    }));
  }

  // ---------- salvataggio automatico ----------
  let t, ultimaModifica = null;
  // modifica = l'utente ha cambiato qualcosa: aggiorna la data di ultima modifica (piè di pagina del Word)
  function changed(modifica = true) {
    if (modifica) ultimaModifica = new Date().toISOString();
    const d = read();
    refreshDerived(d);
    refreshProgress();
    clearTimeout(t);
    t = setTimeout(() => {
      document.getElementById('saved').textContent = store.set(STORE, d) ? 'Saved in this browser' : 'Not saved (browser storage unavailable) – use Export data';
    }, 300);
  }
  // La città imposta il fuso; il menu resta modificabile a mano. Una scelta a mano non viene
  // cancellata da una città non riconosciuta, un fuso automatico sì (sarebbe quello della città precedente).
  let fusoAutomatico = true;
  tzSelect.addEventListener('change', () => { fusoAutomatico = false; });
  form.elements.city.addEventListener('input', () => {
    const p = F.trovaPaese(form.elements.city.value);
    if (p) { tzSelect.value = p.fuso; fusoAutomatico = true; }
    else if (fusoAutomatico) tzSelect.value = '';
  });
  form.addEventListener('input', () => changed());
  form.addEventListener('change', () => changed());
  document.getElementById('party').addEventListener('change', refreshProgress);

  // ---------- nuovo / import / export ----------
  function blank() {
    const d = { tz: '', people: [{ role: 'VBRS' }], vehicles: [], modified: null };
    Object.assign(d, store.get(DEFAULTS_STORE) || {});
    return d;
  }
  document.getElementById('btn-new').addEventListener('click', () => {
    if (!confirm('Start a new document? Unsaved data in this browser will be cleared (export it first if needed).')) return;
    form.reset(); write(blank()); changed(false);
  });

  const slug = s => (s || '').trim().replace(/\s+/g, '_');
  const baseName = d => `${slug(d.team_a) || 'TeamA'}-${slug(d.team_b) || 'TeamB'}`;
  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  document.getElementById('btn-export').addEventListener('click', () => {
    const d = read();
    const party = document.getElementById('party').value;
    const suffix = party === 'all' ? '' : `_${party}`;
    download(new Blob([JSON.stringify({ app: 'air-trd', version: 1, data: d }, null, 2)], { type: 'application/json' }),
      `${baseName(d)}_technical requirements data${suffix}.json`);
  });

  // L'import unisce: i valori pieni del file sovrascrivono, quelli vuoti lasciano ciò che c'è già.
  document.getElementById('file-import').addEventListener('change', async e => {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      const inc = json.data || json, cur = read(), merged = { ...cur };
      for (const [k, v] of Object.entries(inc)) {
        if (Array.isArray(v)) {
          merged[k] = (cur[k] || []).length && v.length === cur[k].length
            ? cur[k].map((row, i) => { const r = { ...row }; for (const [rk, rv] of Object.entries(v[i])) if (rv) r[rk] = rv; return r; })
            : (v.length ? v : cur[k]);
        } else if (v !== '' && v != null && v !== false) merged[k] = v;
      }
      write(merged); changed();
      document.getElementById('saved').textContent = `Imported ${file.name}`;
    } catch (err) {
      alert('This file could not be read. Please choose a .json file exported from this page.');
    }
  });

  document.getElementById('btn-defaults').addEventListener('click', () => {
    const d = read();
    const ok = store.set(DEFAULTS_STORE, { mcrl_name: d.mcrl_name, mcrl_phone: d.mcrl_phone, mcr_phone: d.mcr_phone });
    document.getElementById('saved').textContent = ok ? 'TGI contacts remembered for new documents' : 'Browser storage unavailable';
  });

  // ---------- .docx ----------
  function services(d) {
    const s = [];
    if (d.svc_led1) s.push('1st row LED replacement');
    if (d.svc_led2) s.push('2nd row LED replacement');
    if (d.svc_carpets) s.push(`Static replacement – ${d.svc_carpets_n || 'n'} carpets`);
    if (d.svc_other) s.push(d.svc_other);
    return s.join('\n');
  }
  function docData(d) {
    const v = (k, ph = PH[k]) => (d[k] && String(d[k]).trim()) || ph;
    const out = {
      team_a: v('team_a'), team_b: v('team_b'),
      team_a_up: d.team_a ? d.team_a.toUpperCase() : '[TEAM A]', team_b_up: d.team_b ? d.team_b.toUpperCase() : '[TEAM B]',
      date: longDate(d.date) || PH.date, stadium: v('stadium'), city: v('city'),
      ko_local: v('ko_local'), ko_tz: cetLabel(d.date), ko_cet: toCet(d, d.ko_local) || PH.time,
      services: services(d) || PH.services, broadcaster: v('broadcaster'),
      video_format: v('video_format'), colour_space: v('colour_space'),
      audio_12: v('audio_12'), audio_34: v('audio_34'), audio_56: v('audio_56'), audio_78: v('audio_78'),
      link_type: v('link_type'),
      vobm_name: v('vobm_name'), vobm_phone: v('vobm_phone'), led_name: v('led_name'), led_phone: v('led_phone'),
      broadcaster_phone: v('broadcaster_phone'), mcrl_name: v('mcrl_name'), mcrl_phone: v('mcrl_phone'), mcr_phone: v('mcr_phone'),
      version: dataBreve(d.modified || new Date().toISOString()),
    };
    for (const [key] of SCHEDULE) {
      if (key === 'ko') continue;
      out[`${key}_local`] = d[`${key}_local`] || PH.time;
      out[`${key}_cet`] = toCet(d, d[`${key}_local`]) || PH.time;
    }
    const fill = (rows, keys) => {
      const list = rows.filter(r => keys.some(k => r[k]));
      return (list.length ? list : [{}]).map(r => Object.fromEntries(keys.map(k => [k, (r[k] && r[k].trim()) || PH[k]])));
    };
    out.people = fill(d.people, ['surname', 'first_name', 'role', 'id_no', 'accr_type', 'phone']);
    out.vehicles = fill(d.vehicles, ['vehicle', 'plate', 'dims', 'driver', 'parking']);
    return out;
  }
  document.getElementById('btn-docx').addEventListener('click', async () => {
    const btn = document.getElementById('btn-docx');
    btn.disabled = true; btn.textContent = 'Generating…';
    try {
      const zip = new PizZip(modelloWord);
      const doc = new window.docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
      const d = read();
      doc.render(docData(d));
      const blob = doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      download(blob, `${baseName(d)}_technical requirements document.docx`);
    } catch (err) {
      console.error(err);
      alert('The document could not be generated: ' + err.message);
    } finally {
      btn.disabled = false; btn.textContent = 'Generate .docx';
    }
  });

  // ---------- avvio: prima l'accesso, poi si decifra il modello Word ----------
  let modelloWord = null;
  TRD.modulo = { read, write, docData };
  document.getElementById('btn-esci').addEventListener('click', () => TRD.accesso.esci());

  TRD.accesso.sblocca().then(async (chiave) => {
    modelloWord = (await TRD.cifratura.decifraBytes(chiave, self.TRD_MODELLO.dati)).buffer;
    document.body.classList.remove('bloccato');
    document.getElementById('btn-esci').hidden = false;
    write(store.get(STORE) || blank());
    changed(false);
  });
})();
