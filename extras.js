/* Tu Mañana · funciones "nivel NASA": cielo vivo, lluvia y radar, voz, historias */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const TM = (window.TM = window.TM || {});
  const toast = (m) => (window.TM_toast ? window.TM_toast(m) : null);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<em>$1</em>');
  const plain = (s) => String(s ?? '').replace(/\*\*|\*/g, '').replace(/<[^>]+>/g, '');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= 1. CIELO VIVO ================= */
  const SKIES = {
    dawn:  { bg: '#120a14', c: ['#f97316', '#f472b6', '#7c3aed'], name: 'Amanecer' },
    day:   { bg: '#070b18', c: ['#2563eb', '#06b6d4', '#8b5cf6'], name: 'Día' },
    dusk:  { bg: '#120816', c: ['#db2777', '#f97316', '#6d28d9'], name: 'Atardecer' },
    night: { bg: '#05060c', c: ['#312e81', '#0e7490', '#581c87'], name: 'Noche' }
  };
  const mins = (iso) => { const t = iso.slice(11, 16).split(':'); return +t[0] * 60 + +t[1]; };
  const hhmm = (iso) => { const m = mins(iso); const h = Math.floor(m / 60), mm = String(m % 60).padStart(2, '0'); return `${h % 12 || 12}:${mm}\u00a0${h < 12 ? 'a.\u00a0m.' : 'p.\u00a0m.'}`; };

  function moon(date = new Date()) {
    const syn = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14);
    const age = (((date - ref) / 864e5) % syn + syn) % syn, ph = age / syn;
    const illum = Math.round(((1 - Math.cos(2 * Math.PI * ph)) / 2) * 100);
    const names = [['🌑', 'Luna nueva'], ['🌒', 'Luna creciente'], ['🌓', 'Cuarto creciente'], ['🌔', 'Gibosa creciente'], ['🌕', 'Luna llena'], ['🌖', 'Gibosa menguante'], ['🌗', 'Cuarto menguante'], ['🌘', 'Luna menguante']];
    const [emoji, name] = names[Math.floor(ph * 8 + 0.5) % 8];
    return { emoji, name, illum, age: Math.floor(age) };
  }

  function buildStars() {
    const box = $('#stars'); if (box.childElementCount) return;
    let html = '';
    for (let i = 0; i < 90; i++) {
      const s = Math.random() * 2 + 0.6;
      html += `<i style="left:${Math.random() * 100}%;top:${Math.random() * 70}%;width:${s}px;height:${s}px;animation-delay:${(Math.random() * 4).toFixed(2)}s;animation-duration:${(2.5 + Math.random() * 3).toFixed(2)}s"></i>`;
    }
    html += '<b class="shooting"></b>';
    box.innerHTML = html;
  }
  function buildDrops(intensity) {
    const box = $('#drops'); box.innerHTML = '';
    if (reduced) return;
    const n = intensity > 2 ? 110 : intensity > 0.5 ? 70 : 40;
    let html = '';
    for (let i = 0; i < n; i++) html += `<i style="left:${Math.random() * 100}%;animation-delay:${(Math.random() * 1.2).toFixed(2)}s;animation-duration:${(0.55 + Math.random() * 0.5).toFixed(2)}s;opacity:${(0.25 + Math.random() * 0.45).toFixed(2)}"></i>`;
    box.innerHTML = html;
  }

  function applySky(wx) {
    const w = wx.w, cur = w.current || {};
    const nowM = cur.time ? mins(cur.time) : new Date().getHours() * 60 + new Date().getMinutes();
    const sr = w.daily.sunrise?.[0], ss = w.daily.sunset?.[0];
    let phase = cur.is_day ? 'day' : 'night';
    if (sr && ss) {
      const a = mins(sr), b = mins(ss);
      if (nowM >= a - 50 && nowM < a + 60) phase = 'dawn';
      else if (nowM >= b - 60 && nowM < b + 40) phase = 'dusk';
      else if (nowM >= a + 60 && nowM < b - 60) phase = 'day';
      else phase = 'night';
    }
    const sky = SKIES[phase];
    const code = cur.weather_code ?? 0;
    const cloudy = code >= 3;
    const raining = (cur.precipitation ?? 0) > 0 || (code >= 51 && code <= 67) || (code >= 80 && code <= 99);
    document.body.dataset.sky = phase;
    document.body.classList.toggle('cloudy', cloudy);
    document.body.classList.toggle('raining', raining);
    document.body.style.background = sky.bg;
    document.querySelectorAll('.blob').forEach((b, i) => (b.style.background = sky.c[i]));
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = sky.bg;
    if (phase === 'night') buildStars();
    $('#stars').classList.toggle('on', phase === 'night' && !cloudy);
    if (raining) buildDrops(cur.precipitation || 1); else $('#drops').innerHTML = '';

    // amanecer · atardecer · luna
    const m = moon();
    TM.astro = { sunrise: sr ? hhmm(sr) : null, sunset: ss ? hhmm(ss) : null, moon: m, phase: sky.name };
    const box = $('#astro');
    box.innerHTML = `
      <div><span>🌅</span><small>Amanecer</small><b>${sr ? hhmm(sr) : '—'}</b></div>
      <div><span>🌇</span><small>Atardecer</small><b>${ss ? hhmm(ss) : '—'}</b></div>
      <div><span>${m.emoji}</span><small>${esc(m.name.replace('Luna ', ''))}</small><b>Luna ${m.illum}\u00a0%</b></div>`;
    box.hidden = false;
  }

  /* ================= 2. LLUVIA EN LA PRÓXIMA HORA + RADAR ================= */
  function nowcast(wx) {
    const w = wx.w, box = $('#nowcast');
    const M = w.minutely_15, cur = w.current || {};
    if (!M || !M.time) { box.hidden = true; return; }
    const nowIso = cur.time || '';
    let start = M.time.findIndex((t) => t >= nowIso.slice(0, 16));
    if (start < 0) start = 0;
    const slots = M.time.slice(start, start + 8).map((t, k) => ({ t, p: M.precipitation[start + k] || 0 }));
    const rainingNow = (cur.precipitation || 0) > 0 || (slots[0] && slots[0].p > 0.05);
    const nowM = nowIso ? mins(nowIso) : 0;
    const diff = (t) => { let d = mins(t) - nowM; if (d < 0) d += 1440; return d; };
    let msg, icon, cls;
    if (rainingNow) {
      const stop = slots.findIndex((s, k) => k > 0 && s.p <= 0.05);
      icon = '☔'; cls = 'wet';
      msg = stop > 0 ? `Está lloviendo. Escamparía en unos <b>${Math.max(15, diff(slots[stop].t))} minutos</b>.` : 'Está lloviendo y seguiría así las próximas 2 horas.';
    } else {
      const first = slots.findIndex((s) => s.p > 0.05);
      if (first >= 0) { icon = '🌧️'; cls = 'soon'; const d = Math.max(5, diff(slots[first].t)); msg = `Empezaría a llover en unos <b>${d} minutos</b> (hacia las ${hhmm(slots[first].t)}).`; }
      else { icon = '🌤️'; cls = 'dry'; msg = 'Sin lluvia en las próximas <b>2 horas</b>.'; }
    }
    const maxP = Math.max(0.6, ...slots.map((s) => s.p));
    const bars = slots.map((s) => `<i style="height:${Math.max(6, (s.p / maxP) * 100)}%" class="${s.p > 0.05 ? 'r' : ''}" title="${hhmm(s.t)}: ${s.p.toFixed(1)} mm"></i>`).join('');
    TM.nowcastText = msg.replace(/<[^>]+>/g, '');
    box.className = 'nowcast ' + cls;
    box.innerHTML = `
      <div class="nc-top"><span class="nc-ico">${icon}</span><p>${msg}</p></div>
      <div class="nc-bars">${bars}</div>
      <div class="nc-axis"><span>Ahora</span><span>+1 h</span><span>+2 h</span></div>
      <button class="cta radar-btn" id="btnRadar">🛰️ Ver radar en vivo</button>`;
    box.hidden = false;
    $('#btnRadar').onclick = () => openRadar(wx.place);
  }

  let leafletP = null, radarMap = null, radarTimer = null, radarFrames = [], radarIdx = 0, radarPlaying = true;
  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    if (leafletP) return leafletP;
    leafletP = new Promise((res, rej) => {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(css);
      const js = document.createElement('script'); js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; js.onload = res; js.onerror = rej; document.head.appendChild(js);
    });
    return leafletP;
  }
  async function openRadar(place) {
    $('#sheetRadar').hidden = false;
    $('#radarTime').textContent = 'Cargando radar…';
    try {
      await loadLeaflet();
      const L = window.L;
      if (!radarMap) {
        radarMap = L.map('radarMap', { zoomControl: true, attributionControl: false }).setView([place.lat, place.lon], 7);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 10, subdomains: 'abcd' }).addTo(radarMap);
        L.circleMarker([place.lat, place.lon], { radius: 7, color: '#a3e635', weight: 3, fillColor: '#07080f', fillOpacity: 1 }).addTo(radarMap).bindTooltip(place.name || 'Tú', { permanent: true, direction: 'top', className: 'radar-tip' });
      } else radarMap.setView([place.lat, place.lon], 7);
      setTimeout(() => radarMap.invalidateSize(), 250);
      const r = await fetch('https://api.rainviewer.com/public/weather-maps.json').then((x) => x.json());
      const frames = [...(r.radar?.past || []), ...(r.radar?.nowcast || [])];
      radarFrames.forEach((f) => radarMap.removeLayer(f.layer));
      radarFrames = frames.map((f) => ({ time: f.time, layer: L.tileLayer(`${r.host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`, { opacity: 0, maxNativeZoom: 7, maxZoom: 10, tileSize: 256 }).addTo(radarMap) }));
      if (!radarFrames.length) { $('#radarTime').textContent = 'Radar no disponible ahora'; return; }
      radarIdx = Math.max(0, (r.radar?.past?.length || 1) - 1);
      showFrame(radarIdx);
      clearInterval(radarTimer); radarPlaying = true; $('#radarPlay').textContent = '⏸';
      radarTimer = setInterval(() => { if (radarPlaying && !$('#sheetRadar').hidden) showFrame((radarIdx + 1) % radarFrames.length); }, 600);
    } catch { $('#radarTime').textContent = 'No se pudo cargar el radar. Revisa tu conexión.'; }
  }
  function showFrame(i) {
    radarFrames.forEach((f, k) => f.layer.setOpacity(k === i ? 0.75 : 0));
    radarIdx = i;
    const f = radarFrames[i]; if (!f) return;
    const d = new Date(f.time * 1000), future = f.time * 1000 > Date.now();
    $('#radarTime').textContent = `${future ? '🔮 Pronóstico' : '📡 Radar'} · ${d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}`;
  }
  $('#radarPlay').addEventListener('click', () => { radarPlaying = !radarPlaying; $('#radarPlay').textContent = radarPlaying ? '⏸' : '▶'; });

  document.addEventListener('tm:weather', (e) => {
    try { applySky(e.detail); } catch (err) { console.warn(err); }
    try { nowcast(e.detail); } catch (err) { console.warn(err); }
  });
  if (TM.wx) { applySky(TM.wx); nowcast(TM.wx); }

  /* ================= 3. ESCUCHA TU MAÑANA ================= */
  const synth = window.speechSynthesis;
  let queue = [], qi = 0, speaking = false, paused = false;
  function pickVoice() {
    const vs = synth.getVoices().filter((v) => /^es/i.test(v.lang));
    const pref = ['es-CO', 'es-MX', 'es-US', 'es-419', 'es-ES'];
    for (const p of pref) { const v = vs.find((x) => x.lang.replace('_', '-') === p && /google|natural|neural|premium|enhanced/i.test(x.name)) || vs.find((x) => x.lang.replace('_', '-') === p); if (v) return v; }
    return vs[0] || null;
  }
  function buildScript() {
    const ed = TM.ed, wx = TM.wx, q = [];
    if (!ed) return q;
    const hr = new Date().getHours();
    const saludo = hr < 12 ? 'Buenos días' : hr < 19 ? 'Buenas tardes' : 'Buenas noches';
    q.push({ el: '.hero', t: `${saludo}. Esto es Tu Mañana, edición número ${ed.edicion}, ${plain(ed.fecha_texto).replace(/·/g, ',')}. ${plain(ed.titular)}` });
    if (wx) {
      let t = `El clima en ${wx.place.name}: ahora hay ${wx.now} grados, ${wx.desc.toLowerCase()}.`;
      if (wx.heat) t += ` La máxima será de ${wx.heat.tMax} grados a las ${wx.heat.horaMax}, con una sensación térmica de hasta ${wx.heat.feel} grados. ${wx.heat.hotTxt}`;
      t += ` Probabilidad de lluvia: ${wx.rain} por ciento.`;
      if (TM.nowcastText) t += ` ${TM.nowcastText}`;
      q.push({ el: '#weatherCard', t });
    }
    const m = ed.madrid;
    if (m) q.push({ el: '#madrid', t: `Real Madrid. ${m.local} ${m.goles_local}, ${m.visitante} ${m.goles_visitante}. ${plain(m.resumen)} ${m.proximo ? plain(m.proximo.texto) : ''}` });
    (ed.noticias || []).forEach((n, i) => q.push({ el: `#noticias .news:nth-child(${i + 1})`, t: `${plain(n.tema).replace('·', 'y')}. ${plain(n.titulo)}. ${plain(n.texto)}` }));
    if (ed.dato) q.push({ el: '#pensar .feature:nth-child(1)', t: `Dato curioso del día. ${plain(ed.dato.frase)} ${plain(ed.dato.texto)}` });
    if (ed.concepto) q.push({ el: '#pensar .feature:nth-child(2)', t: `Concepto de ingeniería del día: ${ed.concepto.nombre}. ${plain(ed.concepto.ejemplo)}` });
    if (ed.recomendacion) q.push({ el: '#reco', t: `Y la recomendación del día: ${ed.recomendacion.portada}, de ${ed.recomendacion.autor}. ${plain(ed.recomendacion.texto)}` });
    q.push({ el: null, t: 'Eso es todo por hoy. No olvides hacer el quiz del día. ¡Que tengas una excelente jornada!' });
    return q;
  }
  function speakNext() {
    document.querySelectorAll('.speaking').forEach((x) => x.classList.remove('speaking'));
    if (qi >= queue.length) return stopVoice(true);
    const item = queue[qi];
    const el = item.el && document.querySelector(item.el);
    if (el) { el.classList.add('speaking'); el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); }
    $('#pNow').textContent = item.t.split('.')[0].slice(0, 60);
    $('#pBar').style.width = `${Math.round((qi / queue.length) * 100)}%`;
    const u = new SpeechSynthesisUtterance(item.t);
    const v = pickVoice(); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'es-CO';
    u.rate = 1.02; u.pitch = 1;
    u.onend = () => { if (speaking && !paused) { qi++; speakNext(); } };
    u.onerror = (e) => { if (e.error !== 'interrupted' && e.error !== 'canceled') { qi++; speakNext(); } };
    synth.speak(u);
  }
  function startVoice() {
    if (!synth) return toast('Tu navegador no permite leer en voz alta');
    queue = buildScript();
    if (!queue.length) return toast('Espera a que cargue la edición');
    synth.cancel(); qi = 0; speaking = true; paused = false;
    $('#player').hidden = false; $('#pPause').textContent = '⏸';
    $('#btnListen').textContent = '⏹ Detener';
    speakNext();
  }
  function stopVoice(finished) {
    speaking = false; paused = false; try { synth.cancel(); } catch {}
    $('#player').hidden = true; $('#btnListen').textContent = '🎧 Escuchar';
    document.querySelectorAll('.speaking').forEach((x) => x.classList.remove('speaking'));
    if (finished === true) toast('🎧 ¡Listo! Ya estás al día');
  }
  $('#btnListen').addEventListener('click', () => (speaking ? stopVoice() : startVoice()));
  $('#pStop').addEventListener('click', () => stopVoice());
  $('#pPause').addEventListener('click', () => {
    if (!speaking) return;
    if (!paused) { paused = true; synth.pause(); $('#pPause').textContent = '▶'; }
    else {
      paused = false; $('#pPause').textContent = '⏸';
      if (synth.paused) synth.resume(); else speakNext();
    }
  });
  if (synth) { synth.getVoices(); synth.onvoiceschanged = () => synth.getVoices(); }
  window.addEventListener('pagehide', () => { try { synth && synth.cancel(); } catch {} });

  /* ================= 4. MODO HISTORIAS ================= */
  const ST_MS = 6500;
  let slides = [], si = 0, stTimer = null, stStart = 0, stElapsed = 0, stPaused = false;
  function slideHTML() {
    const ed = TM.ed, wx = TM.wx, s = [];
    const grad = (a, b) => `background:radial-gradient(120% 90% at 0% 0%, ${a}cc, transparent 60%), radial-gradient(120% 90% at 100% 100%, ${b}aa, transparent 60%), #07080f`;
    s.push(`<section class="slide" style="${grad('#6d28d9', '#0891b2')}">
      <div class="sl-kicker">${esc(ed.fecha_texto)}</div>
      <h2 class="sl-hero">${document.getElementById('saludo').innerHTML.replace(' ', '<br>')}</h2>
      <p class="sl-text">${md(ed.titular)}</p>
      <div class="sl-foot">☀️ Tu Mañana · Edición Nº ${esc(ed.edicion)}</div></section>`);
    if (wx) {
      const h = wx.heat;
      s.push(`<section class="slide" style="${grad('#f97316', '#db2777')}">
        <div class="sl-kicker">El clima en ${esc(wx.place.name)}</div>
        <div class="sl-big">${wx.now}°</div>
        <p class="sl-text">${esc(wx.desc)} · máx <b>${wx.max}°</b> · mín <b>${wx.min}°</b> · lluvia <b>${wx.rain} %</b></p>
        ${h ? `<p class="sl-callout">🔥 Máxima de <b>${h.tMax}°</b> a las <b>${esc(h.horaMax)}</b><br>Sensación térmica hasta <b>${h.feel}°</b></p>` : ''}
        ${TM.nowcastText ? `<p class="sl-text">${esc(TM.nowcastText)}</p>` : ''}
        ${TM.astro ? `<p class="sl-small">🌅 ${esc(TM.astro.sunrise)} · 🌇 ${esc(TM.astro.sunset)} · ${TM.astro.moon.emoji} ${esc(TM.astro.moon.name)}</p>` : ''}</section>`);
    }
    const m = ed.madrid;
    if (m) s.push(`<section class="slide" style="${grad('#a16207', '#1e1b4b')}">
      <div class="sl-kicker" style="color:#e8c66a">⚪ ${esc(m.etiqueta)}</div>
      <div class="sl-score"><span>${esc(m.local)}</span><b>${esc(m.goles_local)} – ${esc(m.goles_visitante)}</b><span>${esc(m.visitante)}</span></div>
      <p class="sl-text">${md(m.resumen)}</p>
      ${m.proximo ? `<p class="sl-small">⏭️ ${esc(m.proximo.texto)}</p>` : ''}</section>`);
    (ed.noticias || []).forEach((n) => s.push(`<section class="slide" style="${grad(n.color || '#8b5cf6', '#1e1b4b')}">
      <div class="sl-kicker"><span class="dot" style="background:${esc(n.color)}"></span>${esc(n.tema)}</div>
      <h2 class="sl-title">${esc(n.titulo)}</h2>
      <p class="sl-text">${md(n.texto)}</p>
      ${n.url ? `<a class="sl-link" href="${/^https:\/\//.test(n.url) ? esc(n.url) : '#'}" target="_blank" rel="noopener">Leer en ${esc(n.fuente)} ↗</a>` : ''}</section>`));
    if (ed.dato) s.push(`<section class="slide" style="${grad('#fbbf24', '#7c3aed')}">
      <div class="sl-kicker">🤯 Dato curioso</div><h2 class="sl-title">${md(ed.dato.frase)}</h2><p class="sl-text">${md(ed.dato.texto)}</p></section>`);
    if (ed.concepto) s.push(`<section class="slide" style="${grad('#65a30d', '#0e7490')}">
      <div class="sl-kicker">📐 Ingeniería · ${esc(ed.concepto.nombre)}</div><div class="sl-formula">${esc(ed.concepto.formula)}</div><p class="sl-text">${md(ed.concepto.ejemplo)}</p></section>`);
    if (ed.recomendacion) s.push(`<section class="slide" style="${grad('#db2777', '#4c1d95')}">
      <div class="sl-kicker">✨ ${esc(ed.recomendacion.tipo)}</div><h2 class="sl-title">${esc(ed.recomendacion.portada)}</h2><p class="sl-small">${esc(ed.recomendacion.autor)}</p><p class="sl-text">${md(ed.recomendacion.texto)}</p></section>`);
    s.push(`<section class="slide" style="${grad('#a3e635', '#6d28d9')}">
      <div class="sl-kicker">¡Ya estás al día! 🎉</div>
      <h2 class="sl-hero" style="font-size:clamp(48px,13vw,86px)">¿Te atreves con el <em>quiz?</em></h2>
      <p class="sl-text">5 preguntas sobre lo que acabas de ver. Compite con tus amigos.</p>
      <div class="sl-btns"><button class="cta" data-go="quiz">🧠 Hacer el quiz</button><button class="pill btn" data-go="share">↗ Compartir la app</button></div></section>`);
    return s;
  }
  function openStories() {
    if (!TM.ed) return toast('Espera a que cargue la edición');
    slides = slideHTML();
    $('#stStage').innerHTML = slides.join('');
    $('#stBars').innerHTML = slides.map(() => '<i><b></b></i>').join('');
    $('#stories').hidden = false; document.body.style.overflow = 'hidden';
    $('#stStage').querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation(); const go = b.dataset.go; closeStories();
      if (go === 'quiz') { const q = $('#quiz'); q && q.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      else $('#btnShare').click();
    }));
    go(0);
  }
  function closeStories() { clearTimeout(stTimer); cancelAnimationFrame(raf); $('#stories').hidden = true; document.body.style.overflow = ''; }
  let raf = 0;
  function go(i) {
    if (i < 0) i = 0;
    if (i >= slides.length) return closeStories();
    si = i; stElapsed = 0; stPaused = false;
    $('#stStage').querySelectorAll('.slide').forEach((el, k) => el.classList.toggle('cur', k === i));
    $('#stBars').querySelectorAll('i b').forEach((b, k) => (b.style.width = k < i ? '100%' : '0%'));
    stStart = performance.now();
    cancelAnimationFrame(raf); loop();
  }
  function loop() {
    raf = requestAnimationFrame((t) => {
      if (!stPaused) {
        const el = stElapsed + (t - stStart);
        const bar = $('#stBars').querySelectorAll('i b')[si];
        if (bar) bar.style.width = Math.min(100, (el / ST_MS) * 100) + '%';
        if (el >= ST_MS) return go(si + 1);
      }
      loop();
    });
  }
  let wasHeld = false;
  function pause() { if (stPaused) return; wasHeld = true; stPaused = true; stElapsed += performance.now() - stStart; }
  function resume() { if (!stPaused) return; stPaused = false; stStart = performance.now(); }
  $('#btnStories').addEventListener('click', openStories);
  $('#stClose').addEventListener('click', closeStories);
  $('#stNext').addEventListener('click', () => { if (wasHeld) return (wasHeld = false); go(si + 1); });
  $('#stPrev').addEventListener('click', () => { if (wasHeld) return (wasHeld = false); go(si - 1); });
  // mantener presionado = pausa; deslizar hacia abajo = cerrar
  let y0 = null, held = null;
  const st = $('#stories');
  st.addEventListener('pointerdown', (e) => { wasHeld = false; y0 = e.clientY; held = setTimeout(pause, 180); });
  st.addEventListener('pointerup', (e) => { clearTimeout(held); resume(); if (y0 !== null && e.clientY - y0 > 90) closeStories(); y0 = null; });
  st.addEventListener('pointercancel', () => { clearTimeout(held); resume(); });
  document.addEventListener('keydown', (e) => {
    if ($('#stories').hidden) return;
    if (e.key === 'ArrowRight') go(si + 1); else if (e.key === 'ArrowLeft') go(si - 1); else if (e.key === 'Escape') closeStories();
  });
})();
