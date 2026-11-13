/* Bibliothèque de simulations. Même contrat visuel partout :
   un état visible, des étapes que l'on peut jouer une par une, et des transitions douces. */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  function $(s) { return typeof s === 'string' ? document.querySelector(s) : s; }
  function h(tag, attrs) {
    var e = document.createElement(tag), a = attrs || {};
    for (var k in a) {
      var v = a[k];
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v);
    }
    for (var i = 2; i < arguments.length; i++) add(e, arguments[i]);
    return e;
  }
  function add(e, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(e, x); }); return; }
    e.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }
  function sv(tag, attrs) {
    var e = document.createElementNS(NS, tag), a = attrs || {};
    for (var k in a) e.setAttribute(k, a[k]);
    for (var i = 2; i < arguments.length; i++) add(e, arguments[i]);
    return e;
  }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function pc(t) {
    return esc(t).replace(/(?<![\wÀ-ÿ])(pour|de|à|tant que|faire|si|alors|sinon|retourner|fonction|fin)(?![\wÀ-ÿ])/g, '<span class="k">$1</span>')
      .replace(/(\/\/.*)$/, '<span class="cm">$1</span>');
  }
  function sup(n) { return String(n).replace(/[0-9]/g, function (d) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]; }); }
  function fr(n) { return Math.round(n).toLocaleString('fr-FR'); }
  function btn(label, fn, cls) { return h('button', { class: 'btn ' + (cls || ''), type: 'button', onclick: fn }, label); }
  function clearOn(row) { [].forEach.call(row.querySelectorAll('.btn'), function (x) { x.classList.remove('on'); }); }

  /* ---------- Lecteur d'étapes réutilisable ---------- */
  function stepper(total, render, o) {
    o = o || {};
    var idx = 0, timer = null, delay = o.delay || 1000, T = typeof total === 'function' ? total : function () { return total; };
    var play = btn('▶ Lecture', toggle, 'pri'), pos = h('span', { class: 'small' });
    var sel = o.noSpeed ? null : h('select', { 'aria-label': 'Vitesse', onchange: function () { delay = +sel.value; if (timer) { stop(); start(); } } },
      h('option', { value: Math.round(delay * 1.6) }, 'Lent'), h('option', { value: delay, selected: true }, 'Normal'), h('option', { value: Math.round(delay * .5) }, 'Rapide'));
    var el = h('div', { class: 'ctl' },
      btn('⏮ Début', function () { stop(); go(0); }), btn('◀ Précédent', function () { stop(); go(idx - 1); }),
      play, btn('Suivant ▶', function () { stop(); go(idx + 1); }), sel, pos);
    function go(i) { idx = Math.max(0, Math.min(T() - 1, i)); render(idx); pos.textContent = 'étape ' + (idx + 1) + ' / ' + T(); }
    function start() { play.textContent = '❚❚ Pause'; go(idx + 1); timer = setInterval(function () { if (idx >= T() - 1) stop(); else go(idx + 1); }, delay); }
    function stop() { if (timer) clearInterval(timer); timer = null; play.textContent = '▶ Lecture'; }
    function toggle() { if (timer) stop(); else { if (idx >= T() - 1) go(0); start(); } }
    go(0);
    return { el: el, go: go, stop: stop, idx: function () { return idx; }, refresh: function () { go(idx); }, reset: function () { stop(); go(0); } };
  }

  /* ---------- Tableau animé ---------- */
  var ROW = { 'début': 0, fin: 0, i: 0, milieu: 1, lo: 0, hi: 0 };
  function arrayViz(el, o) {
    var n = o.values.length, cw = o.cw || 72, st = el._arr;
    if (!st || st.n !== n || st.cw !== cw) {
      el.innerHTML = '';
      var w = h('div', { class: 'arr', style: '--cw:' + cw + 'px' }), cells = [];
      for (var i = 0; i < n; i++) { var c = h('div', { class: 'ac' }, h('div', { class: 'cell' }), h('div', { class: 'idx' }, i)); w.appendChild(c); cells.push(c); }
      el.appendChild(w); st = el._arr = { n: n, cw: cw, w: w, cells: cells, ptrs: {} };
    }
    for (var k = 0; k < n; k++) { st.cells[k].className = 'ac ' + ((o.cls && o.cls[k]) || ''); st.cells[k].firstChild.textContent = o.values[k]; }
    var rows = 0;
    Object.keys(o.ptrs || {}).forEach(function (name) {
      var ix = o.ptrs[name], p = st.ptrs[name];
      if (!p) { p = st.ptrs[name] = h('div', { class: 'pt hide' }, name); st.w.appendChild(p); }
      var row = ROW[name] || 0; if (ix != null) rows = Math.max(rows, row);
      var dx = name === 'début' ? -34 : (name === 'fin' ? 34 : 0);
      p.style.top = 'calc(var(--cw) + ' + (34 + row * 44) + 'px)';
      if (ix == null) p.classList.add('hide');
      else { p.classList.remove('hide'); p.style.left = (ix * (cw + 8) + cw / 2 + dx) + 'px'; }
    });
    Object.keys(st.ptrs).forEach(function (name) { if (!(o.ptrs && name in o.ptrs)) st.ptrs[name].classList.add('hide'); });
    st.w.style.paddingBottom = (rows ? 112 : 66) + 'px';
  }

  /* ---------- Tracer : code, variables, tableau, compteur ---------- */
  function codeBlock(lines) {
    var el = h('div', { class: 'code' });
    var els = lines.map(function (t, i) {
      var l = h('div', { class: 'ln' }, h('span', { class: 'no' }, i + 1), h('span', { class: 'tx', html: pc(t) }));
      el.appendChild(l); return l;
    });
    return { el: el, lines: els };
  }
  function tracer(root, cfg) {
    root = $(root); root.classList.add('sim', 'tracer'); root.innerHTML = '';
    var cb = codeBlock(cfg.code), trace = cfg.trace;
    var varsEl = h('table', { class: 'vars' }), vizEl = h('div', { class: 'viz' });
    var noteEl = h('div', { class: 'note' }), opsEl = h('div', { class: 'ops' });
    root.append(h('div', { class: 'stack' }, cb.el), h('div', { class: 'side' }, varsEl, vizEl, opsEl, noteEl));
    function render(idx) {
      var st = trace[idx], pv = trace[idx - 1];
      cb.lines.forEach(function (l, i) { l.classList.toggle('hl', i === st.line); });
      varsEl.innerHTML = '';
      Object.keys(st.vars).forEach(function (k) {
        var v = st.vars[k], ch = pv && pv.vars[k] !== v;
        varsEl.appendChild(h('tr', { class: ch ? 'ch' : '' }, h('td', { class: 'n' }, k), h('td', { class: 'v' }, v === undefined || v === null ? '—' : String(v))));
      });
      opsEl.innerHTML = ''; opsEl.append(String(st.ops), h('small', null, cfg.opsLabel || 'opérations'));
      noteEl.innerHTML = st.note || '';
      if (cfg.viz) cfg.viz(vizEl, st, pv);
    }
    var sp = stepper(function () { return trace.length; }, render, { delay: cfg.delay || 1100 });
    root.appendChild(sp.el);
    return { setTrace: function (t) { sp.stop(); trace = t; sp.go(0); }, el: root };
  }

  /* ---------- Somme d'un tableau : compter les opérations ---------- */
  function sumTrace(n) {
    var t = [4, 7, 1, 9, 3, 6, 2, 8].slice(0, n), tr = [], ops = 0, s;
    function push(line, vars, note) { tr.push({ line: line, vars: vars, ops: ops, note: note, t: t, n: n, i: vars.i }); }
    push(0, { n: n, s: undefined, i: undefined }, 'On appelle <b>somme</b> sur un tableau de ' + n + ' éléments. Aucun calcul encore.');
    ops += 1; s = 0; push(1, { n: n, s: 0, i: undefined }, '<b>s ← 0</b> : 1 opération.');
    for (var i = 0; i < n; i++) {
      ops += 2; push(2, { n: n, s: s, i: i }, i === 0 ? '<b>i ← 0</b> puis test <b>i &lt; n</b> : 2 opérations.' : '<b>i ← i + 1</b> puis test <b>i &lt; n</b> : 2 opérations.');
      ops += 1; s += t[i]; push(3, { n: n, s: s, i: i }, '<b>s ← s + t[' + i + ']</b> : 1 opération. s vaut ' + s + '.');
    }
    ops += 2; push(2, { n: n, s: s, i: n }, 'Dernier passage : <b>i ← i + 1</b> et test faux : 2 opérations. On sort de la boucle.');
    ops += 1; push(4, { n: n, s: s, i: n }, '<b>retourner s</b> : 1 opération. <b>Total : ' + ops + ' = 3×' + n + ' + 4</b>.');
    return tr;
  }
  function sumSim(root) {
    root = $(root);
    var holder = h('div'); root.appendChild(holder);
    var tr = tracer(holder, {
      code: ['fonction somme(t, n):', '    s ← 0', '    pour i de 0 à n-1 faire', '        s ← s + t[i]', '    retourner s'],
      trace: sumTrace(5), opsLabel: 'opérations comptées',
      viz: function (el, st) {
        var cls = {};
        st.t.forEach(function (_, k) { if (st.line >= 2 && k < st.i) cls[k] = 'done'; });
        if (st.line === 3) cls[st.i] = 'cur';
        arrayViz(el, { values: st.t, cls: cls, ptrs: { i: (st.i !== undefined && st.i < st.n) ? st.i : null }, cw: st.n > 6 ? 70 : 82 });
      }
    });
    var row = h('div', { class: 'row', style: 'margin-top:18px' }, h('span', { class: 'small' }, 'Taille de l’entrée n :'));
    [3, 5, 8].forEach(function (n) {
      var b = btn('n = ' + n, function () { tr.setTrace(sumTrace(n)); clearOn(row); b.classList.add('on'); }, n === 5 ? 'on' : '');
      row.appendChild(b);
    });
    root.appendChild(row);
  }

  /* ---------- Jeu : deviner un nombre entre 1 et 100 ---------- */
  function guessTrace(kind, secret, N) {
    var tr = [], lo = 1, hi = N, q = 0, g;
    tr.push({ g: null, lo: 1, hi: N, q: 0, hit: false, text: 'Mon nombre est entre 1 et ' + N + '. Posez vos questions.' });
    while (true) {
      g = kind === 'A' ? q + 1 : Math.floor((lo + hi) / 2); q++;
      if (g === secret) { tr.push({ g: g, lo: lo, hi: hi, q: q, hit: true, text: 'Est-ce <b>' + g + '</b> ? <b class="ok">Oui, trouvé en ' + q + ' question' + (q > 1 ? 's' : '') + ' !</b>' }); break; }
      if (g < secret) { lo = g + 1; tr.push({ g: g, lo: lo, hi: hi, q: q, hit: false, text: 'Est-ce <b>' + g + '</b> ? Non, mon nombre est <b>plus grand</b>.' + (kind === 'B' ? ' On garde seulement ' + lo + ' à ' + hi + '.' : '') }); }
      else { hi = g - 1; tr.push({ g: g, lo: lo, hi: hi, q: q, hit: false, text: 'Est-ce <b>' + g + '</b> ? Non, mon nombre est <b>plus petit</b>. On garde seulement ' + lo + ' à ' + hi + '.' }); }
    }
    return tr;
  }
  function guess(root) {
    root = $(root); root.classList.add('sim', 'flat'); root.style.padding = '0'; root.style.background = 'none'; root.style.border = '0';
    var N = 100, secret = 73;
    var sec = h('input', { type: 'range', min: 1, max: N, value: secret, 'aria-label': 'Nombre secret', oninput: function () { secret = +sec.value; lab.textContent = secret; rebuild(); } });
    var lab = h('b', { class: 'mono acc', style: 'font-size:34px' }, secret);
    var panels = [];
    function panel(kind, title, delay) {
      var strip = h('div', { class: 'strip' }), cells = [];
      for (var i = 1; i <= N; i++) { var c = h('i'); strip.appendChild(c); cells.push(c); }
      var dlg = h('div', { class: 'dlg' }), qc = h('div', { class: 'qcount' });
      var tr = guessTrace(kind, secret, N), sp;
      function render(k) {
        var s = tr[k];
        cells.forEach(function (c, ix) {
          var v = ix + 1, cls = '';
          if (s.hit && v === secret) cls = 'hit';
          else if (s.g === v) cls = 'try';
          else if (v < s.lo || v > s.hi) cls = 'out';
          else cls = 'cand';
          c.className = cls;
        });
        dlg.innerHTML = s.text; qc.innerHTML = ''; qc.append(String(s.q), h('small', null, 'question' + (s.q > 1 ? 's' : '') + ' posée' + (s.q > 1 ? 's' : '')));
      }
      sp = stepper(function () { return tr.length; }, render, { delay: delay, noSpeed: kind === 'A' });
      var box = h('div', { class: 'sim' }, h('div', { class: 'row', style: 'justify-content:space-between;flex-wrap:nowrap;margin-bottom:10px' }, h('h4', { style: 'margin:0;font-size:30px' }, title), qc), strip, h('div', { class: 'strip-lab' }, h('span', null, '1'), h('span', null, '25'), h('span', null, '50'), h('span', null, '75'), h('span', null, '100')), h('div', { style: 'margin-top:10px' }, dlg), sp.el);
      return { box: box, reset: function () { tr = guessTrace(kind, secret, N); sp.stop(); sp.go(0); } };
    }
    var A = panel('A', 'Stratégie A · demander 1, puis 2, puis 3…', 140), B = panel('B', 'Stratégie B · demander toujours le milieu', 1300);
    function rebuild() { A.reset(); B.reset(); }
    root.append(h('div', { class: 'row', style: 'margin-bottom:16px' }, h('span', { class: 'small', style: 'font-size:30px' }, 'Mon nombre secret :'), sec, lab,
      btn('🎲 Au hasard', function () { secret = 1 + Math.floor(Math.random() * N); sec.value = secret; lab.textContent = secret; rebuild(); }, 'sm')), h('div', { class: 'grid2', style: 'flex:none;align-items:start' }, A.box, B.box));
  }

  /* ---------- Tableau trié : deux méthodes, pas à pas séparés ---------- */
  var SORTED = [3, 8, 12, 17, 21, 25, 29, 34, 38, 42, 47, 51, 56, 60, 66, 73];
  function arrTraceA(x) {
    var tr = [{ i: null, q: 0, found: false, text: 'On cherche <b>' + x + '</b>. On commence par la première case.' }], q = 0;
    for (var i = 0; i < SORTED.length; i++) {
      q++; var hit = SORTED[i] === x;
      tr.push({ i: i, q: q, found: hit, text: 'Case ' + i + ' : on lit <b>' + SORTED[i] + '</b>. ' + (hit ? '<b class="ok">C’est ' + x + ' ! Trouvé en ' + q + ' comparaison' + (q > 1 ? 's' : '') + '.</b>' : 'Ce n’est pas ' + x + ', case suivante.') });
      if (hit) return tr;
    }
    tr.push({ i: null, q: q, found: false, done: true, text: 'Toutes les cases sont lues : <b class="bad">' + x + ' est absent</b> (' + q + ' comparaisons).' });
    return tr;
  }
  function arrTraceB(x) {
    var tr = [{ lo: 0, hi: SORTED.length - 1, mid: null, q: 0, found: false, text: 'On cherche <b>' + x + '</b>. Au départ, toutes les cases (0 à 15) sont possibles.' }], lo = 0, hi = SORTED.length - 1, q = 0;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1; q++;
      if (SORTED[mid] === x) { tr.push({ lo: lo, hi: hi, mid: mid, q: q, found: true, text: 'Case du milieu ' + mid + ' : <b>' + SORTED[mid] + '</b>. <b class="ok">C’est ' + x + ' ! Trouvé en ' + q + ' comparaison' + (q > 1 ? 's' : '') + '.</b>' }); return tr; }
      if (SORTED[mid] < x) { tr.push({ lo: lo, hi: hi, mid: mid, q: q, found: false, text: 'Case du milieu ' + mid + ' : <b>' + SORTED[mid] + '</b>, plus petit que ' + x + '. On jette la moitié gauche.' }); lo = mid + 1; }
      else { tr.push({ lo: lo, hi: hi, mid: mid, q: q, found: false, text: 'Case du milieu ' + mid + ' : <b>' + SORTED[mid] + '</b>, plus grand que ' + x + '. On jette la moitié droite.' }); hi = mid - 1; }
    }
    tr.push({ lo: lo, hi: hi, mid: null, q: q, found: false, done: true, text: 'Il ne reste plus aucune case : <b class="bad">' + x + ' est absent</b> (' + q + ' comparaisons).' });
    return tr;
  }
  function race(root) {
    root = $(root); root.classList.add('sim', 'flat'); var target = 56;
    var selEl = h('select', { 'aria-label': 'Valeur cherchée', onchange: function () { target = +selEl.value; A.reset(); B.reset(); } },
      SORTED.map(function (v) { return h('option', { value: v, selected: v === target }, v); }), h('option', { value: 99 }, '99 (absent)'));
    function mk(kind, title) {
      var arr = h('div'), dlg = h('div', { class: 'dlg' }), qc = h('div', { class: 'qcount' }), tr = kind === 'A' ? arrTraceA(target) : arrTraceB(target);
      function render(k) {
        var s = tr[k], cls = {}, ptrs = {};
        if (kind === 'A') {
          for (var i = 0; i < SORTED.length; i++) if (s.i !== null && i < s.i) cls[i] = 'done';
          if (s.i !== null) { cls[s.i] = s.found ? 'found' : 'cur'; ptrs.i = s.i; } else ptrs.i = null;
          if (s.done) for (var j = 0; j < SORTED.length; j++) cls[j] = 'done';
        } else {
          for (var q = 0; q < SORTED.length; q++) cls[q] = (s.mid !== null || s.done) && (q < s.lo || q > s.hi) ? 'out' : (s.mid !== null ? 'range' : '');
          if (s.mid !== null) { cls[s.mid] = s.found ? 'found' : 'cur'; ptrs.milieu = s.mid; ptrs['début'] = s.lo; ptrs.fin = s.hi; }
          if (s.done) for (var z = 0; z < SORTED.length; z++) cls[z] = 'out';
        }
        arrayViz(arr, { values: SORTED, cls: cls, ptrs: ptrs, cw: 76 });
        dlg.innerHTML = s.text; qc.innerHTML = ''; qc.append(String(s.q), h('small', null, 'comparaison' + (s.q > 1 ? 's' : '')));
      }
      var sp = stepper(function () { return tr.length; }, render, { delay: kind === 'A' ? 800 : 1300, noSpeed: true });
      qc.style.fontSize = '40px'; sp.el.style.margin = '0'; dlg.style.minHeight = '48px'; dlg.style.fontSize = '26px';
      var box = h('div', { class: 'sim', style: 'padding:18px 30px' }, h('div', { class: 'row', style: 'justify-content:space-between;flex-wrap:nowrap;margin-bottom:6px;gap:18px' }, h('h4', { style: 'margin:0;font-size:28px;white-space:nowrap' }, title), sp.el, qc), arr, dlg);
      return { box: box, reset: function () { tr = kind === 'A' ? arrTraceA(target) : arrTraceB(target); sp.stop(); sp.go(0); } };
    }
    var A = mk('A', 'Méthode A · une case après l’autre'), B = mk('B', 'Méthode B · on coupe en deux');
    root.append(h('div', { class: 'row', style: 'margin-bottom:14px' }, h('label', null, 'Valeur cherchée', selEl), h('span', { class: 'small' }, 'Tableau trié de 16 cases')), h('div', { class: 'col' }, A.box, B.box));
  }

  /* ---------- Barres comparatives ---------- */
  function raceBars(root) {
    root = $(root); root.classList.add('sim', 'bars');
    var rows = [[16, 16, 4], [1024, 1024, 10], [1e6, 1e6, 20], [1e9, 1e9, 30]], bars = [];
    rows.forEach(function (r) {
      var n = r[0];
      root.append(h('div', { class: 'small', style: 'margin-top:14px' }, 'Tableau de n = ' + fr(n) + ' éléments'));
      var b1 = h('div', { class: 'bar', style: 'width:0' }), b2 = h('div', { class: 'bar b2', style: 'width:0' });
      bars.push([b1, Math.log10(r[1]) / 9 * 100 + 1], [b2, Math.log10(r[2]) / 9 * 100 + 1]);
      root.append(h('div', { class: 'brow' }, h('span', null, 'Méthode A'), b1, h('span', { class: 'val' }, fr(r[1]))));
      root.append(h('div', { class: 'brow' }, h('span', null, 'Méthode B'), b2, h('span', { class: 'val' }, fr(r[2]))));
    });
    root.append(h('div', { class: 'small', style: 'margin-top:12px' }, 'Nombre de comparaisons au pire. Longueur des barres à l’échelle logarithmique.'));
    setTimeout(function () { bars.forEach(function (b) { b[0].style.width = b[1] + '%'; }); }, 400);
  }

  /* ---------- Courbes de croissance ---------- */
  var FUNCS = [
    { id: 'one', lab: '1', f: function () { return 1; }, col: '--c-one' },
    { id: 'log', lab: 'log n', f: function (n) { return Math.log2(n); }, col: '--c-log' },
    { id: 'n', lab: 'n', f: function (n) { return n; }, col: '--c-n' },
    { id: 'nlog', lab: 'n log n', f: function (n) { return n * Math.log2(n); }, col: '--c-nlog' },
    { id: 'n2', lab: 'n²', f: function (n) { return n * n; }, col: '--c-n2' },
    { id: 'n3', lab: 'n³', f: function (n) { return n * n * n; }, col: '--c-n3' },
    { id: 'exp', lab: '2ⁿ', f: function (n) { return Math.pow(2, n); }, col: '--c-exp' }
  ];
  function growth(root) {
    root = $(root); root.classList.add('sim');
    var N = 12, logY = false, on = { log: 1, n: 1, nlog: 1, n2: 1, exp: 1 };
    var W = 1600, H = 520, m = { l: 100, r: 24, t: 16, b: 54 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
    var svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'Courbes de croissance' });
    var lab = h('span', { class: 'big-res', style: 'font-size:38px' }, 'n max = ' + N);
    var rng = h('input', { type: 'range', min: 4, max: 60, value: N, 'aria-label': 'n maximum', oninput: function () { N = +rng.value; lab.textContent = 'n max = ' + N; draw(); } });
    var leg = h('div', { class: 'legend' });
    FUNCS.forEach(function (F) {
      var c = h('button', { class: 'chip' + (on[F.id] ? '' : ' off'), type: 'button', onclick: function () { on[F.id] = on[F.id] ? 0 : 1; c.classList.toggle('off', !on[F.id]); draw(); } }, h('i', { style: 'background:var(' + F.col + ')' }), F.lab);
      leg.appendChild(c);
    });
    var lg = btn('Échelle logarithmique : non', function () { logY = !logY; lg.textContent = 'Échelle logarithmique : ' + (logY ? 'oui' : 'non'); lg.classList.toggle('on', logY); draw(); });
    root.append(svg, leg, h('div', { class: 'ctl' }, rng, lab, lg));
    function draw() {
      svg.innerHTML = '';
      var act = FUNCS.filter(function (F) { return on[F.id]; });
      var X = function (v) { return m.l + (v - 1) / (N - 1) * pw; };
      var yTop, Y;
      if (logY) {
        var mx = Math.max.apply(null, act.map(function (F) { return F.f(N); }).concat([10]));
        yTop = Math.ceil(Math.log10(mx));
        Y = function (v) { return m.t + ph - Math.log10(Math.max(v, 1)) / yTop * ph; };
        var stepE = Math.max(1, Math.ceil(yTop / 6));
        for (var e = 0; e <= yTop; e += stepE) {
          svg.appendChild(sv('line', { x1: m.l, x2: W - m.r, y1: Y(Math.pow(10, e)), y2: Y(Math.pow(10, e)), class: 'gl' }));
          svg.appendChild(sv('text', { x: m.l - 12, y: Y(Math.pow(10, e)) + 7, 'text-anchor': 'end', 'font-size': 24 }, '10' + sup(e)));
        }
      } else {
        var yMax = N * N;
        Y = function (v) { return m.t + ph - v / yMax * ph; };
        for (var g = 0; g <= 4; g++) {
          var v = yMax * g / 4;
          svg.appendChild(sv('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: 'gl' }));
          svg.appendChild(sv('text', { x: m.l - 12, y: Y(v) + 7, 'text-anchor': 'end', 'font-size': 24 }, fr(v)));
        }
      }
      var tk = Math.max(1, Math.round(N / 6));
      for (var x = 1; x <= N; x += tk) svg.appendChild(sv('text', { x: X(x), y: H - 20, 'text-anchor': 'middle', 'font-size': 24 }, x));
      svg.appendChild(sv('text', { x: W - m.r, y: H - 2, 'text-anchor': 'end', 'font-size': 22 }, 'n (taille de l’entrée)'));
      svg.appendChild(sv('text', { x: m.l + 14, y: m.t + 26, 'font-size': 22 }, 'nombre d’opérations'));
      svg.appendChild(sv('line', { x1: m.l, x2: m.l, y1: m.t, y2: m.t + ph, class: 'ax' }));
      svg.appendChild(sv('line', { x1: m.l, x2: W - m.r, y1: m.t + ph, y2: m.t + ph, class: 'ax' }));
      var cid = 'clip' + Math.floor(Math.random() * 1e6);
      svg.appendChild(sv('clipPath', { id: cid }, sv('rect', { x: m.l, y: m.t, width: pw, height: ph })));
      act.forEach(function (F) {
        var d = '';
        for (var i = 0; i <= 200; i++) { var nv = 1 + (N - 1) * i / 200; d += (i ? 'L' : 'M') + X(nv).toFixed(1) + ' ' + Y(F.f(nv)).toFixed(1); }
        svg.appendChild(sv('path', { d: d, fill: 'none', stroke: 'var(' + F.col + ')', 'stroke-width': 5, 'clip-path': 'url(#' + cid + ')', 'stroke-linejoin': 'round' }));
      });
    }
    draw();
  }

  /* ---------- Durées réelles à 10⁹ opérations par seconde ---------- */
  function times(root) {
    root = $(root); root.classList.add('sim');
    var ns = [10, 100, 1000, 1e6, 1e9], nl = ['10', '100', '1 000', '10⁶', '10⁹'];
    var L = [
      ['1', function () { return 0; }], ['log n', function (n) { return Math.log10(Math.log2(n)); }],
      ['n', function (n) { return Math.log10(n); }], ['n log n', function (n) { return Math.log10(n * Math.log2(n)); }],
      ['n²', function (n) { return 2 * Math.log10(n); }], ['n³', function (n) { return 3 * Math.log10(n); }],
      ['2ⁿ', function (n) { return n * Math.log10(2); }]
    ];
    function fmt(ls) {
      if (ls > 8) {
        var ly = ls - Math.log10(3.156e7);
        if (ly < 3) return Math.round(Math.pow(10, ly)) + ' ans';
        return '≈ 10' + sup(Math.round(ly)) + ' ans' + (ly > 10.15 ? ' ✕' : '');
      }
      var s = Math.pow(10, ls);
      if (ls < -9.5) return '< 1 ns';
      if (s < 1e-6) return Math.round(s * 1e9) + ' ns';
      if (s < 1e-3) return Math.round(s * 1e6) + ' µs';
      if (s < 1) return Math.round(s * 1e3) + ' ms';
      if (s < 60) return Math.round(s) + ' s';
      if (s < 3600) return Math.round(s / 60) + ' min';
      if (s < 86400) return Math.round(s / 3600) + ' h';
      if (s < 3.156e7) return Math.round(s / 86400) + ' jours';
      return Math.round(s / 3.156e7) + ' ans';
    }
    function cls(ls) { return ls < 0 ? 't-ok' : (ls < 4.9 ? 't-warn' : 't-bad'); }
    var t = h('table', { class: 'tbl' }, h('tr', null, h('th', null, 'Complexité'), nl.map(function (x) { return h('th', { class: 'num' }, 'n = ' + x); })));
    L.forEach(function (r) {
      t.appendChild(h('tr', null, h('td', { class: 'mono' }, r[0]), ns.map(function (n) { var ls = r[1](n) - 9; return h('td', { class: 'num ' + cls(ls) }, fmt(ls)); })));
    });
    root.append(t, h('div', { class: 'small', style: 'margin-top:14px' }, 'Machine à 10⁹ opérations par seconde. ✕ : plus long que l’âge de l’univers (environ 1,4×10¹⁰ ans).'));
  }

  /* ---------- Famille log n : couper en deux ---------- */
  function halving(root) {
    root = $(root); root.classList.add('sim');
    var p = 6, box = h('div'), lab = h('span', { class: 'mono acc' });
    var rng = h('input', { type: 'range', min: 1, max: 10, value: p, 'aria-label': 'p', oninput: function () { p = +rng.value; draw(); } });
    root.append(box, h('div', { class: 'ctl' }, h('label', null, 'n = 2ᵖ avec p', rng, lab)));
    function draw() {
      var n = Math.pow(2, p); lab.textContent = '= ' + p + '  (n = ' + fr(n) + ')'; box.innerHTML = '';
      var size = n, k = 0, rows = [];
      var bh = p > 8 ? 22 : (p > 6 ? 30 : 42), mg = p > 8 ? 2 : (p > 6 ? 4 : 7), fz = p > 8 ? 21 : (p > 6 ? 25 : 28);
      while (true) {
        var w = Math.max(size / n * 100, 1.5);
        var bar = h('div', { style: 'height:' + bh + 'px;border-radius:8px;background:var(--c-log);width:0;transition:width .7s cubic-bezier(.2,.7,.2,1) ' + (k * 0.12) + 's;display:flex;align-items:center;justify-content:flex-end;padding-right:10px;color:#fff;font:700 ' + Math.min(24, bh - 4) + 'px var(--mono)' }, (size > n / 6 && bh > 26) ? fr(size) : '');
        var row = h('div', { style: 'display:grid;grid-template-columns:230px 1fr 90px;gap:18px;align-items:center;margin:' + mg + 'px 0;font-size:' + fz + 'px' }, h('span', { class: 'muted' }, k === 0 ? 'Départ' : 'Après ' + k + ' coupe' + (k > 1 ? 's' : '')), h('div', null, bar), h('b', { class: 'mono' }, fr(size)));
        box.appendChild(row); rows.push([bar, w]);
        if (size <= 1) break; size = size / 2; k++;
      }
      setTimeout(function () { rows.forEach(function (r) { r[0].style.width = r[1] + '%'; }); }, 40);
      box.appendChild(h('div', { class: 'callout', style: 'margin-top:12px;font-size:30px;padding:16px 28px' }, 'Pour n = ' + fr(n) + ' : ', h('b', null, p + ' coupes'), ' suffisent pour arriver à 1 élément. C’est le logarithme : ', h('b', { class: 'mono' }, 'log₂(' + fr(n) + ') = ' + p)));
    }
    draw();
  }

  /* ---------- Famille n² : poignées de main ---------- */
  function handshake(root) {
    root = $(root); root.classList.add('sim');
    var n = 6, lab = h('span', { class: 'mono acc' }), svgBox = h('div'), info = h('div', { class: 'col' });
    var rng = h('input', { type: 'range', min: 2, max: 12, value: n, 'aria-label': 'n', oninput: function () { n = +rng.value; draw(); } });
    root.append(h('div', { class: 'split even', style: 'align-items:center' }, svgBox, info), h('div', { class: 'ctl' }, h('label', null, 'Nombre de personnes n', rng, lab)));
    function draw() {
      lab.textContent = '= ' + n; svgBox.innerHTML = ''; info.innerHTML = '';
      var S = 520, c = S / 2, R = 210, pts = [];
      var svg = sv('svg', { viewBox: '0 0 ' + S + ' ' + S, width: '100%', role: 'img', 'aria-label': n + ' personnes reliées deux à deux' });
      for (var i = 0; i < n; i++) { var a = -Math.PI / 2 + 2 * Math.PI * i / n; pts.push([c + R * Math.cos(a), c + R * Math.sin(a)]); }
      var k = 0;
      for (var a1 = 0; a1 < n; a1++) for (var b1 = a1 + 1; b1 < n; b1++) {
        var ln = sv('line', { x1: pts[a1][0], y1: pts[a1][1], x2: pts[b1][0], y2: pts[b1][1], stroke: 'var(--c-n2)', 'stroke-width': 3, opacity: 0, style: 'transition:opacity .5s ' + (k * 0.04) + 's' });
        svg.appendChild(ln); setTimeout((function (l) { return function () { l.setAttribute('opacity', .75); }; })(ln), 30); k++;
      }
      pts.forEach(function (p, i) { svg.appendChild(sv('circle', { cx: p[0], cy: p[1], r: 24, fill: 'var(--cover-bg)' })); svg.appendChild(sv('text', { x: p[0], y: p[1] + 8, 'text-anchor': 'middle', 'font-size': 22, style: 'fill:#fff;font-weight:700' }, i + 1)); });
      svg.style.maxHeight = '470px'; svgBox.appendChild(svg);
      var pairs = n * (n - 1) / 2;
      info.append(h('div', { class: 'qcount' }, fr(pairs), h('small', null, 'poignées de main')),
        h('div', { class: 'txt' }, 'Chacune des ', h('b', null, n), ' personnes serre la main des ', h('b', null, n - 1), ' autres, mais une poignée compte pour deux : ', h('b', { class: 'mono' }, n + ' × ' + (n - 1) + ' ÷ 2 = ' + fr(pairs))),
        h('div', { class: 'callout' }, 'Quand n est grand, c’est environ ', h('b', { class: 'mono' }, 'n² ÷ 2'), '. Si n double, le nombre de poignées est multiplié par ', h('b', null, '4'), '.'));
    }
    draw();
  }

  /* ---------- Famille 2ⁿ : sous-ensembles ---------- */
  function subsets(root) {
    root = $(root); root.classList.add('sim');
    var k = 3, lab = h('span', { class: 'mono acc' }), grid = h('div', { style: 'display:flex;flex-wrap:wrap;gap:12px;min-height:200px;align-content:flex-start' }), info = h('div', { class: 'col', style: 'margin-top:16px' });
    var rng = h('input', { type: 'range', min: 1, max: 5, value: k, 'aria-label': 'k', oninput: function () { k = +rng.value; draw(); } });
    root.append(grid, info, h('div', { class: 'ctl' }, h('label', null, 'Nombre d’éléments dans l’ensemble', rng, lab)));
    function draw() {
      var letters = 'ABCDE'.slice(0, k).split(''); lab.textContent = '= ' + k + '  {' + letters.join(', ') + '}'; grid.innerHTML = '';
      var total = Math.pow(2, k);
      for (var mask = 0; mask < total; mask++) {
        var items = letters.filter(function (_, i) { return mask & (1 << i); });
        var chip = h('div', { style: 'border:3px solid var(--blue);background:var(--accent-soft);color:var(--head);border-radius:12px;padding:6px 18px;font:700 28px var(--mono);opacity:0;transform:scale(.7);transition:opacity .45s ' + (mask * 0.04) + 's, transform .45s ' + (mask * 0.04) + 's' }, items.length ? '{' + items.join(', ') + '}' : '∅');
        grid.appendChild(chip); setTimeout((function (c) { return function () { c.style.opacity = 1; c.style.transform = 'none'; }; })(chip), 30);
      }
      info.innerHTML = '';
      info.append(h('div', { class: 'txt' }, 'Chaque élément est ', h('b', null, 'pris ou laissé'), ' : 2 choix. Avec ', h('b', null, k), ' éléments : ', h('b', { class: 'mono' }, '2 × 2 × … × 2 = 2' + sup(k) + ' = ' + fr(total)), ' sous-ensembles.'),
        h('div', { class: 'callout warn' }, 'Chaque élément ajouté ', h('b', null, 'double'), ' le nombre de cas. Avec 10 éléments : ', h('b', null, '1 024'), '. Avec 30 : ', h('b', null, '1 073 741 824'), '. Avec 60 : plus de ', h('b', null, '10¹⁸'), '.'));
    }
    draw();
  }

  /* ---------- Contribution de chaque terme ---------- */
  function contrib(root) {
    root = $(root); root.classList.add('sim');
    var ns = [10, 100, 1000, 10000], cur = 100;
    var terms = [['2n²', function (n) { return 2 * n * n; }, 'var(--c-n2)'], ['50n', function (n) { return 50 * n; }, 'var(--c-n)'], ['1000', function () { return 1000; }, 'var(--c-one)']];
    var bar = h('div', { style: 'display:flex;height:84px;border-radius:16px;overflow:hidden;background:var(--panel)' }), legend = h('div', { class: 'col', style: 'margin-top:20px;gap:12px' }), tot = h('div', { class: 'txt' });
    var segs = terms.map(function (t) { var s = h('div', { style: 'height:100%;width:0;background:' + t[2] + ';transition:width .9s cubic-bezier(.2,.7,.2,1);display:grid;place-items:center;color:#fff;font:800 28px var(--mono);overflow:hidden' }); bar.appendChild(s); return s; });
    var row = h('div', { class: 'row', style: 'margin-bottom:20px' }, h('span', { class: 'small', style: 'font-size:30px' }, 'Taille n :'));
    ns.forEach(function (n) { var b = btn(fr(n), function () { cur = n; clearOn(row); b.classList.add('on'); draw(); }, n === cur ? 'on' : ''); row.appendChild(b); });
    root.append(h('div', { class: 'txt', style: 'margin-bottom:14px' }, 'Programme fictif : ', h('b', { class: 'mono' }, 'T(n) = 2n² + 50n + 1000')), row, bar, legend, tot);
    function draw() {
      var vals = terms.map(function (t) { return t[1](cur); }), sum = vals.reduce(function (a, b) { return a + b; }, 0);
      segs.forEach(function (s, i) { var pct = vals[i] / sum * 100; s.style.width = pct + '%'; s.textContent = pct > 9 ? Math.round(pct) + ' %' : ''; });
      legend.innerHTML = '';
      terms.forEach(function (t, i) { legend.appendChild(h('div', { style: 'display:flex;align-items:center;gap:16px;font-size:30px' }, h('i', { style: 'width:26px;height:26px;border-radius:6px;background:' + t[2] }), h('span', { class: 'mono', style: 'min-width:120px' }, t[0]), h('b', { class: 'mono' }, fr(vals[i])), h('span', { class: 'muted' }, '(' + (vals[i] / sum * 100).toFixed(vals[i] / sum < .01 ? 2 : 1).replace('.', ',') + ' %)'))); });
      tot.innerHTML = 'Total pour n = <b>' + fr(cur) + '</b> : <b class="mono">' + fr(sum) + '</b> opérations.';
    }
    draw();
  }

  /* ---------- Simplification animée d'une expression ---------- */
  function simplify(root) {
    root = $(root); root.classList.add('sim');
    var T = [
      { id: 'a', html: '<span class="co">7</span>n³' }, { id: 'b', html: '<span class="co">100</span>n²' },
      { id: 'c', html: '<span class="co">3</span>n·log n' }, { id: 'd', html: '9' }
    ];
    var expr = h('div', { style: 'font:700 96px var(--serif);color:var(--head);display:flex;align-items:baseline;gap:26px;flex-wrap:wrap;justify-content:center;margin:46px 0 30px' }, h('span', null, 'T(n) ='));
    var els = {};
    T.forEach(function (t, i) {
      if (i) expr.appendChild(h('span', { class: 'plus', style: 'transition:opacity .6s;color:var(--muted)' }, '+'));
      var s = h('span', { html: t.html, style: 'transition:opacity .7s, transform .7s, color .7s;display:inline-block' }); els[t.id] = s; expr.appendChild(s);
    });
    var res = h('span', { style: 'transition:opacity .7s;opacity:0;color:var(--accent)', html: '= Θ(n³)' }); expr.appendChild(res);
    var cap = h('div', { class: 'callout', style: 'min-height:170px;font-size:38px;margin-top:10px' }), rank = h('div', { class: 'row', style: 'justify-content:center;min-height:70px;gap:20px' });
    var steps = [
      { c: 'Voici le coût d’un programme. Il a <b>quatre termes</b>. Lequel pèse vraiment quand n devient grand ?', f: function () { } },
      { c: 'Classons-les du <b>plus rapide à grandir</b> au plus lent : n³, puis n², puis n·log n, puis la constante 9.', f: function () { rank.innerHTML = ''; ['n³ ≫ n²', 'n² ≫ n·log n', 'n·log n ≫ 9'].forEach(function (t) { rank.appendChild(h('span', { class: 'pill navy' }, t)); }); } },
      { c: '<b>Geste 1.</b> On ne garde que le terme dominant : les autres deviennent négligeables quand n est grand.', f: function () { ['b', 'c', 'd'].forEach(function (k) { els[k].style.opacity = .18; els[k].style.transform = 'scale(.85)'; }); [].forEach.call(expr.querySelectorAll('.plus'), function (p) { p.style.opacity = .18; }); } },
      { c: '<b>Geste 2.</b> On supprime la constante multiplicative : 7n³ et n³ ont la même croissance.', f: function () { var co = els.a.querySelector('.co'); co.style.textDecoration = 'line-through'; co.style.opacity = .3; } },
      { c: '<b>Résultat :</b> T(n) = Θ(n³). On lit : « de l’ordre de n au cube ».', f: function () { res.style.opacity = 1; els.a.style.color = 'var(--accent)'; } }
    ];
    function render(k) {
      ['a', 'b', 'c', 'd'].forEach(function (id) { els[id].style.opacity = 1; els[id].style.transform = 'none'; els[id].style.color = ''; });
      [].forEach.call(expr.querySelectorAll('.plus'), function (p) { p.style.opacity = 1; });
      var co = els.a.querySelector('.co'); co.style.textDecoration = 'none'; co.style.opacity = 1; res.style.opacity = 0; rank.innerHTML = '';
      for (var i = 0; i <= k; i++) steps[i].f();
      cap.innerHTML = steps[k].c;
    }
    var sp = stepper(steps.length, render, { delay: 2600, noSpeed: true });
    root.append(expr, rank, cap, sp.el);
  }

  /* ---------- Définition de O et Ω sur un exemple ---------- */
  function bigO(root) {
    root = $(root); root.classList.add('sim');
    var c1 = 3, c2 = 5, NMAX = 12;
    var W = 1600, H = 236, m = { l: 80, r: 20, t: 12, b: 40 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
    var svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'Définition de O et Omega' });
    var out = h('div', { class: 'col', style: 'font-size:30px;margin-top:8px;gap:8px' });
    var chk = h('div', { style: 'margin-top:6px' });
    var f = function (n) { return 3 * n * n + 5 * n + 2; };
    function n0(test) { for (var n = 0; n <= 200; n++) { var ok = true; for (var k = n; k <= 200; k++) if (!test(k)) { ok = false; break; } if (ok) return n; } return null; }
    var s2 = h('input', { type: 'range', min: 3, max: 10, step: 0.5, value: c2, 'aria-label': 'c2', oninput: upd });
    var s1 = h('input', { type: 'range', min: 0.5, max: 4, step: 0.5, value: c1, 'aria-label': 'c1', oninput: upd });
    var l2 = h('span', { class: 'mono acc' }), l1 = h('span', { class: 'mono acc' });
    root.append(svg, h('div', { class: 'ctl', style: 'margin-top:4px' }, h('label', null, 'Plafond c₂', s2, l2), h('label', null, 'Plancher c₁', s1, l1)), chk, out);
    function upd() { c2 = +s2.value; c1 = +s1.value; draw(); }
    function chkTable() {
      var ns = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], t = h('table', { class: 'tbl chk', style: 'font-size:22px;width:100%' });
      t.appendChild(h('tr', null, h('th', null, 'n'), ns.map(function (n) { return h('th', { class: 'num' }, n); })));
      t.appendChild(h('tr', null, h('td', { class: 'mono' }, 'f(n)'), ns.map(function (n) { return h('td', { class: 'num' }, fr(f(n))); })));
      t.appendChild(h('tr', null, h('td', { class: 'mono' }, 'c₂·n²'), ns.map(function (n) { return h('td', { class: 'num' }, fr(c2 * n * n)); })));
      t.appendChild(h('tr', null, h('td', null, 'f ≤ c₂·n² ?'), ns.map(function (n) { var ok = f(n) <= c2 * n * n; return h('td', { class: 'num ' + (ok ? 't-ok' : 't-bad') }, ok ? '✓' : '✗'); })));
      t.appendChild(h('tr', null, h('td', null, 'f ≥ c₁·n² ?'), ns.map(function (n) { var ok = f(n) >= c1 * n * n; return h('td', { class: 'num ' + (ok ? 't-ok' : 't-bad') }, ok ? '✓' : '✗'); })));
      return t;
    }
    function draw() {
      l2.textContent = '= ' + c2; l1.textContent = '= ' + c1;
      svg.innerHTML = '';
      var yMax = Math.max(f(NMAX), c2 * NMAX * NMAX) * 1.05;
      var X = function (v) { return m.l + v / NMAX * pw; }, Y = function (v) { return m.t + ph - v / yMax * ph; };
      var up = n0(function (n) { return f(n) <= c2 * n * n; }), lo = n0(function (n) { return f(n) >= c1 * n * n; });
      if (up !== null && up <= NMAX) svg.appendChild(sv('rect', { x: X(up), y: m.t, width: X(NMAX) - X(up), height: ph, fill: 'var(--accent-soft)' }));
      for (var g = 0; g <= 4; g++) { var v = yMax * g / 4; svg.appendChild(sv('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: 'gl' })); svg.appendChild(sv('text', { x: m.l - 10, y: Y(v) + 7, 'text-anchor': 'end', 'font-size': 24 }, Math.round(v))); }
      for (var x = 0; x <= NMAX; x += 2) svg.appendChild(sv('text', { x: X(x), y: H - 14, 'text-anchor': 'middle', 'font-size': 24 }, x));
      svg.appendChild(sv('line', { x1: m.l, x2: W - m.r, y1: m.t + ph, y2: m.t + ph, class: 'ax' }));
      function path(fn, col, w, dash) { var d = ''; for (var i = 0; i <= 120; i++) { var nv = NMAX * i / 120; d += (i ? 'L' : 'M') + X(nv).toFixed(1) + ' ' + Y(fn(nv)).toFixed(1); } svg.appendChild(sv('path', { d: d, fill: 'none', stroke: col, 'stroke-width': w, 'stroke-dasharray': dash || '' })); }
      path(function (n) { return c2 * n * n; }, 'var(--c-exp)', 4, '12 8');
      path(function (n) { return c1 * n * n; }, 'var(--c-log)', 4, '12 8');
      path(f, 'var(--c-n)', 7);
      svg.appendChild(sv('text', { x: X(NMAX) - 6, y: Y(f(NMAX)) - 14, 'text-anchor': 'end', 'font-size': 26, style: 'fill:var(--c-n);font-weight:700' }, 'f(n) = 3n² + 5n + 2'));
      chk.innerHTML = ''; chk.appendChild(chkTable());
      out.innerHTML = '';
      out.append(
        h('div', null, up === null ? h('span', { class: 'bad' }, 'c₂ = ' + c2 + ' est trop petit : aucun n₀ ne convient, f dépasse toujours c₂·n².') : [h('span', { class: 'ok' }, 'f(n) ≤ ' + c2 + '·n² dès n₀ = ' + up), ' donc f = O(n²).']),
        h('div', null, lo === null ? h('span', { class: 'bad' }, 'c₁ = ' + c1 + ' est trop grand : f passe sous c₁·n².') : [h('span', { class: 'ok' }, 'f(n) ≥ ' + c1 + '·n² dès n₀ = ' + lo), ' donc f = Ω(n²).']),
        (up !== null && lo !== null) ? h('div', { class: 'callout good', style: 'font-size:32px;padding:14px 28px' }, 'Les deux bornes existent : f = Θ(n²).') : null);
    }
    draw();
  }

  /* ---------- Meilleur, moyen, pire cas ---------- */
  function casesSim(root) {
    root = $(root);
    var A = [14, 3, 27, 9, 21, 6, 18, 11];
    function mk(x) {
      var tr = [], ops = 0, n = A.length;
      tr.push({ line: 0, vars: { x: x, i: undefined }, ops: 0, note: 'On cherche <b>x = ' + x + '</b> dans un tableau de ' + n + ' éléments.', i: undefined, found: -1 });
      for (var i = 0; i < n; i++) {
        ops++; var hit = A[i] === x;
        tr.push({ line: 1, vars: { x: x, i: i }, ops: ops, note: 'Comparaison <b>t[' + i + '] = x</b> : ' + A[i] + (hit ? ' = ' : ' ≠ ') + x + (hit ? ' ✔ trouvé.' : '.'), i: i, found: hit ? i : -1 });
        if (hit) { tr.push({ line: 1, vars: { x: x, i: i }, ops: ops, note: '<b>retourner ' + i + '</b> après <b>' + ops + '</b> comparaison' + (ops > 1 ? 's' : '') + '.', i: i, found: i }); return tr; }
      }
      tr.push({ line: 2, vars: { x: x, i: undefined }, ops: ops, note: 'Tout le tableau est parcouru : <b>retourner -1</b> après <b>' + ops + '</b> comparaisons.', i: n, found: -1 });
      return tr;
    }
    var holder = h('div');
    var tr = tracer(holder, {
      code: ['fonction chercher(t, n, x):', '    pour i de 0 à n-1 faire  // si t[i] = x : retourner i', '    retourner -1'], trace: mk(14), opsLabel: 'comparaisons',
      viz: function (el, st) {
        var cls = {};
        A.forEach(function (_, k) { if (st.i !== undefined && k < st.i) cls[k] = 'done'; });
        if (st.i !== undefined && st.i < A.length) cls[st.i] = st.found >= 0 ? 'found' : 'cur';
        arrayViz(el, { values: A, cls: cls, ptrs: { i: (st.i !== undefined && st.i < A.length) ? st.i : null }, cw: 84 });
      }
    });
    root.appendChild(holder);
    var row = h('div', { class: 'row', style: 'margin-top:18px' });
    [['Meilleur cas : x en 1ʳᵉ case', 14], ['Cas moyen : x au milieu', 21], ['Pire cas : x absent', 99]].forEach(function (c, k) {
      var b = btn(c[0], function () { tr.setTrace(mk(c[1])); clearOn(row); b.classList.add('on'); }, k === 0 ? 'on' : '');
      row.appendChild(b);
    });
    root.appendChild(row);
  }

    /* ---------- Boucles : le code, les variables et la grille avancent ensemble ---------- */
  function loops(root) {
    root = $(root); root.classList.add('sim');
    var kinds = {
      simple: { code: ['pour i de 1 à n faire', '    opération()'], f: function (n) { return n; }, tx: 'n', max: 12, def: 6 },
      double: { code: ['pour i de 1 à n faire', '  pour j de 1 à n faire', '    opération()'], f: function (n) { return n * n; }, tx: 'n × n = n²', max: 8, def: 4 },
      tri: { code: ['pour i de 1 à n faire', '  pour j de 1 à i faire', '    opération()'], f: function (n) { return n * (n + 1) / 2; }, tx: 'n(n+1)/2', max: 8, def: 4 },
      log: { code: ['i ← 1', 'tant que i ≤ n faire', '    opération()', '    i ← 2 × i'], f: function (n) { return Math.floor(Math.log2(n)) + 1; }, tx: '⌊log₂ n⌋ + 1', max: 64, def: 16 }
    };
    var kind = 'double', n = 4, trace = [], cells = [], cellEls = [], cb;
    var codeHold = h('div'), gridEl = h('div'), varsEl = h('table', { class: 'vars' }), noteEl = h('div', { class: 'note', style: 'min-height:96px;font-size:28px' }), opsEl = h('div', { class: 'ops' });
    var lab = h('span', { class: 'mono acc' });
    var rng = h('input', { type: 'range', min: 1, max: 8, value: n, 'aria-label': 'n', oninput: function () { n = +rng.value; rebuild(); } });
    var kindSel = h('select', { 'aria-label': 'Type de boucle', onchange: function () { kind = kindSel.value; var K = kinds[kind]; rng.max = K.max; n = K.def; rng.value = n; rebuild(); } },
      h('option', { value: 'simple' }, 'Une boucle'), h('option', { value: 'double', selected: true }, 'Deux boucles imbriquées'), h('option', { value: 'tri' }, 'Boucle interne bornée par i'), h('option', { value: 'log' }, 'Variable doublée'));
    function build() {
      var K = kinds[kind], t = [], count = 0, i, a, b;
      cells = []; lab.textContent = '= ' + n;
      t.push({ line: -1, i: null, j: null, count: 0, cell: -1, note: 'Prêt. On va exécuter ce programme pour <b>n = ' + n + '</b>. Chaque case de la grille représente <b>une exécution</b> de opération().' });
      if (kind === 'simple') {
        for (i = 1; i <= n; i++) {
          t.push({ line: 0, i: i, j: null, count: count, cell: -1, note: 'La boucle donne <b>i = ' + i + '</b>.' });
          cells.push([i, 1]); count++;
          t.push({ line: 1, i: i, j: null, count: count, cell: count - 1, note: '<b>opération()</b> s’exécute. Compteur : ' + count + '.' });
        }
      } else if (kind === 'double' || kind === 'tri') {
        for (a = 1; a <= n; a++) {
          t.push({ line: 0, i: a, j: null, count: count, cell: -1, note: 'La boucle extérieure donne <b>i = ' + a + '</b>.' });
          var jm = kind === 'double' ? n : a;
          for (b = 1; b <= jm; b++) {
            t.push({ line: 1, i: a, j: b, count: count, cell: -1, note: 'La boucle intérieure donne <b>j = ' + b + '</b> (j va de 1 à ' + (kind === 'double' ? 'n = ' + n : 'i = ' + a) + ').' });
            cells.push([a, b]); count++;
            t.push({ line: 2, i: a, j: b, count: count, cell: count - 1, note: '<b>opération()</b> s’exécute pour (i, j) = (' + a + ', ' + b + '). Compteur : ' + count + '.' });
          }
        }
      } else {
        var v = 1;
        t.push({ line: 0, i: 1, j: null, count: 0, cell: -1, note: '<b>i ← 1</b>.' });
        while (true) {
          var ok = v <= n;
          t.push({ line: 1, i: v, j: null, count: count, cell: -1, note: 'Test <b>i ≤ n</b> : ' + v + ' ≤ ' + n + ' ? <b>' + (ok ? 'vrai' : 'faux, la boucle s’arrête') + '</b>.' });
          if (!ok) break;
          cells.push([v, 1]); count++;
          t.push({ line: 2, i: v, j: null, count: count, cell: count - 1, note: '<b>opération()</b> s’exécute. Compteur : ' + count + '.' });
          t.push({ line: 3, i: 2 * v, j: null, count: count, cell: -1, note: '<b>i ← 2 × i</b> : i vaut maintenant ' + (2 * v) + '.' });
          v *= 2;
        }
      }
      t.push({ line: -1, i: null, j: null, count: count, cell: -1, note: 'Terminé : <b>' + count + '</b> exécutions pour n = ' + n + '. Formule : <b>' + K.tx + '</b>.' });
      trace = t;
      cb = codeBlock(K.code); codeHold.innerHTML = ''; codeHold.appendChild(cb.el);
      // grille
      gridEl.innerHTML = ''; cellEls = [];
      var g;
      if (kind === 'simple') {
        g = h('div', { class: 'grid-loop', style: 'grid-template-columns:repeat(' + Math.min(n, 6) + ',72px)' });
        cells.forEach(function (c) { var e = h('div', { class: 'gc', style: 'width:72px;height:72px' }, c[0]); g.appendChild(e); cellEls.push(e); });
      } else if (kind === 'log') {
        g = h('div', { class: 'grid-loop', style: 'grid-template-columns:repeat(' + Math.min(cells.length, 4) + ',auto)' });
        cells.forEach(function (c) { var e = h('div', { class: 'gc', style: 'width:auto;height:72px;padding:0 18px;min-width:96px;font-size:26px' }, 'i = ' + c[0]); g.appendChild(e); cellEls.push(e); });
      } else {
        var sz = n > 6 ? 62 : 80;
        g = h('div', { class: 'grid-loop', style: 'grid-template-columns:repeat(' + n + ',' + sz + 'px)' });
        var pos = {}; cells.forEach(function (c, ix) { pos[c[0] + ',' + c[1]] = ix; });
        for (a = 1; a <= n; a++) for (b = 1; b <= n; b++) {
          var ix = pos[a + ',' + b], e;
          if (ix === undefined) e = h('div', { class: 'gc skip', style: 'width:' + sz + 'px;height:' + sz + 'px' });
          else { e = h('div', { class: 'gc', style: 'width:' + sz + 'px;height:' + sz + 'px;font-size:20px' }, a + ',' + b); cellEls[ix] = e; }
          g.appendChild(e);
        }
      }
      gridEl.appendChild(g);
      if (kind !== 'simple' && kind !== 'log') gridEl.appendChild(h('div', { class: 'small', style: 'margin-top:10px' }, 'Chaque case porte le couple (i, j) de son exécution.'));
    }
    function render(k) {
      var st = trace[k], K = kinds[kind];
      cb.lines.forEach(function (l, ix) { l.classList.toggle('hl', ix === st.line); });
      varsEl.innerHTML = '';
      [['i', st.i], ['j', st.j]].forEach(function (p) { if (p[0] === 'j' && (kind === 'simple' || kind === 'log')) return; varsEl.appendChild(h('tr', null, h('td', { class: 'n' }, p[0]), h('td', { class: 'v' }, p[1] === null ? '—' : String(p[1])))); });
      opsEl.innerHTML = ''; opsEl.append(String(st.count), h('small', null, 'exécutions de opération()'));
      noteEl.innerHTML = st.note;
      cellEls.forEach(function (e, ix) { e.className = 'gc' + (ix < st.count ? (ix === st.cell ? ' cur' : ' on') : ''); });
    }
    build();
    var sp = stepper(function () { return trace.length; }, render, { delay: 260 });
    function rebuild() { build(); sp.reset(); }
    root.append(h('div', { class: 'split even', style: 'align-items:start;gap:44px' }, h('div', { class: 'col', style: 'gap:14px' }, codeHold, varsEl, opsEl, noteEl), gridEl),
      h('div', { class: 'ctl' }, h('label', null, 'Boucle', kindSel), h('label', null, 'n', rng, lab)), sp.el);
    sp.go(0);
  }

  /* ---------- Calcul à la main : une seule colonne, la valeur remonte jusqu'en haut ---------- */
  function hand(root) {
    root = $(root); root.classList.add('sim');
    var N = 4, fv = function (m) { return m <= 1 ? 1 : m * fv(m - 1); };
    var wrap = h('div', { style: 'position:relative;min-height:380px' }), rows = [], tok = 0;
    var banner = h('div', { style: 'border-radius:16px;padding:12px 24px;font-size:27px;font-weight:700;margin-bottom:12px;transition:background .5s,color .5s' });
    var note = h('div', { class: 'note', style: 'font-size:29px;min-height:84px;margin-top:6px' });
    var fly = h('div', { style: 'position:absolute;left:0;top:0;padding:4px 18px;border-radius:12px;background:var(--ok);color:#fff;font:800 36px var(--mono);opacity:0;z-index:3;pointer-events:none' }, '');
    var list = h('div');
    for (var i = 0; i <= N; i++) {
      (function (i) {
        var m = N - i;
        var row = h('div', { style: 'margin:0 0 8px ' + (i * 58) + 'px;display:flex;align-items:center;gap:14px;font:600 34px var(--mono);color:var(--head);padding:7px 20px;border:3px solid var(--line);border-radius:16px;background:var(--surface);width:fit-content;opacity:0;transform:translateX(-30px);transition:opacity .6s, transform .6s cubic-bezier(.2,.7,.2,1), border-color .5s, background .5s' });
        if (i > 0) row.appendChild(h('span', { style: 'color:var(--blue);font-size:34px' }, '↳'));
        row.appendChild(h('span', null, 'fact(' + m + ')'));
        row._m = m;
        if (m > 0) {
          row.appendChild(h('span', { style: 'color:var(--muted)' }, '= ' + m + ' ×'));
          var hole = h('span', { style: 'border:3px dashed var(--blue);border-radius:12px;padding:0 14px;min-width:120px;text-align:center;color:var(--blue);transition:background .4s, color .4s, border-color .4s' }, 'fact(' + (m - 1) + ')');
          var res = h('span', { style: 'opacity:0;transition:opacity .5s;color:var(--ok);font-weight:800' }, '= ' + m + ' × ' + fv(m - 1) + ' = ' + fv(m));
          row.append(hole, res); row._hole = hole; row._res = res;
        } else {
          var base = h('span', { style: 'color:var(--ok);font-weight:800;background:var(--ok-soft);border-radius:12px;padding:0 16px' }, '= 1');
          row.append(base, h('span', { class: 'small', style: 'font-family:var(--font);color:var(--warn);font-weight:700;font-size:25px' }, 'cas de base'));
          row._res = base;
        }
        rows.push(row); list.appendChild(row);
      })(i);
    }
    wrap.append(list, fly);
    function pos(el) { var a = el.getBoundingClientRect(), b = wrap.getBoundingClientRect(), s = b.width / wrap.offsetWidth || 1; return { x: (a.left - b.left) / s, y: (a.top - b.top) / s, w: a.width / s, h: a.height / s }; }
    function fill(L, anim) {
      var r = rows[L], m = r._m;
      r._hole.textContent = fv(m - 1); r._hole.style.background = 'var(--ok-soft)'; r._hole.style.color = 'var(--ok)'; r._hole.style.borderColor = 'var(--ok)'; r._hole.style.borderStyle = 'solid';
      r._res.style.opacity = 1; r.style.borderColor = 'var(--ok)'; r.style.background = 'var(--ok-soft)';
    }
    function reset(L) {
      var r = rows[L], m = r._m;
      r._hole.textContent = 'fact(' + (m - 1) + ')'; r._hole.style.background = 'transparent'; r._hole.style.color = 'var(--blue)'; r._hole.style.borderColor = 'var(--blue)'; r._hole.style.borderStyle = 'dashed';
      r._res.style.opacity = 0; r.style.borderColor = 'var(--blue)'; r.style.background = 'var(--accent-soft)';
    }
    function render(k) {
      var my = ++tok, shown = Math.min(k, N);
      fly.style.opacity = 0;
      rows.forEach(function (r, i) {
        var vis = i <= shown; r.style.opacity = vis ? 1 : 0; r.style.transform = vis ? 'none' : 'translateX(-30px)';
        if (i === N) { r.style.borderColor = k >= N ? 'var(--warn)' : 'var(--line)'; r.style.background = k >= N ? 'var(--warn-soft)' : 'var(--surface)'; }
        else if (vis) reset(i); else { r.style.borderColor = 'var(--line)'; r.style.background = 'var(--surface)'; }
      });
      var anim = null;
      for (var t = 1; t <= N; t++) {
        var L = N - t;
        if (k > N + t) fill(L);
        else if (k === N + t) anim = L;
      }
      if (anim !== null) {
        var L2 = anim, src = rows[L2 + 1]._res, tgt = rows[L2]._hole, s = pos(src), d = pos(tgt);
        fly.textContent = fv(rows[L2]._m - 1);
        fly.style.transition = 'none'; fly.style.transform = 'translate(' + s.x + 'px,' + s.y + 'px)'; fly.style.opacity = 1;
        void fly.offsetWidth;
        fly.style.transition = 'transform 1s cubic-bezier(.4,0,.2,1), opacity .3s'; fly.style.transform = 'translate(' + (d.x + 14) + 'px,' + d.y + 'px)';
        setTimeout(function () { if (my !== tok) return; fill(L2); fly.style.opacity = 0; }, 1050);
      }
      var ph, bg, fg, msg;
      if (k < N) { ph = '① DESCENTE · chaque appel attend la réponse du suivant'; bg = 'var(--accent-soft)'; fg = 'var(--accent)'; var mm = N - k; msg = k === 0 ? 'Pour calculer <b>fact(' + N + ')</b>, on a besoin de <b>fact(' + (N - 1) + ')</b>. On l’appelle et <b>on attend</b> sa réponse.' : '<b>fact(' + (mm + 1) + ')</b> attend toujours. Pour répondre, <b>fact(' + mm + ')</b> a besoin de <b>fact(' + (mm - 1) + ')</b>.'; }
      else if (k === N) { ph = '② CAS DE BASE · la descente s’arrête'; bg = 'var(--warn-soft)'; fg = 'var(--warn)'; msg = '<b>fact(0)</b> connaît sa réponse sans rien appeler : <b>1</b>. C’est le tournant : <b>les réponses vont maintenant remonter</b>.'; }
      else if (k <= 2 * N) { var t2 = k - N, Ls = N - t2, v = fv(rows[Ls]._m - 1), res = fv(rows[Ls]._m); ph = '③ REMONTÉE · la réponse rejoint l’appel qui attendait'; bg = 'var(--ok-soft)'; fg = 'var(--ok)'; msg = 'La réponse <b>' + v + '</b> monte vers <b>fact(' + rows[Ls]._m + ')</b>, qui attendait. Il peut enfin calculer <b>' + rows[Ls]._m + ' × ' + v + ' = ' + res + '</b>.'; }
      else { ph = '✔ RÉSULTAT'; bg = 'var(--ok-soft)'; fg = 'var(--ok)'; msg = 'La réponse est arrivée tout en haut : <b>fact(' + N + ') = ' + fv(N) + '</b>. Chaque appel a reçu la réponse de celui du dessous.'; }
      banner.textContent = ph; banner.style.background = bg; banner.style.color = fg; note.innerHTML = msg;
    }
    var sp = stepper(2 * N + 2, render, { delay: 2300, noSpeed: true });
    root.append(banner, wrap, note, sp.el);
  }

  /* ---------- Fusionner deux paquets triés ---------- */
  function mergeStep(root) {
    root = $(root); root.classList.add('sim');
    var A = [1, 2, 5, 8], B = [3, 4, 7, 9], tr = [], i = 0, j = 0, out = [], q = 0;
    tr.push({ i: 0, j: 0, out: [], q: 0, hl: null, txt: 'Deux paquets <b>déjà triés</b>. On veut un seul paquet trié. On ne regarde que le <b>premier</b> élément de chaque paquet.' });
    while (i < A.length && j < B.length) {
      q++;
      tr.push({ i: i, j: j, out: out.slice(), q: q, hl: { a: i, b: j }, txt: 'On compare <b>' + A[i] + '</b> (paquet A) et <b>' + B[j] + '</b> (paquet B).' });
      if (A[i] <= B[j]) { out.push(A[i]); i++; tr.push({ i: i, j: j, out: out.slice(), q: q, hl: { win: 'A', ix: i - 1 }, txt: '<b>' + out[out.length - 1] + '</b> est le plus petit : il passe dans le résultat. On avance dans le paquet A.' }); }
      else { out.push(B[j]); j++; tr.push({ i: i, j: j, out: out.slice(), q: q, hl: { win: 'B', ix: j - 1 }, txt: '<b>' + out[out.length - 1] + '</b> est le plus petit : il passe dans le résultat. On avance dans le paquet B.' }); }
    }
    while (i < A.length) { out.push(A[i]); i++; tr.push({ i: i, j: j, out: out.slice(), q: q, hl: { win: 'A', ix: i - 1 }, txt: 'Le paquet B est vide : on recopie <b>' + out[out.length - 1] + '</b> sans comparer.' }); }
    while (j < B.length) { out.push(B[j]); j++; tr.push({ i: i, j: j, out: out.slice(), q: q, hl: { win: 'B', ix: j - 1 }, txt: 'Le paquet A est vide : on recopie <b>' + out[out.length - 1] + '</b> sans comparer.' }); }
    tr[tr.length - 1].txt += ' <b>Terminé :</b> chaque nombre a été déplacé une seule fois, donc fusionner n nombres coûte <b>au plus n opérations</b>.';
    var ea = h('div'), eb = h('div'), eo = h('div'), cnt = h('div', { class: 'ops' }), note = h('div', { class: 'note', style: 'font-size:30px;min-height:96px' });
    function lab(t) { return h('div', { class: 'small', style: 'margin:8px 0 2px;font-weight:700;color:var(--head)' }, t); }
    function render(k) {
      var s = tr[k], ca = {}, cbb = {}, co = {}, x;
      for (x = 0; x < A.length; x++) if (x < s.i) ca[x] = 'done';
      for (x = 0; x < B.length; x++) if (x < s.j) cbb[x] = 'done';
      if (s.hl && s.hl.a !== undefined) { ca[s.hl.a] = 'cur'; cbb[s.hl.b] = 'cur'; }
      if (s.hl && s.hl.win === 'A') ca[s.hl.ix] = 'found';
      if (s.hl && s.hl.win === 'B') cbb[s.hl.ix] = 'found';
      var ov = []; for (x = 0; x < A.length + B.length; x++) { ov.push(x < s.out.length ? s.out[x] : '·'); if (x < s.out.length) co[x] = 'found'; }
      arrayViz(ea, { values: A, cls: ca, ptrs: { i: s.i < A.length ? s.i : null }, cw: 84 });
      arrayViz(eb, { values: B, cls: cbb, ptrs: { j: s.j < B.length ? s.j : null }, cw: 84 });
      arrayViz(eo, { values: ov, cls: co, ptrs: {}, cw: 84 });
      cnt.innerHTML = ''; cnt.append(String(s.q), h('small', null, 'comparaisons · ' + s.out.length + ' / ' + (A.length + B.length) + ' nombres placés'));
      note.innerHTML = s.txt;
    }
    root.append(h('div', { class: 'split even', style: 'align-items:start;gap:44px' }, h('div', null, lab('Paquet A (trié)'), ea, lab('Paquet B (trié)'), eb), h('div', null, lab('Résultat (trié)'), eo, cnt, note)));
    var sp = stepper(tr.length, render, { delay: 1500 });
    root.appendChild(sp.el);
  }

  /* ---------- Tri fusion : on coupe jusqu'au bout, puis on recolle ---------- */
  function mergeAnim(root) {
    root = $(root); root.classList.add('sim');
    var VALS = [5, 2, 8, 1, 9, 3, 7, 4], p = 3, n = 8, levels = [];
    var banner = h('div', { style: 'border-radius:16px;padding:10px 22px;font-size:28px;font-weight:700;margin-bottom:12px;transition:background .5s,color .5s' });
    var cap = h('div', { class: 'callout', style: 'min-height:128px;font-size:31px;margin-top:12px' }), box = h('div');
    for (var d = 0; d <= p; d++) {
      (function (d) {
        var cnt = Math.pow(2, d), size = n / cnt;
        var row = h('div', { style: 'display:grid;grid-template-columns:1fr 440px;gap:22px;align-items:center;margin:6px 0;opacity:0;transform:translateY(-14px);transition:opacity .7s, transform .7s cubic-bezier(.2,.7,.2,1)' });
        var cells = h('div', { style: 'display:grid;grid-template-columns:repeat(' + cnt + ',1fr);gap:8px' }), bx = [];
        for (var i = 0; i < cnt; i++) { var e = h('div', { style: 'border:3px solid var(--blue);background:var(--accent-soft);color:var(--head);border-radius:12px;text-align:center;font:700 28px var(--mono);padding:8px 0;white-space:nowrap;overflow:hidden;transition:background .6s, border-color .6s, color .6s' }, VALS.slice(i * size, (i + 1) * size).join(' ')); cells.appendChild(e); bx.push(e); }
        var cost = h('div', { style: 'font-size:25px;line-height:1.3;opacity:0;transition:opacity .7s' });
        row.append(cells, cost); box.appendChild(row); levels.push({ row: row, bx: bx, cost: cost, cnt: cnt, size: size });
      })(d);
    }
    function render(k) {
      levels.forEach(function (L, d) {
        var vis = d <= Math.min(k, p), sorted = k >= (6 - d) && (d < p ? true : k >= p);
        L.row.style.opacity = vis ? 1 : 0; L.row.style.transform = vis ? 'none' : 'translateY(-14px)';
        L.bx.forEach(function (e, i) {
          var slice = VALS.slice(i * L.size, (i + 1) * L.size), txt = (sorted ? slice.slice().sort(function (a, b) { return a - b; }) : slice).join(' ');
          e.textContent = txt; e.style.background = sorted ? 'var(--ok-soft)' : 'var(--accent-soft)'; e.style.borderColor = sorted ? 'var(--ok)' : 'var(--blue)'; e.style.color = sorted ? 'var(--ok)' : 'var(--head)';
        });
        var showCost = d < p && k >= 6 - d;
        L.cost.style.opacity = showCost ? 1 : 0;
        L.cost.innerHTML = d < p ? L.cnt + ' fusion' + (L.cnt > 1 ? 's' : '') + ' de deux paquets de ' + (L.size / 2) + ' : <b class="acc">' + n + ' opérations</b> au plus' : '';
      });
      var ph, bg, fg, t;
      if (k <= p) { ph = '① DIVISER · on coupe en deux, encore et encore'; bg = 'var(--accent-soft)'; fg = 'var(--accent)'; }
      else { ph = '② COMBINER · on recolle deux paquets triés en un paquet trié'; bg = 'var(--ok-soft)'; fg = 'var(--ok)'; }
      var T = [
        'On part d’un paquet de <b>8 nombres dans le désordre</b>.',
        '<b>Diviser :</b> on coupe le paquet en deux moitiés de 4 nombres.',
        'On recommence sur chaque moitié : quatre paquets de <b>2 nombres</b>.',
        'On coupe encore : huit paquets d’<b>un seul nombre</b>. Un seul nombre est déjà trié : c’est le <b>cas de base</b>, on ne divise plus.',
        '<b>Combiner :</b> on fusionne les paquets deux à deux (comme à la diapositive précédente) : quatre paquets <b>triés</b> de 2 nombres.',
        'On fusionne encore : deux paquets triés de <b>4 nombres</b>.',
        'Dernière fusion : un seul paquet <b>trié de 8 nombres</b>. Terminé ! Chaque niveau de fusion a coûté au plus 8 opérations.'
      ];
      banner.textContent = ph; banner.style.background = bg; banner.style.color = fg; cap.innerHTML = T[k];
    }
    var sp = stepper(7, render, { delay: 2300, noSpeed: true });
    root.append(banner, box, cap, sp.el);
  }

/* ---------- Récursivité : appels qui descendent, résultats qui remontent ---------- */
  function factAnim(root, opts) {
    root = $(root); root.classList.add('sim');
    var N = 4, mode = (opts && opts.mode) || 'base', cards = [], dArrows = [], uArrows = [], events = [];
    var fv = function (n) { return n <= 1 ? 1 : n * fv(n - 1); };
    var left = h('div', { class: 'col', style: 'flex:0 0 640px' });
    var codeB, codeHold = h('div'), LN = { rec: 2 };
    var phase = h('div', { style: 'border-radius:16px;padding:12px 20px;font-size:27px;font-weight:700;transition:background .6s, color .6s;text-align:center' });
    var counters = h('div', { class: 'row', style: 'gap:30px' });
    var note = h('div', { class: 'note', style: 'font-size:29px;min-height:130px' });
    var toggle = btn(mode === 'base' ? 'Retirer le cas de base' : 'Remettre le cas de base', function () { mode = mode === 'base' ? 'nobase' : 'base'; toggle.textContent = mode === 'base' ? 'Retirer le cas de base' : 'Remettre le cas de base'; toggle.classList.toggle('on', mode === 'nobase'); build(); sp.reset(); }, 'sm' + (mode === 'nobase' ? ' on' : ''));
    left.append(codeHold, phase, counters, note, h('div', null, toggle));
    var right = h('div', { style: 'flex:1;min-width:0;position:relative' });
    var wrap = h('div', { class: 'row', style: 'align-items:flex-start;gap:36px;flex-wrap:nowrap' });
    wrap.append(left, right);
    var sp;
    build();
    sp = stepper(function () { return events.length; }, render, { delay: 1500 });
    root.append(wrap, sp.el);
    function build() {
      var count = mode === 'base' ? N + 1 : 6, big = mode === 'base';
      var cpad = big ? '11px 24px' : '7px 20px', cf = big ? 34 : 30, ah = big ? 46 : 38, lf = big ? 24 : 21;
      right.innerHTML = ''; cards = []; dArrows = []; uArrows = []; events = [];
      LN = { rec: mode === 'base' ? 2 : 1 };
      codeB = codeBlock(mode === 'base' ? ['fonction fact(n):', '    si n = 0 alors retourner 1', '    retourner n × fact(n-1)'] : ['fonction fact(n):', '    retourner n × fact(n-1)']);
      codeHold.innerHTML = ''; codeHold.appendChild(codeB.el);
      var col = h('div', { style: 'display:flex;flex-direction:column;align-items:stretch' });
      for (var i = 0; i < count; i++) {
        var nn = N - i;
        var st = h('span', { style: 'font:500 ' + (big ? 26 : 22) + 'px var(--font);color:var(--muted);transition:opacity .5s' }, '');
        var card = h('div', { style: 'border:3px solid var(--line);background:var(--surface);border-radius:14px;padding:' + cpad + ';display:flex;justify-content:space-between;align-items:center;gap:20px;opacity:0;transform:translateY(-26px) scale(.96);transition:opacity .6s, transform .6s cubic-bezier(.2,.7,.2,1), border-color .5s, background .5s' }, h('b', { style: 'font:700 ' + cf + 'px var(--mono);color:var(--head)' }, 'fact(' + nn + ')'), st);
        card._st = st; col.appendChild(card); cards.push(card);
        if (i < count - 1) {
          var d = h('div', { style: 'display:flex;align-items:center;gap:12px;opacity:0;transition:opacity .6s, transform .6s;transform:translateY(-10px);color:var(--c-n);font:700 ' + lf + 'px var(--font)' }, h('span', { style: 'font-size:' + (lf + 12) + 'px;line-height:1' }, '↓'), h('span', null, 'appelle fact(' + (nn - 1) + ')'));
          var u = h('div', { style: 'display:flex;align-items:center;gap:12px;opacity:0;transition:opacity .6s, transform .6s;transform:translateY(10px);color:var(--ok);font:700 ' + lf + 'px var(--font);justify-content:flex-end' }, h('span', null, mode === 'base' ? 'rend ' + fv(nn - 1) : ''), h('span', { style: 'font-size:' + (lf + 12) + 'px;line-height:1' }, '↑'));
          var ar = h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;height:' + ah + 'px;align-items:center;padding:0 28px' }, d, u);
          col.appendChild(ar); dArrows.push(d); uArrows.push(u);
        }
      }
      right.appendChild(col);
      events.push({ k: 'call', i: 0, line: 0, t: 'On appelle <b>fact(' + N + ')</b>. Une première fiche est posée sur la pile.' });
      for (var j = 1; j < count; j++) events.push({ k: 'call', i: j, line: LN.rec, t: '<b>fact(' + (N - j + 1) + ')</b> ne peut pas répondre seule : elle a besoin de <b>fact(' + (N - j) + ')</b>. Nouvel appel, nouvelle fiche, la précédente <b>attend</b>.' });
      if (mode === 'base') {
        events.push({ k: 'base', i: count - 1, line: 1, t: '<b>n = 0</b> : c’est le <b>cas de base</b>. Cet appel sait répondre sans en refaire un autre : il rend <b>1</b>.' });
        for (var r = count - 2; r >= 0; r--) { var nr = N - r; events.push({ k: 'ret', i: r, line: 2, t: 'La réponse <b>' + fv(nr - 1) + '</b> remonte. <b>fact(' + nr + ')</b> calcule <b>' + nr + ' × ' + fv(nr - 1) + ' = ' + fv(nr) + '</b> et la rend à son tour.' }); }
        events.push({ k: 'end', i: 0, line: -1, t: 'Terminé : <b>fact(' + N + ') = ' + fv(N) + '</b>. Les fiches sont retirées de la pile une à une.' });
      } else {
        events.push({ k: 'over', i: count - 1, line: LN.rec, t: 'Sans cas de base, <b>rien n’arrête les appels</b> : la pile se remplit sans fin jusqu’à la saturation de la mémoire.' });
      }
    }
    function render(k) {
      var shown = {}, status = {}, cls = {}, dOn = {}, uOn = {}, calls = 0, ev = events[k], over = false;
      for (var e = 0; e <= k; e++) {
        var E = events[e];
        if (E.k === 'call') { shown[E.i] = 1; calls++; if (E.i > 0) dOn[E.i - 1] = 1; }
        if (E.k === 'base') { cls[E.i] = 'base'; status[E.i] = 'n = 0 → je rends 1'; }
        if (E.k === 'ret') { cls[E.i] = 'done'; uOn[E.i] = 1; cls[cards.length - 1] = 'done'; var nr = N - E.i; status[E.i] = nr + ' × ' + fv(nr - 1) + ' = ' + fv(nr) + ' → je rends ' + fv(nr); }
        if (E.k === 'over') over = true;
      }
      for (var i = 0; i < cards.length; i++) {
        var c = cards[i], vis = !!shown[i];
        c.style.opacity = vis ? 1 : 0; c.style.transform = vis ? 'none' : 'translateY(-26px) scale(.96)';
        var s = cls[i];
        c.style.borderColor = s === 'done' ? 'var(--ok)' : s === 'base' ? 'var(--warn)' : (vis ? 'var(--blue)' : 'var(--line)');
        c.style.background = s === 'done' ? 'var(--ok-soft)' : s === 'base' ? 'var(--warn-soft)' : (vis ? 'var(--accent-soft)' : 'var(--surface)');
        var nn = N - i, waiting = vis && !s && i < cards.length - 1 && shown[i + 1];
        c._st.textContent = status[i] || (waiting ? 'attend fact(' + (nn - 1) + ')…' : (vis ? 'en cours…' : ''));
        if (mode === 'nobase') c._st.textContent = vis ? (shown[i + 1] ? 'attend fact(' + (nn - 1) + ')…' : 'en cours…') : '';
        c.style.animation = (over && vis) ? 'none' : 'none';
      }
      dArrows.forEach(function (d, i) { d.style.opacity = dOn[i] ? 1 : 0; d.style.transform = dOn[i] ? 'none' : 'translateY(-10px)'; });
      uArrows.forEach(function (u, i) { u.style.opacity = uOn[i] ? 1 : 0; u.style.transform = uOn[i] ? 'none' : 'translateY(10px)'; });
      codeB.lines.forEach(function (l, i) { l.classList.toggle('hl', i === ev.line); });
      var height = 0; for (var q = 0; q < cards.length; q++) if (shown[q] && cls[q] !== 'done') height++;
      var ph, bg, fg;
      if (ev.k === 'over') { ph = '⚠ DÉPASSEMENT DE PILE (stack overflow)'; bg = 'var(--bad-soft)'; fg = 'var(--bad)'; }
      else if (ev.k === 'call') { ph = '① DESCENTE · les appels s’empilent'; bg = 'var(--accent-soft)'; fg = 'var(--accent)'; }
      else if (ev.k === 'base') { ph = '② CAS DE BASE · on arrête de descendre'; bg = 'var(--warn-soft)'; fg = 'var(--warn)'; }
      else { ph = '③ REMONTÉE · les réponses reviennent'; bg = 'var(--ok-soft)'; fg = 'var(--ok)'; }
      phase.textContent = ph; phase.style.background = bg; phase.style.color = fg;
      counters.innerHTML = '';
      counters.append(h('div', { class: 'ops' }, String(calls), h('small', null, 'appels')), h('div', { class: 'ops' }, String(height), h('small', null, 'fiches sur la pile')));
      note.innerHTML = ev.t;
    }
  }

  /* ---------- Fibonacci : arbre d'appels construit pas à pas ---------- */
  function fibAnim(root, n0, hi0) {
    root = $(root); root.classList.add('sim');
    var n = n0 || 4, hi = (hi0 === undefined ? null : hi0), sp, nodes, edges, events, svgBox = h('div'), note = h('div', { class: 'note', style: 'font-size:28px;min-height:76px;flex:1' }), counters = h('div', { class: 'row', style: 'gap:30px' });
    var sel = h('select', { 'aria-label': 'Valeur de n', onchange: function () { n = +sel.value; hi = null; build(); sp.reset(); } }, [3, 4, 5].map(function (v) { return h('option', { value: v, selected: v === n }, 'fib(' + v + ')'); }));
    var hiSel = h('select', { 'aria-label': 'Surligner', onchange: function () { hi = hiSel.value === '' ? null : +hiSel.value; sp.refresh(); } });
    var NW = 150, NH = 70, GX = 28, GY = 46, svg;
    function build() {
      var leaves = 0, depth = 0, id = 0; nodes = []; edges = []; events = [];
      function mkNode(k, parent) { var nd = { id: id++, k: k, parent: parent, ch: [], val: null, part: null }; nodes.push(nd); if (k >= 2) { nd.ch.push(mkNode(k - 1, nd)); nd.ch.push(mkNode(k - 2, nd)); } return nd; }
      var tree = mkNode(n, null);
      (function lay(t, d) { depth = Math.max(depth, d); t.d = d; if (!t.ch.length) t.x = leaves++; else { t.ch.forEach(function (c) { lay(c, d + 1); }); t.x = (t.ch[0].x + t.ch[1].x) / 2; } })(tree, 0);
      nodes.forEach(function (t) { if (t.parent) edges.push([t.parent, t]); });
      (function gen(t) { events.push({ t: 'call', nd: t }); if (t.k < 2) { t.val = t.k; events.push({ t: 'base', nd: t }); events.push({ t: 'ret', nd: t }); } else { gen(t.ch[0]); gen(t.ch[1]); t.val = t.ch[0].val + t.ch[1].val; events.push({ t: 'sum', nd: t }); events.push({ t: 'ret', nd: t }); } })(tree);
      var W = leaves * (NW + GX), H = (depth + 1) * (NH + GY);
      svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', style: 'max-height:490px', role: 'img', 'aria-label': 'Arbre des appels de fib(' + n + ')' });
      var px = function (t) { return t.x * (NW + GX) + NW / 2 + GX / 2; }, py = function (t) { return t.d * (NH + GY) + 6; };
      edges.forEach(function (e) {
        var x1 = px(e[0]), y1 = py(e[0]) + NH, x2 = px(e[1]), y2 = py(e[1]), len = Math.hypot(x2 - x1, y2 - y1);
        var ln = sv('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: 'var(--blue)', 'stroke-width': 5, 'stroke-dasharray': len, 'stroke-dashoffset': len, style: 'transition:stroke-dashoffset .8s ease, stroke .5s' });
        ln._len = len; e._ln = ln; svg.appendChild(ln);
        var lb = sv('text', { x: (x1 + x2) / 2 + (x2 < x1 ? -26 : 26), y: (y1 + y2) / 2 + 8, 'text-anchor': 'middle', 'font-size': 26, style: 'opacity:0;transition:opacity .6s;fill:var(--ok);font-weight:800' }, '');
        e._lb = lb; svg.appendChild(lb);
      });
      nodes.forEach(function (t) {
        var g = sv('g', { style: 'opacity:0;transition:opacity .6s, transform .6s;transform-box:fill-box;transform-origin:center;transform:scale(.7)' });
        var rc = sv('rect', { x: px(t) - NW / 2, y: py(t), width: NW, height: NH, rx: 16, fill: 'var(--surface)', stroke: 'var(--blue)', 'stroke-width': 4, style: 'transition:fill .5s, stroke .5s' });
        var t1 = sv('text', { x: px(t), y: py(t) + 32, 'text-anchor': 'middle', 'font-size': 30, style: 'font-weight:800;fill:var(--head);font-family:var(--mono)' }, 'fib(' + t.k + ')');
        var t2 = sv('text', { x: px(t), y: py(t) + 62, 'text-anchor': 'middle', 'font-size': 24, style: 'fill:var(--muted);font-weight:700' }, '');
        g.append(rc, t1, t2); svg.appendChild(g); t._g = g; t._rc = rc; t._t2 = t2;
      });
      svgBox.innerHTML = ''; svgBox.appendChild(svg);
      hiSel.innerHTML = ''; hiSel.appendChild(h('option', { value: '' }, 'aucun'));
      for (var q = 0; q <= n; q++) hiSel.appendChild(h('option', { value: q }, 'fib(' + q + ')'));
      hiSel.value = hi === null ? '' : String(hi);
    }
    function render(k) {
      var seen = {}, done = {}, part = {}, retEdge = {}, calls = 0, ev = events[k], sumd = {};
      nodes.forEach(function (t) { t.part = null; });
      for (var e = 0; e <= k; e++) {
        var E = events[e], t = E.nd;
        if (E.t === 'call') { seen[t.id] = 1; calls++; }
        if (E.t === 'ret') { done[t.id] = 1; retEdge[t.id] = 1; if (t.parent) { var first = t.parent.ch[0] === t; part[t.parent.id] = first ? t.val + ' + ?' : t.parent.ch[0].val + ' + ' + t.val; } }
        if (E.t === 'sum') sumd[t.id] = 1;
      }
      nodes.forEach(function (t) {
        var vis = !!seen[t.id], act = (ev.nd === t), isHi = hi !== null && t.k === hi && vis;
        t._g.style.opacity = vis ? 1 : 0; t._g.style.transform = vis ? 'none' : 'scale(.7)';
        t._rc.setAttribute('stroke', isHi ? 'var(--warn)' : (done[t.id] ? 'var(--ok)' : 'var(--blue)'));
        t._rc.setAttribute('fill', isHi ? 'var(--warn-soft)' : (done[t.id] ? 'var(--ok-soft)' : (act ? 'var(--accent-soft)' : 'var(--surface)')));
        t._t2.textContent = done[t.id] ? '= ' + t.val : (part[t.id] ? '= ' + part[t.id] : (t.k < 2 && vis ? '' : (vis ? 'en attente…' : '')));
        if (t.k < 2 && vis && !done[t.id]) t._t2.textContent = '';
      });
      edges.forEach(function (e) {
        var child = e[1], vis = !!seen[child.id];
        e._ln.setAttribute('stroke-dashoffset', vis ? 0 : e._ln._len);
        e._ln.setAttribute('stroke', retEdge[child.id] ? 'var(--ok)' : 'var(--blue)');
        e._lb.textContent = retEdge[child.id] ? '↑ ' + child.val : ''; e._lb.style.opacity = retEdge[child.id] ? 1 : 0;
      });
      var t = ev.nd, msg;
      if (ev.t === 'call') msg = 'On appelle <b>fib(' + t.k + ')</b>.' + (t.k >= 2 ? ' Pour répondre, il lui faut d’abord <b>fib(' + (t.k - 1) + ')</b>, puis <b>fib(' + (t.k - 2) + ')</b>.' : '');
      else if (ev.t === 'base') msg = '<b>fib(' + t.k + ')</b> : c’est un cas de base (n ≤ 1). Il répond directement <b>' + t.k + '</b>.';
      else if (ev.t === 'sum') msg = 'Les deux réponses sont là : <b>fib(' + t.k + ') = ' + t.ch[0].val + ' + ' + t.ch[1].val + ' = ' + t.val + '</b>.';
      else msg = '<b>fib(' + t.k + ')</b> rend <b>' + t.val + '</b>' + (t.parent ? ' à <b>fib(' + t.parent.k + ')</b>.' : '. C’est le résultat final !');
      var hiCount = hi === null ? null : nodes.filter(function (x) { return x.k === hi; }).length;
      if (hi !== null && k === events.length - 1) msg = '<b>fib(' + hi + ')</b> a été calculé <b class="bad">' + hiCount + ' fois</b> dans cet arbre. Chaque fois, le même travail est refait.';
      note.innerHTML = msg;
      counters.innerHTML = ''; counters.append(h('div', { class: 'ops' }, String(calls), h('small', null, 'appels')));
    }
    build();
    sp = stepper(function () { return events.length; }, render, { delay: 1300 });
    sp.el.append(h('label', { style: 'margin-left:18px' }, 'Calculer', sel), h('label', null, 'Surligner', hiSel));
    root.append(svgBox, h('div', { class: 'row', style: 'justify-content:space-between;align-items:flex-start;flex-wrap:nowrap;margin-top:6px' }, note, counters), sp.el);
  }

  /* ---------- Arbre de récursion : couper, puis recoller ---------- */
  function splitTree(root) {
    root = $(root); root.classList.add('sim');
    var p = 3, box = h('div'), cap = h('div', { class: 'callout', style: 'min-height:116px;font-size:32px;margin-top:14px' }), sp, levels = [];
    var VALS = [5, 2, 8, 1, 9, 3, 7, 4, 6, 0, 11, 10, 13, 12, 15, 14];
    var sel = h('select', { 'aria-label': 'p', onchange: function () { p = +sel.value; build(); sp.reset(); } }, [2, 3, 4].map(function (v) { return h('option', { value: v, selected: v === p }, 'n = ' + Math.pow(2, v)); }));
    sp = stepper(function () { return p + 2; }, render, { delay: 2200, noSpeed: true });
    root.append(h('div', { class: 'row', style: 'margin-bottom:10px' }, h('label', null, 'Taille du problème', sel)), box, cap, sp.el);
    function build() {
      var n = Math.pow(2, p); box.innerHTML = ''; levels = [];
      for (var d = 0; d <= p; d++) {
        var cnt = Math.pow(2, d), size = n / cnt;
        var row = h('div', { style: 'display:grid;grid-template-columns:1fr 560px;gap:22px;align-items:center;margin:7px 0;opacity:0;transform:translateY(-14px);transition:opacity .7s, transform .7s cubic-bezier(.2,.7,.2,1)' });
        var cells = h('div', { style: 'display:grid;grid-template-columns:repeat(' + cnt + ',1fr);gap:6px' });
        for (var i = 0; i < cnt; i++) {
          var txt = size <= 4 && p <= 3 ? VALS.slice(i * size, i * size + size).join(' ') : (size === 1 ? VALS[i] : size);
          cells.appendChild(h('div', { style: 'background:var(--accent-soft);border:3px solid var(--blue);border-radius:10px;text-align:center;font:700 ' + (cnt > 8 ? 20 : 26) + 'px var(--mono);padding:6px 0;color:var(--head);overflow:hidden;white-space:nowrap' }, txt));
        }
        var cost = h('div', { style: 'font-size:25px;line-height:1.3;opacity:0;transition:opacity .7s' }, d < p ? [cnt + ' morceau' + (cnt > 1 ? 'x' : '') + ' de taille ', h('b', null, size), ' : chacun coûte ', h('b', null, size), ' à recoller, soit ', h('b', { class: 'acc' }, n), ' opérations'] : [cnt + ' morceaux de taille 1 : ', h('b', null, 'rien à recoller (cas de base)')]);
        row.append(cells, cost); box.appendChild(row); levels.push({ row: row, cost: cost });
      }
    }
    function render(k) {
      var n = Math.pow(2, p);
      levels.forEach(function (L, d) { var vis = d <= Math.min(k, p); L.row.style.opacity = vis ? 1 : 0; L.row.style.transform = vis ? 'none' : 'translateY(-14px)'; L.cost.style.opacity = vis ? 1 : 0; });
      var t;
      if (k === 0) t = 'On part d’un problème de taille <b>n = ' + n + '</b> : c’est la <b>racine</b> de l’arbre. On le coupe en deux moitiés, on résout chaque moitié, puis on <b>recolle</b> les deux résultats. Ce recollage coûte <b>' + n + ' opérations</b> (colonne de droite).';
      else if (k < p) t = '<b>Niveau ' + k + '.</b> Chaque morceau est coupé en <b>deux moitiés</b> : on obtient ' + Math.pow(2, k) + ' morceaux de taille ' + (n / Math.pow(2, k)) + '. Chaque morceau demande un recollage proportionnel à sa taille : ensemble, ils coûtent encore <b>' + n + ' opérations</b>.';
      else if (k === p) t = '<b>Niveau ' + p + '.</b> Les morceaux sont de taille 1 : on ne coupe plus (cas de base) et il n’y a plus rien à recoller.';
      else t = 'Il y a <b>' + p + ' niveaux</b> qui coûtent chacun <b>' + n + '</b> (le nombre de niveaux est log₂ ' + n + ' = ' + p + ') : total <b>' + n + ' × ' + p + ' = ' + (n * p) + '</b>, soit <b>T(n) = n × log₂ n</b>. C’est la complexité <b>Θ(n log n)</b>.';
      cap.innerHTML = t;
    }
    build(); sp.go(0);
  }

  /* ---------- Théorème maître : qui domine ? ---------- */
  function masterBars(root) {
    root = $(root); root.classList.add('sim');
    var L = 6, pre = [
      { n: 'Cas 1 · les feuilles dominent', a: 4, b: 2, d: 1, txt: 'Le coût <b>augmente</b> d’un niveau à l’autre : le dernier niveau (les feuilles) pèse le plus. Résultat : <b>Θ(n<sup>log<sub>b</sub> a</sup>)</b>.' },
      { n: 'Cas 2 · égalité', a: 2, b: 2, d: 1, txt: 'Tous les niveaux coûtent <b>autant</b> : on multiplie ce coût par le nombre de niveaux (log n). Résultat : <b>Θ(nᵈ log n)</b>.' },
      { n: 'Cas 3 · la racine domine', a: 2, b: 2, d: 2, txt: 'Le coût <b>diminue</b> d’un niveau à l’autre : la racine pèse le plus. Résultat : <b>Θ(nᵈ)</b>.' }
    ];
    var bars = h('div'), cap = h('div', { class: 'callout', style: 'font-size:32px;margin-top:14px;min-height:118px' }), form = h('div', { class: 'txt mono', style: 'font-size:34px;margin:6px 0 14px;color:var(--head)' });
    var row = h('div', { class: 'row', style: 'margin-bottom:12px' }), els = [], cur = 0;
    pre.forEach(function (p, i) { var b = btn(p.n, function () { cur = i; clearOn(row); b.classList.add('on'); draw(); }, i === 0 ? 'on' : ''); row.appendChild(b); });
    root.append(row, form, bars, cap);
    for (var k = 0; k <= L; k++) {
      var fill = h('div', { style: 'height:36px;border-radius:8px;width:0;transition:width .9s cubic-bezier(.2,.7,.2,1), background .6s;display:flex;align-items:center;padding-left:14px;color:#fff;font:700 22px var(--mono);white-space:nowrap' });
      var lab = h('span', { class: 'muted', style: 'font-size:26px' }, k === 0 ? 'niveau 0 · racine' : (k === L ? 'niveau ' + L + ' · feuilles' : 'niveau ' + k));
      bars.appendChild(h('div', { style: 'display:grid;grid-template-columns:290px 1fr;gap:18px;align-items:center;margin:6px 0' }, lab, h('div', null, fill))); els.push(fill);
    }
    function draw() {
      var P = pre[cur], n = Math.pow(P.b, L), costs = [];
      for (var k = 0; k <= L; k++) costs.push(Math.pow(P.a, k) * Math.pow(n / Math.pow(P.b, k), P.d));
      var mx = Math.max.apply(null, costs);
      els.forEach(function (f, k) { f.style.width = (costs[k] / mx * 100) + '%'; f.style.background = cur === 0 ? 'var(--c-exp)' : cur === 1 ? 'var(--c-n2)' : 'var(--c-log)'; f.textContent = costs[k] / mx > .22 ? fr(costs[k]) : ''; });
      form.innerHTML = 'T(n) = ' + P.a + '·T(n/' + P.b + ') + n' + (P.d === 1 ? '' : sup(P.d)) + '   <span class="muted" style="font-size:26px">log' + '<sub>' + P.b + '</sub>' + P.a + ' = ' + (Math.log(P.a) / Math.log(P.b)) + ',  d = ' + P.d + '</span>';
      cap.innerHTML = P.txt;
    }
    draw();
  }

  /* ---------- Calculateur du théorème maître ---------- */
  function master(root) {
    root = $(root); root.classList.add('sim');
    var a = 2, b = 2, d = 1;
    var out = h('div', { class: 'col', style: 'font-size:34px' });
    var ia = h('input', { type: 'number', min: 1, max: 16, value: a, 'aria-label': 'a', style: 'width:96px', oninput: read });
    var ib = h('input', { type: 'number', min: 2, max: 8, value: b, 'aria-label': 'b', style: 'width:96px', oninput: read });
    var id = h('input', { type: 'number', min: 0, max: 4, step: 0.5, value: d, 'aria-label': 'd', style: 'width:108px', oninput: read });
    var pre = h('div', { class: 'row', style: 'margin-top:16px' });
    [['Dichotomique', 1, 2, 0], ['Tri fusion', 2, 2, 1], ['Karatsuba', 3, 2, 1], ['Matrices (naïf)', 8, 2, 2], ['Strassen', 7, 2, 2], ['Parcours d’arbre', 2, 2, 0]].forEach(function (p) {
      pre.appendChild(btn(p[0], function () { ia.value = p[1]; ib.value = p[2]; id.value = p[3]; read(); }, 'sm'));
    });
    root.append(h('div', { class: 'row', style: 'font:600 42px var(--mono);color:var(--head)' }, 'T(n) = ', ia, ' T(n / ', ib, ') + Θ(n^', id, ')'), pre, h('div', { style: 'height:18px' }), out);
    function read() { a = Math.max(1, +ia.value || 1); b = Math.max(2, +ib.value || 2); d = Math.max(0, +id.value || 0); draw(); }
    function fx(x) { var s = Math.round(x * 100) / 100; return String(s).replace('.', ','); }
    function draw() {
      var e = Math.log(a) / Math.log(b), eq = Math.abs(e - d) < 1e-9;
      out.innerHTML = '';
      out.append(h('div', null, 'log', h('sub', null, b), '(', a, ') = ', h('b', { class: 'mono' }, fx(e)), '   et   d = ', h('b', { class: 'mono' }, fx(d))));
      var cas, res, cc;
      if (eq) { cas = 'Cas 2 : d = log_b a, tous les niveaux coûtent autant.'; res = 'Θ(n' + (d === 0 ? '' : d === 1 ? '' : '^' + fx(d)) + ' log n)'; cc = 'warn'; }
      else if (d < e) { cas = 'Cas 1 : d < log_b a, les feuilles dominent.'; res = 'Θ(n^' + fx(e) + ')'; cc = ''; }
      else { cas = 'Cas 3 : d > log_b a, la racine domine.'; res = 'Θ(n' + (d === 1 ? '' : '^' + fx(d)) + ')'; cc = 'good'; }
      out.append(h('div', null, h('span', { class: 'pill' }, cas)), h('div', { class: 'callout ' + cc }, 'Résultat : ', h('b', { class: 'mono' }, 'T(n) = ' + res)));
    }
    draw();
  }

  /* ---------- Questions de vérification ---------- */
  function quiz(root, cfg) {
    root = $(root); root.classList.add('quiz');
    var why = h('div', { class: 'why callout' }), opts = h('div', { class: 'opts' }), done = false;
    cfg.opts.forEach(function (t, i) {
      var b = h('button', { class: 'opt', type: 'button', onclick: function () {
        if (done) return; done = true;
        [].forEach.call(opts.children, function (x, k) { if (k === cfg.ans) x.classList.add('good'); });
        if (i !== cfg.ans) b.classList.add('wrong');
        why.innerHTML = (i === cfg.ans ? '<b class="ok">Exact.</b> ' : '<b class="bad">Pas tout à fait.</b> ') + cfg.why; why.classList.add('open');
      } }, h('span', { class: 'l' }, 'ABCD'[i]), h('span', { html: t }));
      opts.appendChild(b);
    });
    root.append(h('div', { class: 'q', html: cfg.q }), opts, why);
  }

  window.Sim = { tracer: tracer, arrayViz: arrayViz, sum: sumSim, guess: guess, race: race, raceBars: raceBars, growth: growth, times: times, halving: halving, handshake: handshake, subsets: subsets, contrib: contrib, simplify: simplify, bigO: bigO, cases: casesSim, loops: loops, hand: hand, mergeStep: mergeStep, mergeAnim: mergeAnim, fact: factAnim, fib: fibAnim, split: splitTree, masterBars: masterBars, master: master, quiz: quiz, h: h, pc: pc };
})();
