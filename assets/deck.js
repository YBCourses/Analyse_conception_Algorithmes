/* Moteur de diaporama : navigation, étapes d'apparition, aperçu, notes, thème, plein écran. */
(function () {
  var stage = document.getElementById('stage');
  var slides = Array.prototype.slice.call(stage.querySelectorAll('.slide'));
  var cur = 0;
  var showAll = /[?&]all\b/.test(location.search);
  if (showAll) stage.classList.add('show-all');
  var bar = document.getElementById('bar');
  var count = document.getElementById('count');
  var chip = document.getElementById('chip');
  var notesBox = document.getElementById('notes');
  var overview = document.getElementById('overview');
  var help = document.getElementById('help');

  var DECO = '<svg class="deco" viewBox="0 0 1000 760" aria-hidden="true"><g fill="none" stroke-linecap="round" stroke-width="5">' +
    '<path d="M40 700 L960 690" stroke="#6DB3EE" opacity=".3"/>' +
    '<path d="M40 700 C300 690 600 600 960 520" stroke="#6DB3EE" opacity=".5"/>' +
    '<path d="M40 700 C250 680 500 560 960 330" stroke="#6DB3EE" opacity=".7"/>' +
    '<path d="M40 700 C250 670 420 500 740 120" stroke="#F0B34D" opacity=".85"/>' +
    '<path d="M40 700 C200 690 300 520 430 20" stroke="#FF8E7D" opacity=".85"/></g>' +
    '<circle cx="40" cy="700" r="9" fill="#6DB3EE" opacity=".6"/></svg>';
  slides.forEach(function (s) {
    if (s.classList.contains('cover') || s.classList.contains('divider')) s.insertAdjacentHTML('afterbegin', DECO);
  });

  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = 'translate(-50%,-50%) scale(' + s + ')';
  }
  window.addEventListener('resize', fit); fit();

  function stepsOf(sl) { return Array.prototype.slice.call(sl.querySelectorAll('.step')); }
  function setHash() {
    var h = '#s' + (cur + 1);
    try { history.replaceState(null, '', h); } catch (e) { try { location.hash = h; } catch (e2) {} }
  }
  function show(i, mode) {
    cur = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach(function (s, k) { s.classList.toggle('active', k === cur); });
    var sl = slides[cur];
    stepsOf(sl).forEach(function (e) { e.classList.toggle('on', mode === 'end'); });
    bar.style.width = ((cur + 1) / slides.length * 100) + '%';
    count.textContent = (cur + 1) + ' / ' + slides.length;
    var ch = sl.getAttribute('data-ch');
    if (ch) { chip.innerHTML = '<b>' + ch + '</b><span></span>'; chip.lastChild.textContent = sl.getAttribute('data-chname') || ''; chip.style.opacity = 1; }
    else { chip.style.opacity = 0; }
    updateNotes(); setHash();
  }
  function next() {
    var st = stepsOf(slides[cur]);
    var off = st.filter(function (e) { return !e.classList.contains('on'); })[0];
    if (off && !showAll) {
      var g = off.dataset.g;
      st.forEach(function (e) { if (e === off || (g && e.dataset.g === g && !e.classList.contains('on'))) e.classList.add('on'); });
      return;
    }
    if (cur < slides.length - 1) show(cur + 1, 'start');
  }
  function prev() {
    var st = stepsOf(slides[cur]);
    var on = st.filter(function (e) { return e.classList.contains('on'); });
    if (on.length && !showAll) {
      var last = on[on.length - 1], g = last.dataset.g;
      on.forEach(function (e) { if (e === last || (g && e.dataset.g === g)) e.classList.remove('on'); });
      return;
    }
    if (cur > 0) show(cur - 1, 'end');
  }
  function updateNotes() {
    var n = slides[cur].querySelector('.notes');
    notesBox.innerHTML = n ? '<b>Notes de l’enseignant</b><br>' + n.innerHTML : '<b>Notes de l’enseignant</b><br><span class="muted">Aucune note pour cette diapositive.</span>';
  }
  function buildOverview() {
    var grid = overview.querySelector('.grid'); grid.innerHTML = '';
    slides.forEach(function (s, i) {
      var k = s.getAttribute('data-chname') || '', t = s.querySelector('.title, h2, h1');
      var b = document.createElement('button'); b.className = 'it' + (i === cur ? ' cur' : '');
      b.innerHTML = '<small>' + (i + 1) + (k ? ' · ' + k : '') + '</small>' + (t ? t.textContent : '');
      b.addEventListener('click', function () { closeOv(); show(i, 'start'); });
      grid.appendChild(b);
    });
  }
  function closeOv() { overview.classList.remove('open'); help.classList.remove('open'); }
  function toggle(el) { var o = el.classList.contains('open'); closeOv(); if (!o) el.classList.add('open'); }
  function fullscreen() {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(function () {});
    } catch (e) {}
  }
  function theme() {
    var r = document.documentElement;
    var dark = r.getAttribute('data-theme') === 'dark' || (!r.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var nt = dark ? 'light' : 'dark';
    r.setAttribute('data-theme', nt);
    try { localStorage.setItem('inpt-theme', nt); } catch (e) {}
  }
  try { var t0 = localStorage.getItem('inpt-theme'); if (t0) document.documentElement.setAttribute('data-theme', t0); } catch (e) {}

  var idleT;
  function wake() { document.body.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(function () { document.body.classList.add('idle'); }, 2800); }
  ['mousemove', 'touchstart', 'keydown'].forEach(function (ev) { document.addEventListener(ev, wake, { passive: true }); });
  wake();

  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var tg = e.target, tag = tg && tg.tagName;
    var inCtl = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
    var k = e.key;
    if (k === 'Escape') { closeOv(); notesBox.classList.remove('open'); return; }
    if (inCtl) return;
    if (k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && tag !== 'BUTTON')) { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); prev(); }
    else if (k === 'Home') show(0, 'start');
    else if (k === 'End') show(slides.length - 1, 'start');
    else if (k === 'o' || k === 'O' || k === 'g') { buildOverview(); toggle(overview); }
    else if (k === 'f' || k === 'F') fullscreen();
    else if (k === 't' || k === 'T') theme();
    else if (k === 'n' || k === 'N') notesBox.classList.toggle('open');
    else if (k === '?' || k === 'h') toggle(help);
  });
  var x0 = null;
  document.addEventListener('touchstart', function (e) { x0 = (e.target.closest('.sim, input, select, button, .ov')) ? null : e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 60) { if (dx < 0) next(); else prev(); }
  });
  document.getElementById('b-prev').addEventListener('click', prev);
  document.getElementById('b-next').addEventListener('click', next);
  document.getElementById('b-ov').addEventListener('click', function () { buildOverview(); toggle(overview); });
  document.getElementById('b-help').addEventListener('click', function () { toggle(help); });
  document.getElementById('b-theme').addEventListener('click', theme);
  document.getElementById('b-full').addEventListener('click', fullscreen);
  overview.addEventListener('click', function (e) { if (e.target === overview) closeOv(); });
  help.addEventListener('click', function (e) { if (e.target === help) closeOv(); });

  var m = /^#s(\d+)$/.exec(location.hash);
  show(m ? parseInt(m[1], 10) - 1 : 0, 'start');
  window.addEventListener('hashchange', function () {
    var mm = /^#s(\d+)$/.exec(location.hash);
    if (mm && parseInt(mm[1], 10) - 1 !== cur) show(parseInt(mm[1], 10) - 1, 'start');
  });
})();
