/* Technical Requirements — fusi orari: dalla città al fuso (paesi UEFA) e conversione in CET/CEST con l'ora legale del giorno partita. */
(function (radice, fabbrica) {
  const m = fabbrica();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else (radice.TRD = radice.TRD || {})[m.NOME] = m;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  const CET = 'Europe/Paris';

  // Paesi UEFA: nome mostrato, fuso IANA, parole che lo riconoscono (paese in varie lingue e città principali).
  const PAESI = [
    ['Albania', 'Europe/Tirane', 'albania shqiperi tirana tirane elbasan'],
    ['Andorra', 'Europe/Andorra', 'andorra'],
    ['Armenia', 'Asia/Yerevan', 'armenia yerevan'],
    ['Austria', 'Europe/Vienna', 'austria osterreich vienna wien graz linz salzburg innsbruck klagenfurt'],
    ['Azerbaijan', 'Asia/Baku', 'azerbaijan baku'],
    ['Belarus', 'Europe/Minsk', 'belarus minsk'],
    ['Belgium', 'Europe/Brussels', 'belgium belgique belgie brussels bruxelles brussel antwerp antwerpen bruges brugge liege genk'],
    ['Bosnia and Herzegovina', 'Europe/Sarajevo', 'bosnia herzegovina bih sarajevo zenica mostar banja_luka'],
    ['Bulgaria', 'Europe/Sofia', 'bulgaria sofia plovdiv razgrad'],
    ['Croatia', 'Europe/Zagreb', 'croatia hrvatska zagreb split rijeka osijek varazdin'],
    ['Cyprus', 'Asia/Nicosia', 'cyprus nicosia limassol larnaca'],
    ['Czechia', 'Europe/Prague', 'czechia czech prague praha ostrava plzen olomouc brno'],
    ['Denmark', 'Europe/Copenhagen', 'denmark danmark copenhagen kobenhavn aarhus odense herning'],
    ['England / Wales / Scotland / N. Ireland', 'Europe/London', 'england wales scotland northern_ireland uk united_kingdom great_britain london wembley cardiff glasgow edinburgh belfast manchester liverpool birmingham newcastle leeds sunderland southampton'],
    ['Estonia', 'Europe/Tallinn', 'estonia eesti tallinn'],
    ['Faroe Islands', 'Atlantic/Faroe', 'faroe faroes torshavn'],
    ['Finland', 'Europe/Helsinki', 'finland suomi helsinki tampere turku'],
    ['France', 'Europe/Paris', 'france paris saint_denis marseille lyon lille bordeaux nice toulouse nantes'],
    ['Georgia', 'Asia/Tbilisi', 'georgia tbilisi batumi'],
    ['Germany', 'Europe/Berlin', 'germany deutschland berlin munich munchen hamburg dortmund cologne koln frankfurt stuttgart dusseldorf leipzig augsburg gelsenkirchen hanover hannover bremen wolfsburg freiburg mainz nuremberg nurnberg sinsheim'],
    ['Gibraltar', 'Europe/Gibraltar', 'gibraltar'],
    ['Greece', 'Europe/Athens', 'greece hellas athens athina piraeus thessaloniki heraklion'],
    ['Hungary', 'Europe/Budapest', 'hungary magyarorszag budapest debrecen szekesfehervar gyor'],
    ['Iceland', 'Atlantic/Reykjavik', 'iceland island reykjavik laugardalsvollur'],
    ['Ireland', 'Europe/Dublin', 'ireland eire dublin aviva cork'],
    ['Israel', 'Asia/Jerusalem', 'israel jerusalem tel_aviv haifa netanya'],
    ['Italy', 'Europe/Rome', 'italy italia rome roma milan milano turin torino naples napoli florence firenze bologna genoa genova bergamo udine verona palermo bari'],
    ['Kazakhstan', 'Asia/Almaty', 'kazakhstan astana almaty'],
    ['Kosovo', 'Europe/Belgrade', 'kosovo pristina prishtina prishtine'],
    ['Latvia', 'Europe/Riga', 'latvia latvija riga'],
    ['Liechtenstein', 'Europe/Vaduz', 'liechtenstein vaduz'],
    ['Lithuania', 'Europe/Vilnius', 'lithuania lietuva vilnius kaunas'],
    ['Luxembourg', 'Europe/Luxembourg', 'luxembourg'],
    ['Malta', 'Europe/Malta', 'malta valletta qali'],
    ['Moldova', 'Europe/Chisinau', 'moldova chisinau'],
    ['Montenegro', 'Europe/Podgorica', 'montenegro crna_gora podgorica niksic'],
    ['Netherlands', 'Europe/Amsterdam', 'netherlands nederland holland amsterdam rotterdam eindhoven utrecht arnhem enschede groningen'],
    ['North Macedonia', 'Europe/Skopje', 'macedonia skopje'],
    ['Norway', 'Europe/Oslo', 'norway norge oslo bergen trondheim stavanger'],
    ['Poland', 'Europe/Warsaw', 'poland polska warsaw warszawa wroclaw krakow gdansk poznan chorzow katowice lodz'],
    ['Portugal', 'Europe/Lisbon', 'portugal lisbon lisboa porto braga guimaraes coimbra faro'],
    ['Romania', 'Europe/Bucharest', 'romania bucharest bucuresti cluj ploiesti'],
    ['Russia', 'Europe/Moscow', 'russia moscow moskva saint_petersburg'],
    ['San Marino', 'Europe/San_Marino', 'san_marino serravalle'],
    ['Serbia', 'Europe/Belgrade', 'serbia srbija belgrade beograd novi_sad leskovac'],
    ['Slovakia', 'Europe/Bratislava', 'slovakia slovensko bratislava trnava zilina kosice'],
    ['Slovenia', 'Europe/Ljubljana', 'slovenia slovenija ljubljana celje maribor'],
    ['Spain', 'Europe/Madrid', 'spain espana madrid barcelona seville sevilla valencia bilbao malaga oviedo gijon coruna cordoba elche alicante vigo valladolid'],
    ['Sweden', 'Europe/Stockholm', 'sweden sverige stockholm solna gothenburg goteborg malmo'],
    ['Switzerland', 'Europe/Zurich', 'switzerland schweiz suisse svizzera zurich geneva geneve basel bern berne lausanne st_gallen lucerne luzern'],
    ['Turkey', 'Europe/Istanbul', 'turkey turkiye istanbul ankara izmir bursa konya trabzon'],
    ['Ukraine', 'Europe/Kiev', 'ukraine kyiv kiev lviv kharkiv odesa'],
  ].map(([nome, fuso, parole]) => ({ nome, fuso, parole: parole.split(' ') }));

  // minuscole senza accenti, solo lettere e spazi
  const normalizza = (s) => ` ${String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[łŁ]/g, 'l').replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/ß/g, 'ss').replace(/[^a-z]+/g, ' ')} `;

  // Si cercano parole intere ("san_marino" = frase di due parole). Vince quella più a destra:
  // di solito il paese viene dopo la città (es. "Debrecen Hungary" → Ungheria).
  function trovaPaese(testo) {
    const t = normalizza(testo);
    if (t.trim() === '') return null;
    let migliore = null;
    for (const p of PAESI) {
      for (const w of p.parole) {
        const pos = t.lastIndexOf(` ${w.replace(/_/g, ' ')} `);
        if (pos >= 0 && (!migliore || pos > migliore.pos)) migliore = { pos, paese: p };
      }
    }
    return migliore ? migliore.paese : null;
  }

  // Scarto in minuti tra il fuso e UTC in un dato istante (ora legale compresa).
  function scarto(fuso, ms) {
    const parti = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
      timeZone: fuso, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
    const comeUtc = Date.UTC(+parti.year, +parti.month - 1, +parti.day, +parti.hour, +parti.minute);
    return Math.round((comeUtc - Math.floor(ms / 60000) * 60000) / 60000);
  }

  // Istante UTC di un orario locale (data ISO + hh:mm) nel fuso indicato.
  function istante(dataIso, hhmm, fuso) {
    const [a, m, g] = dataIso.split('-').map(Number), [h, mi] = hhmm.split(':').map(Number);
    const comeUtc = Date.UTC(a, m - 1, g, h, mi);
    // due passaggi: lo scarto va letto nell'istante giusto, che può stare dall'altra parte del cambio d'ora
    const prova = comeUtc - scarto(fuso, comeUtc) * 60000;
    return comeUtc - scarto(fuso, prova) * 60000;
  }

  const hhmm = (ms, fuso) => new Intl.DateTimeFormat('en-GB', { timeZone: fuso, hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
  const sigla = (ms, fuso) => (new Intl.DateTimeFormat('en-GB', { timeZone: fuso, timeZoneName: 'short' }).formatToParts(new Date(ms))
    .find((p) => p.type === 'timeZoneName') || {}).value || '';

  // Orario locale → orario CET/CEST dello stesso istante. Senza data si usa mezzogiorno di oggi.
  function inCet(dataIso, oraLocale, fuso) {
    if (!oraLocale || !fuso) return '';
    const data = dataIso || new Date().toISOString().slice(0, 10);
    return hhmm(istante(data, oraLocale, fuso), CET);
  }

  // "CET" o "CEST" nel giorno partita.
  function siglaCet(dataIso) {
    if (!dataIso) return 'CET/CEST';
    return sigla(istante(dataIso, '12:00', CET), CET);
  }

  // Descrizione per la pagina: sigla locale e differenza con CET/CEST nel giorno partita.
  function descrivi(dataIso, fuso) {
    if (!fuso) return '';
    const data = dataIso || new Date().toISOString().slice(0, 10);
    const ms = istante(data, '12:00', fuso);
    const diff = (scarto(fuso, ms) - scarto(CET, ms)) / 60;
    const cet = sigla(ms, CET);
    const rel = diff === 0 ? `same time as ${cet}` : `${Math.abs(diff)} h ${diff > 0 ? 'ahead of' : 'behind'} ${cet}`;
    return `${sigla(ms, fuso)} on ${dataIso ? 'match day' : 'today'} · ${rel}`;
  }

  return { NOME: 'fusi', PAESI, trovaPaese, inCet, siglaCet, descrivi };
});
