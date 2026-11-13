/* Tu Mañana · app */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
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
  const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 2600); };

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
    if (ed.saludo) $('#saludo').innerHTML = ed.saludo.replace(/<(?!\/?(em|br)\b)[^>]*>/gi, '');
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
    $('#noticias').innerHTML = (ed.noticias || []).map((n) => `
      <article class="card news" style="--accent:${esc(n.color)}">
        <div class="label"><span class="dot" style="background:${esc(n.color)}"></span>${esc(n.tema)}</div>
        <h3>${esc(n.titulo)}</h3>
        <p>${md(n.texto)}</p>
        ${n.countdown ? `<div class="cdown" data-cd="${esc(n.countdown)}" data-cd-mode="full"><div><b>0</b><small>días</small></div><div><b>00</b><small>horas</small></div><div><b>00</b><small>min</small></div><div><b>00</b><small>seg</small></div></div>` : ''}
        ${n.url ? `<a class="src" href="${safeUrl(n.url)}" target="_blank" rel="noopener">${esc(n.fuente || 'Fuente')} ↗</a>` : ''}
      </article>`).join('');

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
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=4`;
      const w = await getJSON(u);
      const dd = w.daily;
      const max = Math.round(dd.temperature_2m_max[0]), min = Math.round(dd.temperature_2m_min[0]), p = dd.precipitation_probability_max[0] ?? 0;
      const [desc, kind] = WMO(dd.weather_code[0]);
      const now = Math.round(w.current.temperature_2m);
      $('#wTemp').innerHTML = `${now}<sup>°C</sup>`;
      let tip = p >= 60 ? 'Lleva sombrilla ☂️' : p >= 30 ? 'Puede caer un aguacero, por si acaso.' : max >= 32 ? 'Mucho calor: hidrátate 💧' : 'Buen día para salir.';
      $('#wDesc').innerHTML = `Ahora · ${esc(desc)}. Máxima <b>${max}°</b> · mínima <b>${min}°</b> · <b>${p} % de lluvia</b>. ${tip}`;
      $('#wIcon').innerHTML = weatherSVG(kind, p >= 40);
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

  // ---------- arranque ----------
  loadWeather(store.get('lugar') || DEFAULT_PLACE);
  loadEdition().then((ed) => { render(ed); if (!wanted) liveTRM(); }).catch(() => {
    $('#titular').textContent = 'No se pudo cargar la edición de hoy. Revisa tu conexión e inténtalo de nuevo.';
  });
})();
