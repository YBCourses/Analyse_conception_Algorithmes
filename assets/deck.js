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

  /* Ajustement automatique (optionnel, <body data-autofit>) : agrandit le contenu des diapositives
     de texte quand il reste trop de place libre. Les diapositives avec simulation restent telles quelles. */
  var AUTO = document.body.hasAttribute('data-autofit');
  if (AUTO) slides.forEach(function (s) {
    if (s.classList.contains('cover') || s.classList.contains('divider')) return;
    var gate = s.querySelector(':scope > .gate'); if (gate) { s._fit = gate; s._gate = true; return; }
    if (s.querySelector('.obj, .mb, .sim, .tracer')) return;
    var title = s.querySelector(':scope > .title'); if (!title) return;
    var kids = [].filter.call(s.children, function (c) { return c !== title && !/(^|\s)(sub|notes|deco|plate)(\s|$)/.test(c.className); });
    if (!kids.length) return;
    var box = document.createElement('div'); box.className = 'fitbox';
    s.insertBefore(box, kids[0]); kids.forEach(function (k) { box.appendChild(k); }); s._fit = box;
  });
  function fitSlide(s, force) {
    var box = s._fit; if (!box || (s._fitDone && !force)) return;
    var k = stage.getBoundingClientRect().height / 1080; if (!k) return;
    var wasAll = stage.classList.contains('show-all'); stage.classList.add('show-all', 'fit-measure');
    box.style.zoom = ''; box.style.flex = 'none';
    var top = (box.getBoundingClientRect().top - stage.getBoundingClientRect().top) / k;
    var avail = 1010 - top, h0 = box.getBoundingClientRect().height / k, z = 1;
    var sr = stage.getBoundingClientRect();
    /* contenu qui dépasse de son cadre (texte débordant, code tronqué) */
    function over() {
      var pf = box.style.flex, els, i, e, res = false;
      box.style.flex = '';                      /* état final : la boîte remplit l'espace restant */
      els = box.querySelectorAll('*');
      for (i = 0; i < els.length && !res; i++) {
        e = els[i];
        if (!e.clientHeight || !e.clientWidth || /(^|\s)(arr|ac|cell|mb|mb-row|mb-arrow|ops)(\s|$)/.test(e.className + '')) continue;
        if (e.ownerSVGElement || (e.parentNode && e.parentNode.classList && e.parentNode.classList.contains('t3') && /^svg$/i.test(e.tagName))) continue;
        if (e.scrollHeight > e.clientHeight + 4 || e.scrollWidth > e.clientWidth + 4) res = true;
      }
      box.style.flex = pf;
      return res;
    }
    if (!s._gate && over()) {
      for (var d = 0.96; d >= 0.62; d -= 0.04) { box.style.zoom = d; z = d; if (!over()) break; }
    } else if (h0 < avail * 0.9) {
      /* on n'agrandit pas au-delà d'une police d'environ 42 px à l'écran (plus gros = illisible et disproportionné) */
      var fs0 = 0;
      [].forEach.call(box.querySelectorAll('*'), function (e) {
        if (e.matches('.title,h1,h2,.big') || !e.clientWidth) return;
        if ([].some.call(e.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim(); })) fs0 = Math.max(fs0, parseFloat(getComputedStyle(e).fontSize) || 0);
      });
      var cap = fs0 ? Math.max(1, 42 / fs0) : 1.5;
      for (var t = 1.04; t <= Math.min(s._gate ? 1.36 : 1.5, cap); t += 0.04) {
        box.style.zoom = t; var hh = box.getBoundingClientRect().height / k, mr = 0;
        [].forEach.call(box.querySelectorAll('*'), function (e) { var r = e.getBoundingClientRect(); if (r.width) mr = Math.max(mr, (r.right - sr.left) / k); });
        if (hh > avail * 0.985 || mr > 1812 || over()) break; z = t;
      }
    }
    box.style.zoom = z !== 1 ? z : ''; box.style.flex = '';
    if (!wasAll) stage.classList.remove('show-all');
    void stage.offsetHeight; stage.classList.remove('fit-measure');
    s._fitDone = true;
  }
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
    if (AUTO) fitSlide(sl);
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

  if (AUTO && document.fonts && document.fonts.ready) document.fonts.ready.then(function () { slides.forEach(function (s) { s._fitDone = false; }); fitSlide(slides[cur], true); });
  var m = /^#s(\d+)$/.exec(location.hash);
  show(m ? parseInt(m[1], 10) - 1 : 0, 'start');
  window.addEventListener('hashchange', function () {
    var mm = /^#s(\d+)$/.exec(location.hash);
    if (mm && parseInt(mm[1], 10) - 1 !== cur) show(parseInt(mm[1], 10) - 1, 'start');
  });
})();
