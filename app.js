/* Tu Mañana · app */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  window.TM = window.TM || {};
  const DEFAULT_PLACE = { lat: 8.7848, lon: -75.7917, name: 'Cereté, Córdoba' };
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };

  // ---------- utilidades de texto ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // **negrita** y *cursiva* (después de escapar)
  const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<em>$1</em>');
  const safeUrl = (u) => (/^https:\/\//i.test(u || '') ? esc(u) : '#');
  const toast = window.TM_toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 2600); };

  // ---------- carga de la edición ----------
  const params = new URLSearchParams(location.search);
  const wanted = params.get('d'); // ?d=2026-11-13 para ediciones anteriores

  async function getJSON(url) {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }

  async function loadEdition() {
    const url = wanted && /^\d{4}-\d{2}-\d{2}$/.test(wanted) ? `data/ediciones/${wanted}.json` : 'data/hoy.json';
    try {
      const ed = await getJSON(url);
      if (!wanted) store.set('ultima', ed);
      return ed;
    } catch (e) {
      const cached = store.get('ultima');
      if (cached) { $('#offline').hidden = false; return cached; }
      throw e;
    }
  }

  // ---------- render ----------
  function render(ed) {
    $('#edNum').textContent = `Edición Nº ${ed.edicion}`;
    $('#fecha').textContent = ed.fecha_texto || '';
    const hr = new Date().getHours();
    const greet = hr >= 5 && hr < 12 ? 'Buenos <em>días.</em>' : hr >= 12 && hr < 19 ? 'Buenas <em>tardes.</em>' : 'Buenas <em>noches.</em>';
    $('#saludo').innerHTML = !ed.saludo || /^Buenos <em>días\.<\/em>$/.test(ed.saludo) ? greet : ed.saludo.replace(/<(?!\/?(em|br)\b)[^>]*>/gi, '');
    $('#titular').innerHTML = md(ed.titular);
    document.title = `Tu Mañana · ${ed.fecha_texto || ''}`;

    // Indicadores
    $('#ticker').innerHTML = (ed.indicadores || []).map((k, i) => `
      <div class="card tick" ${k.id ? `id="ind-${esc(k.id)}"` : ''}>
        <div class="label"><span class="dot" style="background:${esc(k.color || '#8b5cf6')}"></span>${esc(k.label)}</div>
        <div class="v" ${k.countdown ? `data-cd="${esc(k.countdown)}" data-cd-mode="short"` : ''}>${esc(k.valor || '')}</div>
        <div class="s">${esc(k.detalle || '')}</div>
      </div>`).join('');

    // Madrid
    const m = ed.madrid;
    if (m) {
      const rmLocal = m.madrid_es === 'local';
      $('#madrid').innerHTML = `
        <div class="label">⚪ ${esc(m.etiqueta)}</div>
        <div class="score">
          <div class="team">${esc(m.competicion)}<b>${esc(m.local)}</b></div>
          <div class="big"><span class="${rmLocal ? 'w' : ''}">${esc(m.goles_local)}</span><span style="color:var(--dim)"> – </span><span class="${rmLocal ? '' : 'w'}">${esc(m.goles_visitante)}</span></div>
          <div class="team">${esc(m.lugar || '')}<b>${esc(m.visitante)}</b></div>
        </div>
        <p>${md(m.resumen)}</p>
        <div class="chips">${(m.chips || []).map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div>
        ${m.proximo ? `<div class="next"><div class="cd" data-cd="${esc(m.proximo.fecha)}" data-cd-mode="days">–</div><small><b>días para volver.</b> ${esc(m.proximo.texto)}</small></div>` : ''}`;
    } else $('#madrid').hidden = true;

    // Noticias
    $('#noticias').innerHTML = (ed.noticias || []).map((n, i) => `
      <article class="card news" style="--accent:${esc(n.color)}">
        <div class="label"><span class="dot" style="background:${esc(n.color)}"></span>${esc(n.tema)}</div>
        <h3>${esc(n.titulo)}</h3>
        <p>${md(n.texto)}</p>
        ${n.countdown ? `<div class="cdown" data-cd="${esc(n.countdown)}" data-cd-mode="full"><div><b>0</b><small>días</small></div><div><b>00</b><small>horas</small></div><div><b>00</b><small>min</small></div><div><b>00</b><small>seg</small></div></div>` : ''}
        ${n.url ? `<a class="src" href="${safeUrl(n.url)}" target="_blank" rel="noopener">${esc(n.fuente || 'Fuente')} ↗</a>` : ''}<button class="sharecard" data-card="${i}">📸 Tarjeta</button>
      </article>`).join('');
    document.querySelectorAll('[data-card]').forEach((b) => b.addEventListener('click', () => makeCard(ed, ed.noticias[+b.dataset.card])));

    // Para pensar
    const d = ed.dato, c = ed.concepto;
    $('#pensar').innerHTML = `
      ${d ? `<article class="card feature wide">
        <div class="label"><span class="dot" style="background:var(--amber)"></span>Dato curioso del día</div>
        <p class="quote">${md(d.frase)}</p>
        <p class="body">${md(d.texto)}</p>
        ${d.url ? `<a class="src" href="${safeUrl(d.url)}" target="_blank" rel="noopener">${esc(d.fuente || 'Fuente')} ↗</a>` : ''}
      </article>` : ''}
      ${c ? `<article class="card feature wide">
        <div class="label"><span class="dot" style="background:var(--lime)"></span>Concepto de ingeniería del día · ${esc(c.nombre)}</div>
        <div class="formula">${esc(c.formula)}</div>
        <div class="legend">${(c.variables || []).map((v) => `<div><b>${esc(v.simbolo)}</b>${esc(v.significado)}</div>`).join('')}</div>
        <p class="body">${md(c.ejemplo)}</p>
      </article>` : ''}`;

    // Recomendación
    const r = ed.recomendacion;
    if (r) $('#reco').innerHTML = `
      <div class="reco">
        <div class="book"><span>${esc(r.portada)}</span><small>${esc(r.autor || '')}</small></div>
        <div>
          <div class="label"><span class="dot" style="background:var(--pink)"></span>${esc(r.tipo)}</div>
          <h3>${esc(r.titulo)}</h3>
          <p>${md(r.texto)}</p>
        </div>
      </div>`;

    renderQuiz(ed);
    window.TM.ed = ed;
    document.dispatchEvent(new CustomEvent('tm:edition', { detail: ed }));
    reveal();
    tickCountdowns();
  }

  // ---------- animaciones de entrada ----------
  function reveal() {
    const cards = document.querySelectorAll('.card:not(.in)');
    if (!('IntersectionObserver' in window)) { cards.forEach((c) => c.classList.add('in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.06 });
    cards.forEach((c, i) => { c.style.transitionDelay = `${Math.min(i, 6) * 60}ms`; io.observe(c); });
  }

  // ---------- cuentas regresivas ----------
  const pad = (n) => String(n).padStart(2, '0');
  function tickCountdowns() {
    const now = Date.now();
    document.querySelectorAll('[data-cd]').forEach((el) => {
      const t = Date.parse(el.dataset.cd);
      if (isNaN(t)) return;
      const d = Math.max(0, t - now);
      const D = Math.floor(d / 864e5), H = Math.floor(d / 36e5) % 24, M = Math.floor(d / 6e4) % 60, S = Math.floor(d / 1e3) % 60;
      const mode = el.dataset.cdMode;
      if (mode === 'full') {
        const b = el.querySelectorAll('b');
        [D, pad(H), pad(M), pad(S)].forEach((v, i) => b[i] && (b[i].textContent = v));
      } else if (mode === 'days') {
        el.textContent = Math.ceil(d / 864e5);
      } else {
        el.textContent = d <= 0 ? '¡Hoy!' : D > 0 ? `${D} ${D === 1 ? 'día' : 'días'}` : `${H} h ${pad(M)} min`;
      }
    });
  }
  setInterval(tickCountdowns, 1000);

  // ---------- clima en vivo (Open-Meteo, sin llave) ----------
  const WMO = (c) => {
    if (c === 0) return ['Despejado', 'sun'];
    if (c <= 2) return ['Parcialmente nublado', 'partly'];
    if (c === 3) return ['Nublado', 'cloud'];
    if (c <= 48) return ['Niebla', 'cloud'];
    if (c <= 67 || (c >= 80 && c <= 82)) return ['Lluvia', 'rain'];
    if (c <= 77 || c === 85 || c === 86) return ['Nieve', 'cloud'];
    return ['Tormenta', 'storm'];
  };
  function weatherSVG(kind, rainy) {
    const sun = `<g style="transform-origin:120px 62px;animation:spin 26s linear infinite"><circle cx="120" cy="62" r="34" fill="url(#sun)"/><g stroke="#fbbf24" stroke-width="4" stroke-linecap="round" opacity=".8"><line x1="120" y1="8" x2="120" y2="18"/><line x1="120" y1="106" x2="120" y2="116"/><line x1="66" y1="62" x2="76" y2="62"/><line x1="164" y1="62" x2="174" y2="62"/><line x1="82" y1="24" x2="89" y2="31"/><line x1="151" y1="93" x2="158" y2="100"/><line x1="158" y1="24" x2="151" y2="31"/><line x1="89" y1="93" x2="82" y2="100"/></g></g>`;
    const cloud = `<g style="animation:drift 6s ease-in-out infinite"><path d="M40 120 a26 26 0 0 1 22-38 a34 34 0 0 1 64 8 a22 22 0 0 1 4 44 h-86 a18 18 0 0 1 -4 -14z" fill="url(#cl)"/></g>`;
    const rain = `<g stroke="#67e8f9" stroke-width="4" stroke-linecap="round"><line x1="66" y1="146" x2="60" y2="160" style="animation:rain 1.2s linear infinite"/><line x1="92" y1="146" x2="86" y2="160" style="animation:rain 1.2s linear infinite .4s"/><line x1="118" y1="146" x2="112" y2="160" style="animation:rain 1.2s linear infinite .8s"/></g>`;
    const bolt = `<path d="M96 132 l-12 22 h12 l-6 16 l20 -26 h-12 l8 -12z" fill="#fde047" style="animation:pulse 1.6s infinite"/>`;
    let body = '';
    if (kind === 'sun') body = sun;
    else if (kind === 'partly') body = sun + cloud + (rainy ? rain : '');
    else if (kind === 'cloud') body = cloud + (rainy ? rain : '');
    else if (kind === 'rain') body = (rainy !== false ? sun : '') + cloud + rain;
    else body = cloud + bolt + rain;
    return `<svg viewBox="0 0 200 170" aria-hidden="true"><defs><radialGradient id="sun"><stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#f59e0b"/></radialGradient><linearGradient id="cl" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f5f3ff"/><stop offset="1" stop-color="#a5b4fc"/></linearGradient></defs>${body}<style>@keyframes spin{to{transform:rotate(360deg)}}@keyframes drift{50%{transform:translateX(8px)}}@keyframes rain{0%{opacity:0;transform:translateY(-6px)}40%{opacity:1}100%{opacity:0;transform:translateY(10px)}}</style></svg>`;
  }
  const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  async function loadWeather(place) {
    $('#wPlace').textContent = `El clima en ${place.name}`;
    try {
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}&current=temperature_2m,apparent_temperature,weather_code,precipitation,is_day&minutely_15=precipitation&hourly=temperature_2m,apparent_temperature,uv_index,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,uv_index_max,sunrise,sunset&timezone=auto&forecast_days=4`;
      const w = await getJSON(u);
      const dd = w.daily;
      const max = Math.round(dd.temperature_2m_max[0]), min = Math.round(dd.temperature_2m_min[0]), p = dd.precipitation_probability_max[0] ?? 0;
      const [desc, kind] = WMO(dd.weather_code[0]);
      const now = Math.round(w.current.temperature_2m);
      $('#wTemp').innerHTML = `${now}<sup>°C</sup>`;
      let tip = p >= 60 ? 'Lleva sombrilla ☂️' : p >= 30 ? 'Puede caer un aguacero, por si acaso.' : max >= 32 ? 'Mucho calor: hidrátate 💧' : 'Buen día para salir.';
      $('#wDesc').innerHTML = `Ahora · ${esc(desc)}. Máxima <b>${max}°</b> · mínima <b>${min}°</b> · <b>${p} % de lluvia</b>. ${tip}`;
      $('#wIcon').innerHTML = weatherSVG(kind, p >= 40);
      const heat = renderHeat(w);
      window.TM.wx = { w, place, now, max, min, rain: p, desc, kind, heat };
      document.dispatchEvent(new CustomEvent('tm:weather', { detail: window.TM.wx }));
      $('#wForecast').innerHTML = [1, 2, 3].map((i) => {
        const dt = new Date(dd.time[i] + 'T12:00:00');
        const pp = dd.precipitation_probability_max[i] ?? 0;
        return `<div class="fday"><small>${DAYS[dt.getDay()]}</small><strong>${Math.round(dd.temperature_2m_max[i])}° / ${Math.round(dd.temperature_2m_min[i])}°</strong><span>${pp} % lluvia</span><div class="bar"><i style="width:${pp}%"></i></div></div>`;
      }).join('');
    } catch {
      $('#wDesc').textContent = 'No se pudo cargar el clima ahora. Revisa tu conexión.';
      $('#wIcon').innerHTML = weatherSVG('partly', false);
    }
  }


  // ---------- calor por horas: pico, sensación térmica y UV ----------
  const hora = (iso) => { const h = +iso.slice(11, 13); const ap = h < 12 ? 'a.\u00a0m.' : 'p.\u00a0m.'; const h12 = h % 12 || 12; return `${h12}:00\u00a0${ap}`; };
  const horaCorta = (iso) => { const h = +iso.slice(11, 13); return (h % 12 || 12) + (h < 12 ? 'a' : 'p'); };
  function renderHeat(w) {
    const box = $('#heat');
    const H = w.hourly; if (!H || !H.time) { box.hidden = true; return; }
    const today = w.daily.time[0];
    const idx = H.time.map((t, i) => [t, i]).filter(([t]) => t.startsWith(today)).map(([, i]) => i);
    if (!idx.length) { box.hidden = true; return; }
    let iMax = idx[0], iFeel = idx[0];
    idx.forEach((i) => { if (H.temperature_2m[i] > H.temperature_2m[iMax]) iMax = i; if (H.apparent_temperature[i] > H.apparent_temperature[iFeel]) iFeel = i; });
    const tMax = Math.round(H.temperature_2m[iMax]), feel = Math.round(H.apparent_temperature[iFeel]);
    const uv = Math.round(w.daily.uv_index_max?.[0] ?? 0);
    // horas "de alerta": sensación térmica >= 35
    const hot = idx.filter((i) => H.apparent_temperature[i] >= 35);
    const hotTxt = hot.length ? `Evita el sol de <b>${hora(H.time[hot[0]])}</b> a <b>${hora(H.time[hot[hot.length - 1]]).replace(':00', ':59')}</b>.` : 'Hoy no se esperan horas de calor extremo.';
    // mejor hora fresca para salir (6 a. m.–9 p. m., la de menor sensación térmica)
    const day = idx.filter((i) => { const h = +H.time[i].slice(11, 13); return h >= 6 && h <= 21; });
    let iCool = day[0]; day.forEach((i) => { if (H.apparent_temperature[i] < H.apparent_temperature[iCool]) iCool = i; });
    const uvTxt = uv >= 11 ? 'extremo 🟣' : uv >= 8 ? 'muy alto 🔴' : uv >= 6 ? 'alto 🟠' : uv >= 3 ? 'moderado 🟡' : 'bajo 🟢';
    const nivel = feel >= 41 ? ['🥵', 'Peligro por calor'] : feel >= 35 ? ['🔥', 'Calor intenso'] : feel >= 30 ? ['☀️', 'Día caluroso'] : ['😌', 'Temperatura agradable'];

    // gráfica 5 a. m. – 10 p. m.
    const pts = idx.filter((i) => { const h = +H.time[i].slice(11, 13); return h >= 5 && h <= 22; });
    const vals = pts.map((i) => H.apparent_temperature[i]), tv = pts.map((i) => H.temperature_2m[i]);
    const lo = Math.floor(Math.min(...tv, ...vals) - 1), hi = Math.ceil(Math.max(...tv, ...vals) + 1);
    const Wd = 600, Ht = 150, px = (k) => 14 + (k * (Wd - 28)) / (pts.length - 1), py = (v) => 12 + (Ht - 40) * (1 - (v - lo) / (hi - lo || 1));
    const path = (arr) => arr.map((v, k) => `${k ? 'L' : 'M'}${px(k).toFixed(1)},${py(v).toFixed(1)}`).join(' ');
    const kMax = pts.indexOf(iMax), kNow = (() => { const nowH = new Date().getHours(); return pts.findIndex((i) => +H.time[i].slice(11, 13) === nowH); })();
    const labels = pts.map((i, k) => (k % 3 === 0 ? `<text x="${px(k)}" y="${Ht - 4}" text-anchor="middle">${horaCorta(H.time[i])}</text>` : '')).join('');
    const svg = `<svg viewBox="0 0 ${Wd} ${Ht}" class="heatchart" aria-label="Temperatura por horas">
      <defs><linearGradient id="hg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f97316" stop-opacity=".45"/><stop offset="1" stop-color="#f97316" stop-opacity="0"/></linearGradient>
      <linearGradient id="hl" x1="0" x2="1"><stop offset="0" stop-color="#fbbf24"/><stop offset=".6" stop-color="#f97316"/><stop offset="1" stop-color="#f472b6"/></linearGradient></defs>
      <path d="${path(vals)} L${px(vals.length - 1)},${Ht - 22} L${px(0)},${Ht - 22} Z" fill="url(#hg)"/>
      <path d="${path(vals)}" fill="none" stroke="url(#hl)" stroke-width="3.5" stroke-linecap="round"/>
      <path d="${path(tv)}" fill="none" stroke="rgba(244,242,255,.5)" stroke-width="2" stroke-dasharray="4 5"/>
      ${kNow >= 0 ? `<line x1="${px(kNow)}" x2="${px(kNow)}" y1="8" y2="${Ht - 22}" stroke="rgba(163,230,53,.6)" stroke-dasharray="3 4"/><text x="${px(kNow)}" y="10" text-anchor="middle" class="now">ahora</text>` : ''}
      ${kMax >= 0 ? `<circle cx="${px(kMax)}" cy="${py(tv[kMax])}" r="6" fill="#f4f2ff"/><text x="${px(kMax)}" y="${py(tv[kMax]) - 12}" text-anchor="middle" class="pk">${tMax}°</text>` : ''}
      <g class="hx">${labels}</g></svg>`;

    box.innerHTML = `
      <div class="heat-head"><span class="heat-emoji">${nivel[0]}</span><div><div class="label" style="color:#fdba74">${nivel[1]} hoy</div>
        <p class="heat-main">La máxima será de <b>${tMax}°C</b> a las <b>${hora(H.time[iMax])}</b></p></div></div>
      <div class="heat-stats">
        <div><small>Sensación térmica</small><b>${feel}°</b><span>a las ${hora(H.time[iFeel])}</span></div>
        <div><small>Índice UV</small><b>${uv}</b><span>${uvTxt}</span></div>
        <div><small>Más fresco</small><b class="sm">${hora(H.time[iCool]).replace(':00\u00a0', '\u00a0')}</b><span>${Math.round(H.apparent_temperature[iCool])}° de sensación</span></div>
      </div>
      ${svg}
      <div class="heat-legend"><span><i style="background:linear-gradient(90deg,#fbbf24,#f472b6)"></i>Sensación térmica</span><span><i class="dash"></i>Temperatura</span></div>
      <p class="heat-tip">${hotTxt} ${uv >= 8 ? 'Usa bloqueador y gorra. ' : ''}${feel >= 35 ? 'Toma agua seguido 💧' : ''}</p>`;
    box.hidden = false;
    return { tMax, horaMax: hora(H.time[iMax]), feel, horaFeel: hora(H.time[iFeel]), uv, uvTxt, cool: hora(H.time[iCool]), hotTxt: hotTxt.replace(/<[^>]+>/g, '') };
  }

  async function placeName(lat, lon) {
    try {
      const r = await getJSON(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=es`);
      return [r.city || r.locality, r.principalSubdivision].filter(Boolean).join(', ') || 'tu ubicación';
    } catch { return 'tu ubicación'; }
  }

  $('#btnLocate').addEventListener('click', () => {
    if (!navigator.geolocation) return toast('Tu navegador no permite ubicación');
    $('#wDesc').textContent = 'Buscando tu ubicación…';
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = +pos.coords.latitude.toFixed(3), lon = +pos.coords.longitude.toFixed(3);
      const place = { lat, lon, name: await placeName(lat, lon) };
      store.set('lugar', place);
      loadWeather(place);
      toast(`📍 Clima de ${place.name}`);
    }, () => { toast('No diste permiso de ubicación'); loadWeather(store.get('lugar') || DEFAULT_PLACE); }, { timeout: 10000, maximumAge: 36e5 });
  });

  // ---------- dólar TRM en vivo (datos abiertos de Colombia) ----------
  async function liveTRM() {
    const box = document.getElementById('ind-trm');
    if (!box) return;
    try {
      const rows = await getJSON('https://www.datos.gov.co/resource/32sa-8pi3.json?$order=vigenciadesde%20DESC&$limit=2');
      if (!rows.length) return;
      const v = parseFloat(rows[0].valor), prev = rows[1] ? parseFloat(rows[1].valor) : null;
      const fmt = (n) => '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      box.querySelector('.v').textContent = fmt(v);
      let det = '';
      if (prev) { const ch = ((v - prev) / prev) * 100; det = `${ch >= 0 ? '▲' : '▼'} ${Math.abs(ch).toFixed(2).replace('.', ',')} % vs. anterior`; }
      const f = new Date(rows[0].vigenciadesde);
      det += ` · vigente ${f.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`;
      box.querySelector('.s').textContent = det;
      const lab = box.querySelector('.label');
      if (!lab.querySelector('.livetag')) lab.insertAdjacentHTML('beforeend', '<span class="livetag">EN VIVO</span>');
    } catch { /* se queda el valor de la edición */ }
  }

  // ---------- archivo de ediciones ----------
  async function openArchive() {
    $('#sheetArchive').hidden = false;
    const list = $('#archiveList');
    list.textContent = 'Cargando…';
    try {
      const idx = await getJSON('data/ediciones.json');
      const cur = wanted || idx[0]?.fecha;
      list.innerHTML = idx.map((e, i) => `<a href="${i === 0 ? './' : `?d=${esc(e.fecha)}`}" class="${e.fecha === cur ? 'cur' : ''}"><b>Nº ${esc(e.edicion)} · ${esc(e.fecha_texto)}</b><span>${i === 0 ? 'Hoy' : '→'}</span></a>`).join('');
    } catch { list.textContent = 'No se pudo cargar el archivo.'; }
  }
  $('#btnArchive').addEventListener('click', openArchive);
  document.querySelectorAll('.sheet').forEach((s) => s.addEventListener('click', (e) => { if (e.target === s || e.target.closest('[data-close]')) s.hidden = true; }));

  // ---------- compartir ----------
  $('#btnShare').addEventListener('click', async () => {
    const url = location.origin + location.pathname;
    const data = { title: 'Tu Mañana', text: '☀️ Mira mi resumen diario: clima, fútbol, tecnología, economía y más. Se renueva cada mañana.', url };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(url); toast('🔗 Enlace copiado'); }
    } catch { /* cancelado */ }
  });

  // ---------- instalar como app ----------
  let deferred = null;
  const isStandalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const dismissed = store.get('installDismissed');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferred = e;
    if (!isStandalone && !dismissed) $('#installBanner').hidden = false;
  });
  if (isIOS && !isStandalone && !dismissed) $('#installBanner').hidden = false;
  $('#btnInstall').addEventListener('click', async () => {
    if (deferred) { deferred.prompt(); const r = await deferred.userChoice; if (r.outcome === 'accepted') $('#installBanner').hidden = true; deferred = null; }
    else if (isIOS) $('#sheetIOS').hidden = false;
    else toast('Abre el menú ⋮ del navegador → "Instalar app"');
  });
  $('#btnInstallClose').addEventListener('click', () => { $('#installBanner').hidden = true; store.set('installDismissed', true); });
  window.addEventListener('appinstalled', () => { $('#installBanner').hidden = true; toast('🎉 ¡Tu Mañana instalada!'); });

  // ---------- service worker (offline + actualizaciones) ----------
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }


  // ---------- RACHA DIARIA ----------
  const dayKey = (d = new Date()) => d.toLocaleDateString('en-CA'); // AAAA-MM-DD local
  const MEDALS = [
    { n: 3, icon: '🌱', name: 'Constante' },
    { n: 7, icon: '🥉', name: 'Una semana' },
    { n: 15, icon: '🥈', name: 'Quincena' },
    { n: 30, icon: '🥇', name: 'Un mes' },
    { n: 100, icon: '💎', name: '100 días' },
    { n: 365, icon: '👑', name: 'Un año' }
  ];
  function updateStreak() {
    const today = dayKey();
    const y = new Date(); y.setDate(y.getDate() - 1);
    const st = store.get('racha') || { last: null, count: 0, best: 0 };
    if (st.last !== today) {
      st.count = st.last === dayKey(y) ? st.count + 1 : 1;
      st.last = today;
      st.best = Math.max(st.best || 0, st.count);
      store.set('racha', st);
      const m = MEDALS.find((x) => x.n === st.count);
      if (m) setTimeout(() => toast(`${m.icon} ¡Nueva medalla: ${m.name}! ${st.count} días seguidos`), 1200);
      else if (st.count > 1) setTimeout(() => toast(`🔥 ¡${st.count} días seguidos!`), 1200);
    }
    $('#streakNum').textContent = st.count;
    return st;
  }
  const streak = updateStreak();
  $('#btnStreak').addEventListener('click', () => {
    const st = store.get('racha') || streak;
    $('#streakBig').textContent = st.count;
    $('#streakBest').textContent = `Tu mejor racha: ${st.best} ${st.best === 1 ? 'día' : 'días'}`;
    $('#medals').innerHTML = MEDALS.map((m) => `<div class="medal ${st.best >= m.n ? 'on' : ''}"><i>${m.icon}</i><b>${m.name}</b><br>${m.n} días</div>`).join('');
    $('#sheetStreak').hidden = false;
  });

  // ---------- QUIZ DEL DÍA ----------
  function renderQuiz(ed) {
    const qs = ed.quiz || [];
    const box = $('#quiz');
    if (!qs.length) { box.hidden = true; $('#quizTitle').hidden = true; return; }
    box.hidden = false; $('#quizTitle').hidden = false;
    const key = 'quiz-' + ed.fecha;
    const st = store.get(key) || { answers: [] };
    const progress = (cur) => `<div class="progress">${qs.map((q, i) => `<i class="${i < st.answers.length ? (st.answers[i] === q.correcta ? 'ok' : 'ko') : i === cur ? 'cur' : ''}"></i>`).join('')}</div>`;

    function intro() {
      box.innerHTML = `<div class="label"><span class="dot" style="background:var(--violet)"></span>Quiz Nº ${esc(ed.edicion)} · ${qs.length} preguntas</div>
        <p class="q">¿Leíste bien las noticias de hoy? Responde ${qs.length} preguntas y compara tu puntaje con tus amigos.</p>
        <button class="cta" id="qStart">Empezar el quiz →</button>`;
      $('#qStart').onclick = () => question(st.answers.length);
    }
    function question(i) {
      if (i >= qs.length) return result();
      const q = qs[i];
      box.innerHTML = `<div class="label"><span class="dot" style="background:var(--violet)"></span>Pregunta ${i + 1} de ${qs.length}</div>
        ${progress(i)}
        <p class="q">${esc(q.pregunta)}</p>
        <div class="opts">${q.opciones.map((o, k) => `<button class="opt" data-k="${k}">${esc(o)}</button>`).join('')}</div>
        <div id="qAfter"></div>`;
      box.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => {
        const k = +b.dataset.k;
        st.answers[i] = k; store.set(key, st);
        box.querySelectorAll('.opt').forEach((x) => { x.disabled = true; const kk = +x.dataset.k; if (kk === q.correcta) x.classList.add('ok'); else if (kk === k) x.classList.add('ko'); });
        const ok = k === q.correcta;
        if (navigator.vibrate) try { navigator.vibrate(ok ? 30 : [40, 60, 40]); } catch {}
        $('#qAfter').innerHTML = `<p class="explain"><b>${ok ? '✅ ¡Correcto!' : '❌ Casi.'}</b> ${esc(q.explicacion || '')}</p>
          <button class="cta next-btn">${i + 1 < qs.length ? 'Siguiente →' : 'Ver mi resultado 🏁'}</button>`;
        box.querySelector('.next-btn').onclick = () => question(i + 1);
        box.querySelector('.progress').outerHTML = progress(i);
      }));
    }
    function result() {
      const score = qs.reduce((a, q, i) => a + (st.answers[i] === q.correcta ? 1 : 0), 0);
      const grid = qs.map((q, i) => (st.answers[i] === q.correcta ? '🟩' : '🟥')).join('');
      const msg = score === qs.length ? '¡Perfecto! Eres la persona mejor informada del grupo 🏆' : score >= qs.length - 1 ? '¡Muy bien! Casi perfecto 👏' : score >= qs.length / 2 ? 'Nada mal. Mañana vas por el 5/5 💪' : 'Hoy no fue tu día. Lee las noticias y mañana te desquitas 😅';
      const st2 = store.get('racha') || streak;
      const url = location.origin + location.pathname;
      const text = `☀️ Tu Mañana #${ed.edicion} · ${score}/${qs.length}\n${grid}\n🔥 Racha: ${st2.count} ${st2.count === 1 ? 'día' : 'días'}\n¿Me ganas? 👉 ${url}`;
      box.innerHTML = `<div class="result">
        <div class="label" style="justify-content:center"><span class="dot" style="background:var(--violet)"></span>Tu resultado de hoy</div>
        <div class="score">${score}<span style="color:var(--dim)">/${qs.length}</span></div>
        <div class="grid5">${grid}</div>
        <p>${msg}</p>
        <div class="row"><button class="cta" id="qShare">Compartir resultado</button><button class="pill btn" id="qWa">WhatsApp</button></div>
        <p class="muted">Mañana hay quiz nuevo a las 7:00 a. m.</p></div>`;
      $('#qShare').onclick = async () => {
        try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast('📋 Resultado copiado: pégalo donde quieras'); } } catch {}
      };
      $('#qWa').onclick = () => { location.href = 'https://wa.me/?text=' + encodeURIComponent(text); };
    }
    if (st.answers.length >= qs.length) result(); else intro();
  }

  // ---------- TARJETAS PARA COMPARTIR ----------
  function wrap(ctx, text, maxW) {
    const words = text.split(/\s+/); const lines = []; let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line); return lines;
  }
  async function makeCard(ed, n) {
    if (!n) return;
    toast('🎨 Creando tu tarjeta…');
    try { await Promise.all([document.fonts.load('80px "Instrument Serif"'), document.fonts.load('600 40px "Space Grotesk"'), document.fonts.load('40px "Space Grotesk"')]); } catch {}
    const W = 1080, H = 1350, P = 90;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    c.fillStyle = '#07080f'; c.fillRect(0, 0, W, H);
    const blob = (x, y, r, col) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(7,8,15,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H); };
    blob(120, 80, 700, 'rgba(109,40,217,.75)'); blob(1050, 620, 620, 'rgba(8,145,178,.6)'); blob(380, 1380, 600, 'rgba(219,39,119,.45)');
    // marco de vidrio
    c.fillStyle = 'rgba(255,255,255,.06)'; c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 2;
    const rr = (x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
    rr(50, 200, W - 100, H - 380, 48); c.fill(); c.stroke();
    c.fillStyle = n.color || '#8b5cf6'; c.fillRect(50 + 48, 200, W - 100 - 96, 5);
    // cabecera
    c.fillStyle = '#f4f2ff'; c.font = '600 34px "Space Grotesk", sans-serif'; c.fillText('☀️  TU MAÑANA', P, 120);
    c.fillStyle = '#22d3ee'; c.font = '500 26px "Space Grotesk", sans-serif'; c.textAlign = 'right'; c.fillText((ed.fecha_texto || '').toUpperCase(), W - P, 120); c.textAlign = 'left';
    // tema
    let y = 300;
    c.fillStyle = n.color || '#8b5cf6'; c.beginPath(); c.arc(P + 40, y - 10, 9, 0, 7); c.fill();
    c.fillStyle = '#a9a6c4'; c.font = '500 26px "Space Grotesk", sans-serif'; c.fillText((n.tema || '').toUpperCase(), P + 62, y);
    // título
    c.fillStyle = '#f4f2ff'; c.font = '78px "Instrument Serif", Georgia, serif';
    y += 100;
    for (const l of wrap(c, n.titulo, W - 2 * P - 80).slice(0, 4)) { c.fillText(l, P + 40, y); y += 84; }
    // texto
    c.fillStyle = '#c9c6e0'; c.font = '36px "Space Grotesk", sans-serif'; y += 20;
    const plain = String(n.texto || '').replace(/\*\*|\*/g, '');
    const lines = wrap(c, plain, W - 2 * P - 80); const maxL = Math.max(3, Math.floor((H - 280 - y) / 52));
    lines.slice(0, maxL).forEach((l, i, a) => { c.fillText(i === a.length - 1 && lines.length > maxL ? l.replace(/\s*\S*$/, ' …') : l, P + 40, y); y += 52; });
    if (n.fuente) { c.fillStyle = '#6d6a8a'; c.font = '26px "Space Grotesk", sans-serif'; c.fillText('Fuente: ' + n.fuente, P + 40, H - 230); }
    // pie
    const url = (location.host + location.pathname).replace(/\/$/, '');
    c.fillStyle = '#f4f2ff'; c.font = '600 30px "Space Grotesk", sans-serif'; c.fillText('Tu resumen diario, gratis cada mañana', P, H - 110);
    c.fillStyle = '#a3e635'; c.font = '500 28px "Space Grotesk", sans-serif'; c.fillText(url, P, H - 66);
    cv.toBlob(async (b) => {
      if (!b) return toast('No se pudo crear la tarjeta');
      const file = new File([b], 'tu-manana.png', { type: 'image/png' });
      const shareText = `${n.titulo} — vía Tu Mañana ☀️ ${location.origin + location.pathname}`;
      const objUrl = URL.createObjectURL(b);
      $('#cardImg').src = objUrl; $('#cardDownload').href = objUrl;
      $('#cardShare').onclick = async () => {
        try {
          if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text: shareText });
          else if (navigator.share) await navigator.share({ text: shareText });
          else { await navigator.clipboard.writeText(shareText); toast('🔗 Texto copiado'); }
        } catch {}
      };
      $('#sheetCard').hidden = false;
    }, 'image/png');
  }

  // ---------- arranque ----------
  loadWeather(store.get('lugar') || DEFAULT_PLACE);
  loadEdition().then((ed) => { render(ed); if (!wanted) liveTRM(); }).catch(() => {
    $('#titular').textContent = 'No se pudo cargar la edición de hoy. Revisa tu conexión e inténtalo de nuevo.';
  });
})();
