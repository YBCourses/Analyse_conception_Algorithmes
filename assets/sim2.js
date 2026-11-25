/* Simulations de la séance 2 : tableau mémoire (pile et tas, flèches), listes chaînées, piles.
   Dépend de sim.js (window.Sim). Les adresses sont des nombres décimaux simples pour faciliter l'explication. */
(function () {
  var S0 = window.Sim, h = S0.h, sv = S0.sv, stepper = S0.stepper, codeBlock = S0.codeBlock, btn = S0.btn, clearOn = S0.clearOn, arrayViz = S0.arrayViz;
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function $(s) { return typeof s === 'string' ? document.querySelector(s) : s; }
  var uid = 0;

  /* =====================================================================
     Tableau mémoire : colonne PILE (variables) et colonne TAS (blocs), avec flèches.
     État : { stack:[{id,name,addr,v|p,ptr,tag,cls}], heap:[{id,addr,fields:[{n,v|p,ptr,sm,cls}],cls,freed}], out:"..." }
     p = id de la cible ; p = null → NULL ; ptr:true sans p → pointeur non initialisé.
     Un pointeur affiche la valeur de l'adresse qu'il contient ; la flèche la dessine.
     ===================================================================== */
  function memBoard(opts) {
    opts = opts || {};
    var n = ++uid, KEYS = ['pa0', 'pa1', 'pa2', 'pa3', 'node', 'bad'];
    var el = h('div', { class: 'mb' + (opts.noheap ? ' noheap' : '') });
    if (opts.sw) el.style.setProperty('--sw', opts.sw + 'px');
    if (opts.hg) el.style.setProperty('--hg', opts.hg + 'px');
    if (opts.zoom) el.style.zoom = opts.zoom;
    var stackList = h('div', { class: 'mb-list' }), heapRow = h('div', { class: 'mb-row' }), outBox = h('div', { class: 'mb-console' });
    var colS = h('div', { class: 'mb-col' }, h('div', { class: 'mb-title' }, 'PILE · variables locales'), stackList);
    var colH = h('div', { class: 'mb-col' }, h('div', { class: 'mb-title' }, 'TAS · blocs réservés avec malloc'), heapRow);
    var svg = sv('svg', { class: 'mb-svg' });
    svg.innerHTML = '<defs>' + KEYS.map(function (k) { return '<marker id="m' + n + k + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="var(--' + k + ')"/></marker>'; }).join('') + '</defs>';
    el.append(colS); if (!opts.noheap) el.append(colH); el.append(svg);
    var wrap = h('div', null, el, outBox);
    var map = {}, arrows = {}, curAddr = {}, varColor = {}, nColor = 0, lastS = null;

    function ptxt(f) {
      if (f.p === null) return 'NULL';
      if (typeof f.p === 'string') return curAddr[f.p] !== undefined ? String(curAddr[f.p]) : '?';
      if (f.ptr && f.p === undefined) return '?';
      return f.v === undefined ? '?' : String(f.v);
    }
    function isPtr(f) { return !!(f.ptr || f.p !== undefined); }
    function colorOf(id) { if (!(id in varColor)) varColor[id] = (nColor++) % 4; return varColor[id]; }

    function buildVar() {
      var cell = h('span', { class: 'mv-v' });
      var e = h('div', { class: 'mv mb-item' }, h('span', { class: 'mv-n' }), h('span', { class: 'mv-a' }), cell);
      e._cell = cell; return e;
    }
    function updVar(rec, it) {
      var e = rec.el, ptr = isPtr(it); e.className = 'mv mb-item' + (ptr ? ' pv' : '') + (it.cls ? ' ' + it.cls : '');
      e.children[0 + (e.querySelector('.mv-tag') ? 1 : 0)].textContent = it.name;
      e.querySelector('.mv-a').textContent = it.addr !== undefined ? 'n° ' + it.addr : '';
      e._cell.textContent = ptxt(it); e._cell.className = 'mv-v' + (ptr ? ' ptr' : '') + (it.p === null ? ' null' : '');
      e.style.borderLeftColor = ptr && it.cls !== 'bad' ? 'var(--pa' + colorOf(it.id) + ')' : '';
      e._cell.style.color = ptr && typeof it.p === 'string' ? 'var(--pa' + colorOf(it.id) + ')' : '';
      var tg = e.querySelector('.mv-tag');
      if (it.tag) { if (!tg) { tg = h('span', { class: 'mv-tag' }); e.insertBefore(tg, e.firstChild); } tg.textContent = it.tag; } else if (tg) tg.remove();
    }
    function buildBlock(it) {
      var fs = h('div', { class: 'hb-f' });
      it.fields.forEach(function () { fs.appendChild(h('div', { class: 'hf' }, h('small'), h('b'))); });
      var e = h('div', { class: 'hb mb-item' }, h('div', { class: 'hb-a' }), fs); e._fs = fs; return e;
    }
    function updBlock(rec, it) {
      var e = rec.el; e.className = 'hb mb-item' + (it.freed ? ' freed' : '') + (it.cls ? ' ' + it.cls : '');
      e.children[0].textContent = 'n° ' + (it.addr !== undefined ? it.addr : '') + (it.freed ? ' · libéré' : '');
      it.fields.forEach(function (f, i) {
        var c = e._fs.children[i]; if (!c) { c = h('div', { class: 'hf' }, h('small'), h('b')); e._fs.appendChild(c); }
        c.className = 'hf' + (isPtr(f) ? ' ptr' : '') + (f.p === null ? ' null' : '') + (f.sm ? ' sm' : '') + (f.cls ? ' ' + f.cls : '');
        c.children[0].textContent = f.n || ''; c.children[1].textContent = ptxt(f);
        f._el = c;
      });
    }
    function sync(container, items, pre, build, upd) {
      var seen = {};
      items.forEach(function (it) {
        var key = pre + it.id; seen[key] = 1;
        var rec = map[key];
        if (!rec) {
          rec = map[key] = { el: build(it) }; rec.el.classList.add('mb-in'); container.appendChild(rec.el);
          (function (r) { requestAnimationFrame(function () { requestAnimationFrame(function () { r.el.classList.remove('mb-in'); }); }); })(rec);
        }
        upd(rec, it);
      });
      Object.keys(map).forEach(function (k) {
        if (k.indexOf(pre) === 0 && !seen[k]) { var r = map[k]; delete map[k]; r.el.classList.add('mb-out'); setTimeout(function () { r.el.remove(); }, 480); }
      });
      var live = items.map(function (it) { return map[pre + it.id].el; });
      var cur = [].filter.call(container.children, function (c) { return !c.classList.contains('mb-out'); });
      var same = cur.length === live.length && cur.every(function (c, i) { return c === live[i]; });
      if (!same) live.forEach(function (e) { container.appendChild(e); });
    }
    function pos(e) { var x = 0, y = 0, o = e; while (o && o !== el) { x += o.offsetLeft; y += o.offsetTop; o = o.offsetParent; } return { x: x, y: y, w: e.offsetWidth, h: e.offsetHeight }; }
    function spread(list) { list.forEach(function (a, i) { a.off = (i - (list.length - 1) / 2) * 24; }); }
    function group(list, keyFn) { var g = {}; list.forEach(function (a) { var k = keyFn(a); (g[k] = g[k] || []).push(a); }); Object.keys(g).forEach(function (k) { spread(g[k]); }); }

    /* Routage orthogonal : chaque flèche a sa couleur ; les lanes évitent les superpositions. */
    function route(S) {
      var stack = S.stack || [], heap = S.heap || [], order = {}, list = [];
      heap.forEach(function (b, i) { order[b.id] = i; });
      stack.forEach(function (v) {
        if (typeof v.p !== 'string') return;
        var rec = map['v:' + v.id]; if (!rec) return;
        var toHeap = !!map['b:' + v.p], dst = (toHeap ? 'b:' : 'v:') + v.p, tg = map[dst]; if (!tg) return;
        list.push({ key: 'v:' + v.id, kind: 'v', box: rec.el, dst: dst, tgt: tg.el, ib: toHeap ? order[v.p] : -1, toHeap: toHeap, ck: (tg.el.classList.contains('freed') || v.cls === 'bad') ? 'bad' : 'pa' + colorOf(v.id) });
      });
      heap.forEach(function (b, ia) {
        b.fields.forEach(function (f, fi) {
          if (typeof f.p !== 'string' || !f._el) return;
          var tg = map['b:' + f.p]; if (!tg) return;
          list.push({ key: 'b:' + b.id + '.' + fi, kind: 'f', cell: f._el, f: f, ia: ia, dst: 'b:' + f.p, tgt: tg.el, ib: order[f.p], ck: (tg.el.classList.contains('freed') || b.cls === 'bad') ? 'bad' : 'node' });
        });
      });
      var hb = heap.map(function (b) { return map['b:' + b.id] ? pos(map['b:' + b.id].el) : null; }).filter(Boolean);
      var rowP = pos(heapRow);
      var blockTop = hb.length ? Math.min.apply(null, hb.map(function (p) { return p.y; })) : rowP.y + 80;
      var blockBottom = hb.length ? Math.max.apply(null, hb.map(function (p) { return p.y + p.h; })) : blockTop + 110;
      var stackRight = 0; stack.forEach(function (v) { var r = map['v:' + v.id]; if (r) { var P = pos(r.el); stackRight = Math.max(stackRight, P.x + P.w); } });
      var gutter = stackRight + 24;

      list.forEach(function (a) {
        a.T = pos(a.tgt);
        if (a.kind === 'v') { var B = pos(a.box); a.sx = B.x + B.w; a.sy = B.y + B.h / 2; a.type = a.toHeap ? (a.ib === 0 ? 'left' : 'top') : 'side'; }
        else {
          a.C = pos(a.cell);
          var blk = heap[a.ia], np = blk.fields.filter(function (g) { return typeof g.p === 'string'; }), last = blk.fields[blk.fields.length - 1] === a.f;
          /* plusieurs pointeurs dans un même bloc : un par le haut, le suivant par le bas, pour ne jamais traverser les cases voisines */
          if (np.length > 1) a.type = a.ib > a.ia ? (np.indexOf(a.f) % 2 === 0 ? 'top' : 'bottom') : 'bottom';
          else a.type = (a.ib === a.ia + 1 && last) ? 'next' : (a.ib > a.ia + 1 ? 'top' : 'bottom');
        }
      });
      group(list.filter(function (a) { return a.type === 'left' || a.type === 'next'; }), function (a) { return 'L' + a.dst; });
      group(list.filter(function (a) { return a.type === 'top'; }), function (a) { return 'T' + a.dst; });
      group(list.filter(function (a) { return a.type === 'bottom'; }), function (a) { return 'B' + a.dst; });
      group(list.filter(function (a) { return a.type === 'side'; }), function (a) { return 'S' + a.dst; });
      /* gouttière : plus la variable est basse, plus son trait vertical est à droite */
      list.filter(function (a) { return a.kind === 'v' && a.toHeap; }).sort(function (a, b) { return a.sy - b.sy; }).forEach(function (a, i) { a.gx = gutter + i * 17; });
      /* lanes au-dessus : les plus courts le plus près des blocs */
      list.filter(function (a) { return a.type === 'top'; }).forEach(function (a) {
        a.tx = a.T.x + a.T.w / 2 + a.off; a.x1 = a.kind === 'v' ? a.gx : a.C.x + a.C.w / 2; a.span = Math.abs(a.tx - a.x1);
      });
      list.filter(function (a) { return a.type === 'top'; }).sort(function (a, b) { return a.span - b.span; }).forEach(function (a, i) { a.lane = blockTop - 22 - i * 17; });
      list.filter(function (a) { return a.type === 'bottom'; }).forEach(function (a) { a.tx = a.T.x + a.T.w / 2 + a.off; a.span = Math.abs(a.tx - (a.C.x + a.C.w / 2)); });
      list.filter(function (a) { return a.type === 'bottom'; }).sort(function (a, b) { return a.span - b.span; }).forEach(function (a, i) { a.lane = blockBottom + 20 + i * 17; });
      list.filter(function (a) { return a.type === 'side'; }).sort(function (a, b) { return Math.abs(a.T.y - a.sy) - Math.abs(b.T.y - b.sy); }).forEach(function (a, i) { a.lx = stackRight + 26 + i * 17; });

      var specs = list.map(function (a) {
        var T = a.T, d;
        if (a.type === 'left') { var ty = T.y + T.h / 2 + a.off; d = 'M' + a.sx + ' ' + a.sy + ' L' + a.gx + ' ' + a.sy + ' L' + a.gx + ' ' + ty + ' L' + (T.x - 3) + ' ' + ty; }
        else if (a.type === 'top' && a.kind === 'v') d = 'M' + a.sx + ' ' + a.sy + ' L' + a.gx + ' ' + a.sy + ' L' + a.gx + ' ' + a.lane + ' L' + a.tx + ' ' + a.lane + ' L' + a.tx + ' ' + (T.y - 3);
        else if (a.type === 'top') { var cx = a.C.x + a.C.w / 2; d = 'M' + cx + ' ' + a.C.y + ' L' + cx + ' ' + a.lane + ' L' + a.tx + ' ' + a.lane + ' L' + a.tx + ' ' + (T.y - 3); }
        else if (a.type === 'bottom') { var bx = a.C.x + a.C.w / 2; d = 'M' + bx + ' ' + (a.C.y + a.C.h) + ' L' + bx + ' ' + a.lane + ' L' + a.tx + ' ' + a.lane + ' L' + a.tx + ' ' + (T.y + T.h + 3); }
        else if (a.type === 'next') { var sy = a.C.y + a.C.h / 2; d = 'M' + (a.C.x + a.C.w) + ' ' + sy + ' L' + (T.x - 3) + ' ' + sy; }
        else { var ty3 = T.y + T.h / 2 + a.off; d = 'M' + a.sx + ' ' + a.sy + ' L' + a.lx + ' ' + a.sy + ' L' + a.lx + ' ' + ty3 + ' L' + (T.x + T.w + 3) + ' ' + ty3; }
        return { key: a.key, d: d, ck: a.ck };
      });
      var seen = {};
      specs.forEach(function (sp) {
        seen[sp.key] = 1; var a = arrows[sp.key];
        if (!a) { a = arrows[sp.key] = sv('path', { class: 'mb-arrow new' }); svg.appendChild(a); }
        a.setAttribute('d', sp.d); a.style.d = "path('" + sp.d + "')";
        a.setAttribute('class', 'mb-arrow' + (a._born ? '' : ' new')); a._born = true;
        a.style.stroke = 'var(--' + sp.ck + ')'; a.setAttribute('marker-end', 'url(#m' + n + sp.ck + ')'); a.style.opacity = 1;
      });
      Object.keys(arrows).forEach(function (k) { if (!seen[k]) { var a = arrows[k]; delete arrows[k]; a.style.opacity = 0; setTimeout(function () { a.remove(); }, 520); } });
    }

    if (window.ResizeObserver) new ResizeObserver(function () { if (lastS && el.offsetWidth) route(lastS); }).observe(el);
    return {
      el: wrap,
      render: function (S) {
        lastS = S; curAddr = {};
        (S.stack || []).forEach(function (v) { curAddr[v.id] = v.addr; }); (S.heap || []).forEach(function (b) { curAddr[b.id] = b.addr; });
        sync(stackList, S.stack || [], 'v:', buildVar, updVar);
        if (!opts.noheap) sync(heapRow, S.heap || [], 'b:', buildBlock, updBlock);
        if (S.out !== undefined) { outBox.style.display = ''; outBox.innerHTML = ''; outBox.append(h('span', { class: 'lab' }, 'Affichage'), S.out === '' ? '·' : S.out); } else outBox.style.display = 'none';
        requestAnimationFrame(function () { route(S); });
      }
    };
  }

  /* Constructeur de scénario : on modifie l'état, chaque étape en garde une copie */
  function builder(init) {
    var S = clone(init || { stack: [], heap: [] }), steps = [];
    var api = {
      S: S, steps: steps,
      V: function (id) { return S.stack.filter(function (x) { return x.id === id; })[0]; },
      B: function (id) { return S.heap.filter(function (x) { return x.id === id; })[0]; },
      F: function (id, name) { return api.B(id).fields.filter(function (f) { return f.n === name; })[0]; },
      del: function (arr, id) { S[arr] = S[arr].filter(function (x) { return x.id !== id; }); },
      step: function (line, note, fn) { if (fn) fn(api); steps.push({ line: line, note: note, state: clone(S) }); return api; }
    };
    return api;
  }

  /* Mémoire + code + note. layout 'side' : le code à gauche, la mémoire et la note à droite. */
  function memTracer(root, cfg) {
    root = $(root); root.classList.add('sim');
    var board = memBoard({ noheap: cfg.noheap, sw: cfg.sw, hg: cfg.hg, zoom: cfg.zoom }), cb, codeHold = h('div'), note = h('div', { class: 'note', style: 'font-size:' + (cfg.noteSize || 28) + 'px;min-height:' + (cfg.layout === 'side' ? 120 : 84) + 'px' });
    var steps = cfg.steps, mx = cfg.matrix ? h('div') : null;
    function setCode(lines) { cb = codeBlock(lines); cb.el.classList.add('sm'); if (cfg.codeSize) cb.el.style.fontSize = cfg.codeSize + 'px'; codeHold.innerHTML = ''; codeHold.appendChild(cb.el); }
    setCode(cfg.code);
    function render(k) {
      var st = steps[k]; board.render(st.state);
      if (mx) { mx.innerHTML = ''; mx.appendChild(matrixView(st.state, cfg.matrix)); }
      cb.lines.forEach(function (l, i) { l.classList.toggle('hl', i === st.line); });
      note.innerHTML = st.note || '';
    }
    var sp = stepper(function () { return steps.length; }, render, { delay: cfg.delay || 1800, noSpeed: true });
    var scen = h('div', { class: 'row', style: 'margin-bottom:10px;gap:10px' });
    if (cfg.scenarios) {
      cfg.scenarios.forEach(function (sc, i) {
        var b = btn(sc.label, function () { clearOn(scen); b.classList.add('on'); steps = sc.steps; setCode(sc.code || cfg.code); sp.reset(); }, 'sm' + (i === 0 ? ' on' : ''));
        scen.appendChild(b);
      });
    }
    var body;
    if (cfg.layout === 'side') {
      body = h('div', { class: 'mb-side', style: 'grid-template-columns:' + (cfg.codeW || 650) + 'px minmax(0,1fr)' }, codeHold, h('div', { class: 'col', style: 'gap:14px;min-width:0' }, board.el, mx ? h('div', { style: 'display:grid;grid-template-columns:minmax(0,1fr) auto;gap:22px;align-items:start' }, note, mx) : note));
    } else body = h('div', null, board.el, h('div', { class: 'mb-bottom' }, codeHold, note));
    root.append(cfg.scenarios ? scen : '', body, sp.el);
    sp.go(0);
    return { setSteps: function (s) { steps = s; sp.reset(); } };
  }

  /* Vue matricielle : la grille que l'on imagine, reliée à ce qui est réellement dans le tas.
     Le bloc « R » (tableau de pointeurs) donne les lignes ; chaque ligne est un bloc d'entiers. */
  function matrixView(S, o) {
    o = o || {};
    var rows = o.rows || 2, cols = o.cols || 3, byId = {}, R;
    (S.heap || []).forEach(function (b) { byId[b.id] = b; });
    R = byId.R;
    var t = h('table', { class: 'mx-t' }), head = h('tr', null, h('th', null, ''));
    for (var j = 0; j < cols; j++) head.appendChild(h('th', null, 'j=' + j));
    t.appendChild(head);
    for (var i = 0; i < rows; i++) {
      var f = R && R.fields[i], blk = f && typeof f.p === 'string' ? byId[f.p] : null, tr = h('tr', null, h('th', null, 'i=' + i));
      for (var k = 0; k < cols; k++) {
        var cell = blk && blk.fields[k], v = cell && cell.v !== undefined ? cell.v : (blk ? '?' : '');
        var cls = 'mx-d' + (blk ? '' : ' empty') + (blk && blk.freed || (R && R.freed) ? ' freed' : '') + ((cell && cell.cls === 'hlf') || (o.hl && o.hl[0] === i && o.hl[1] === k) ? ' hit' : '');
        tr.appendChild(h('td', { class: cls }, String(v)));
      }
      t.appendChild(tr);
    }
    return h('div', { class: 'mx' }, h('div', { class: 'mb-title' }, 'VUE MATRICIELLE'), t, h('div', { class: 'mx-cap' }, 'm[i][j] : ligne i, colonne j'));
  }

  /* Rendu statique d'un état (diapositives d'explication) */
  function memStatic(root, spec, opts) { root = $(root); var b = memBoard(opts); root.appendChild(b.el); b.render(spec); return b; }

  /* =============================== Scénarios (C réel, adresses décimales) =============================== */
  var NOTE0 = 'Avant l’exécution, la mémoire est vide.';

  function tVars() {
    var T = builder({ stack: [], heap: [] });
    T.step(0, 'Le programme commence dans <b>main</b>. Ses variables locales vont être rangées dans la <b>pile</b>, chacune à son numéro de case (son adresse).');
    T.step(1, '<b>int a = 5;</b> : une case est réservée pour <b>a</b>, au numéro <b>100</b>, et on y range <b>5</b>.', function () { T.S.stack.push({ id: 'a', name: 'a', addr: 100, v: 5, cls: 'hl' }); });
    T.step(2, '<b>int b = 7;</b> : une deuxième case, juste à côté (numéro <b>104</b>), car un <span class="mono">int</span> occupe 4 octets.', function () { T.V('a').cls = ''; T.S.stack.push({ id: 'b', name: 'b', addr: 104, v: 7, cls: 'hl' }); });
    T.step(3, '<b>int c = a + b;</b> : on lit les valeurs de a et de b, on les additionne et on range <b>12</b> dans une nouvelle case (numéro 108).', function () { T.V('b').cls = ''; T.S.stack.push({ id: 'c', name: 'c', addr: 108, v: 12, cls: 'hl' }); });
    T.step(4, '<b>a = 100;</b> : la case de <b>a</b> change de valeur. Son <b>numéro</b> (100) ne change jamais.', function () { T.V('c').cls = ''; T.V('a').v = 100; T.V('a').cls = 'hl'; });
    T.step(5, '<b>return 0;</b> : main se termine. Ses variables locales <b>a, b, c disparaissent</b> avec elle.', function () { T.S.stack = []; });
    return T.steps;
  }
  var CODE_VARS = ['int main(void) {', '    int a = 5;', '    int b = 7;', '    int c = a + b;', '    a = 100;', '    return 0;', '}'];

  function tLocal() {
    var T = builder({ stack: [], heap: [] });
    T.step(4, 'Le programme démarre par <b>main</b>. Aucune variable n’existe encore.');
    T.step(5, '<b>int a = 5;</b> : <b>a</b> est une variable locale de <b>main</b> (étiquette « main »). Elle est dans la pile.', function () { T.S.stack.push({ id: 'a', name: 'a', addr: 100, v: 5, tag: 'main', cls: 'hl' }); });
    T.step(6, '<b>compter();</b> : main appelle la fonction compter. Un <b>nouvel espace</b> est réservé pour ses variables locales.', function () { T.V('a').cls = ''; });
    T.step(1, '<b>int x = 10;</b> : <b>x</b> est une variable locale de <b>compter</b>. Elle naît ici, au numéro 200, au-dessus de celles de main.', function () { T.S.stack.push({ id: 'x', name: 'x', addr: 200, v: 10, tag: 'compter', cls: 'hl' }); });
    T.step(2, '<b>}</b> : la fonction compter se termine. Sa variable locale <b>x est détruite</b> : sa case est rendue et son contenu est perdu.', function () { T.del('stack', 'x'); T.V('a').cls = 'hl'; });
    T.step(7, '<b>return 0;</b> : main se termine à son tour. <b>a est détruite</b>. La pile est vide.', function () { T.S.stack = []; });
    return T.steps;
  }
  var CODE_LOCAL = ['void compter(void) {', '    int x = 10;', '}', '', 'int main(void) {', '    int a = 5;', '    compter();', '    return 0;', '}'];

  function tPtr() {
    var T = builder({ stack: [], heap: [] });
    T.step(0, 'On va créer une variable ordinaire, puis une variable qui contient <b>l’adresse</b> de la première.');
    T.step(1, '<b>int a = 5;</b> : une variable ordinaire, au numéro <b>100</b>.', function () { T.S.stack.push({ id: 'a', name: 'a', addr: 100, v: 5, cls: 'hl' }); });
    T.step(2, '<b>int *p = &amp;a;</b> : <b>&amp;a</b> vaut <b>100</b>, l’adresse de a. On range ce nombre <b>100</b> dans p : <b>p contient 100</b>. La flèche est juste le dessin de « p contient l’adresse de la case 100 ».', function () { T.V('a').cls = ''; T.S.stack.push({ id: 'p', name: 'p', addr: 104, p: 'a', ptr: true, cls: 'hl' }); });
    T.step(3, '<b>*p = 9;</b> : <b>*p</b> est « la case dont l’adresse est dans p », donc la case 100. On y écrit <b>9</b> : a vaut maintenant 9, sans avoir touché à a directement.', function () { T.V('p').cls = ''; T.V('a').v = 9; T.V('a').cls = 'hl'; });
    T.step(4, '<b>p = NULL;</b> : on range la valeur spéciale NULL dans p. p ne contient plus l’adresse de a : la flèche disparaît, la variable a reste intacte.', function () { T.V('a').cls = ''; T.V('p').p = null; T.V('p').cls = 'hl'; });
    T.step(5, '<b>return 0;</b> : main se termine, a et p disparaissent.', function () { T.S.stack = []; });
    return T.steps;
  }
  var CODE_PTR = ['int main(void) {', '    int a = 5;', '    int *p = &a;', '    *p = 9;', '    p = NULL;', '    return 0;', '}'];

  function tPP() {
    var T = builder({ stack: [], heap: [] });
    T.step(0, 'Un pointeur est une variable comme les autres : elle a elle-même une adresse. On peut donc créer un pointeur qui désigne <b>un autre pointeur</b>.');
    T.step(1, '<b>int a = 5;</b> : une variable ordinaire (numéro 100).', function () { T.S.stack.push({ id: 'a', name: 'a', addr: 100, v: 5, cls: 'hl' }); });
    T.step(2, '<b>int *p = &amp;a;</b> : p (numéro 104) contient <b>100</b>, l’adresse de a. C’est un pointeur à <b>une étoile</b>.', function () { T.V('a').cls = ''; T.S.stack.push({ id: 'p', name: 'p', addr: 104, p: 'a', ptr: true, cls: 'hl' }); });
    T.step(3, '<b>int **pp = &amp;p;</b> : pp (numéro 112) contient <b>104</b>, l’adresse de p. C’est un pointeur à <b>deux étoiles</b> : il désigne un pointeur.', function () { T.V('p').cls = ''; T.S.stack.push({ id: 'pp', name: 'pp', addr: 112, p: 'p', ptr: true, cls: 'hl' }); });
    T.step(4, '<b>**pp = 9;</b> : on suit <b>deux flèches</b>. <b>pp</b> mène à p ; <b>*pp</b> est donc p ; <b>**pp</b> est la case désignée par p, c’est-à-dire a. On y écrit 9.', function () { T.V('pp').cls = ''; T.V('a').v = 9; T.V('a').cls = 'hl'; T.V('p').cls = 'hl'; });
    T.step(5, '<b>*pp = NULL;</b> : <b>*pp</b> est p lui-même. On range NULL dans p, <b>à travers pp</b>. La flèche de p vers a disparaît ; pp désigne toujours p.', function () { T.V('a').cls = ''; T.V('p').p = null; });
    T.step(6, '<b>return 0;</b> : fin de main, les trois variables disparaissent.', function () { T.S.stack = []; });
    return T.steps;
  }
  var CODE_PP = ['int main(void) {', '    int a = 5;', '    int *p = &a;', '    int **pp = &p;', '    **pp = 9;', '    *pp = NULL;', '    return 0;', '}'];

  function tAlloueKo() {
    var T = builder({ stack: [], heap: [] });
    T.step(5, 'Le programme démarre dans <b>main</b>.');
    T.step(6, '<b>int *p = NULL;</b> : p (numéro 100) ne désigne rien.', function () { T.S.stack.push({ id: 'p', name: 'p', addr: 100, p: null, ptr: true, tag: 'main', cls: 'hl' }); });
    T.step(7, '<b>alloue(p);</b> : on passe la <b>valeur</b> de p, donc NULL. La fonction reçoit une <b>copie</b> : le paramètre <b>q</b> (numéro 200) contient lui aussi NULL.', function () { T.V('p').cls = ''; T.S.stack.push({ id: 'q', name: 'q', addr: 200, p: null, ptr: true, tag: 'alloue', cls: 'hl' }); });
    T.step(1, '<b>q = malloc(…);</b> : un bloc est réservé dans le tas (numéro 2000). On range son adresse dans <b>q</b>, la copie. <b>p n’a pas changé</b> : il contient toujours NULL.', function () { T.S.heap.push({ id: 'b', addr: 2000, fields: [{ n: 'int', v: undefined }], cls: 'hl' }); T.V('q').p = 'b'; });
    T.step(2, '<b>*q = 7;</b> : on écrit 7 dans le bloc.', function () { T.B('b').fields[0].v = 7; });
    T.step(3, '<b>}</b> : alloue se termine, <b>q disparaît</b>. Plus aucune variable ne contient l’adresse 2000 : le bloc est <b>perdu</b>, et p vaut toujours NULL. L’appel n’a servi à rien.', function () { T.del('stack', 'q'); T.B('b').cls = 'bad'; T.V('p').cls = 'bad'; });
    return T.steps;
  }
  var CODE_ALLOUE_KO = ['void alloue(int *q) {', '    q = malloc(sizeof(int));', '    *q = 7;', '}', '', 'int main(void) {', '    int *p = NULL;', '    alloue(p);', '    return 0;', '}'];
  function tAlloueOk() {
    var T = builder({ stack: [], heap: [] });
    T.step(5, 'Le programme démarre dans <b>main</b>.');
    T.step(6, '<b>int *p = NULL;</b> : p (numéro 100) ne désigne rien.', function () { T.S.stack.push({ id: 'p', name: 'p', addr: 100, p: null, ptr: true, tag: 'main', cls: 'hl' }); });
    T.step(7, '<b>alloue(&amp;p);</b> : on passe <b>l’adresse de p</b>, soit 100. Le paramètre <b>pp</b> (numéro 200) contient 100 : il désigne p lui-même.', function () { T.V('p').cls = ''; T.S.stack.push({ id: 'pp', name: 'pp', addr: 200, p: 'p', ptr: true, tag: 'alloue', cls: 'hl' }); });
    T.step(1, '<b>*pp = malloc(…);</b> : <b>*pp</b> est la variable p de main. Le bloc (numéro 2000) est réservé et son adresse est rangée <b>dans p</b>, à travers pp.', function () { T.S.heap.push({ id: 'b', addr: 2000, fields: [{ n: 'int', v: undefined }], cls: 'hl' }); T.V('pp').cls = ''; T.V('p').p = 'b'; T.V('p').cls = 'hl'; });
    T.step(2, '<b>**pp = 7;</b> : deux flèches suivies (pp, puis p) mènent au bloc : on y écrit 7.', function () { T.B('b').fields[0].v = 7; });
    T.step(3, '<b>}</b> : alloue se termine, pp disparaît. Mais <b>p contient bien l’adresse du bloc</b> : l’appel a réussi.', function () { T.del('stack', 'pp'); T.B('b').cls = ''; T.V('p').cls = 'ok'; });
    return T.steps;
  }
  var CODE_ALLOUE_OK = ['void alloue(int **pp) {', '    *pp = malloc(sizeof(int));', '    **pp = 7;', '}', '', 'int main(void) {', '    int *p = NULL;', '    alloue(&p);', '    return 0;', '}'];

  /* Matrice 2 × 3 : un tableau de pointeurs vers des lignes */
  function tMatrix() {
    var T = builder({ stack: [], heap: [] });
    T.step(0, 'Une matrice de 2 lignes et 3 colonnes. On va la construire comme un <b>tableau de lignes</b> : un tableau de 2 pointeurs, chacun désignant une ligne de 3 entiers.');
    T.step(1, '<b>int **m = malloc(2 * sizeof(int *));</b> : on réserve un bloc pour <b>2 pointeurs</b> (numéro 2000). <b>m</b> contient son adresse. m est un pointeur vers des pointeurs : <b>deux étoiles</b>.', function () {
      T.S.heap.push({ id: 'R', addr: 2000, fields: [{ n: 'm[0]', ptr: true }, { n: 'm[1]', ptr: true }], cls: 'hl' }); T.S.stack.push({ id: 'm', name: 'm', addr: 100, p: 'R', ptr: true });
    });
    T.step(2, '<b>m[0] = malloc(3 * sizeof(int));</b> : on réserve la <b>ligne 0</b> (3 entiers, numéro 2048) et on range son adresse dans m[0].', function () {
      T.B('R').cls = ''; T.S.heap.push({ id: 'L0', addr: 2048, fields: [{ n: '[0]', sm: true }, { n: '[1]', sm: true }, { n: '[2]', sm: true }], cls: 'hl' }); T.B('R').fields[0].p = 'L0';
    });
    T.step(3, '<b>m[1] = malloc(3 * sizeof(int));</b> : même chose pour la <b>ligne 1</b> (numéro 2112), rangée dans m[1].', function () {
      T.B('L0').cls = ''; T.S.heap.push({ id: 'L1', addr: 2112, fields: [{ n: '[0]', sm: true }, { n: '[1]', sm: true }, { n: '[2]', sm: true }], cls: 'hl' }); T.B('R').fields[1].p = 'L1';
    });
    T.step(4, '<b>m[1][2] = 6;</b> : <b>m[1]</b> est la ligne 1 (une adresse), <b>m[1][2]</b> est la case n° 2 de cette ligne. On y écrit 6.', function () { T.B('L1').cls = 'ok'; T.B('L1').fields[2].v = 6; T.B('L1').fields[2].cls = 'hlf'; });
    T.step(5, '<b>free(m[0]);</b> : on libère d’abord les <b>lignes</b>, une par une…', function () { T.B('L1').cls = ''; T.B('L0').freed = true; });
    T.step(6, '<b>free(m[1]);</b> …', function () { T.B('L1').freed = true; });
    T.step(7, '<b>free(m);</b> … puis seulement le tableau de pointeurs. Si on libérait m en premier, on perdrait les adresses des lignes : <b>fuite</b>.', function () { T.B('R').freed = true; });
    T.step(8, '<b>return 0;</b> : fin de main, m disparaît. Chaque malloc a eu son free.', function () { T.S.stack = []; });
    return T.steps;
  }
  var CODE_MATRIX = ['int main(void) {', '    int **m = malloc(2 * sizeof(int *));', '    m[0] = malloc(3 * sizeof(int));', '    m[1] = malloc(3 * sizeof(int));', '    m[1][2] = 6;', '    free(m[0]);', '    free(m[1]);', '    free(m);', '    return 0;', '}'];

  function tMalloc() {
    var T = builder({ stack: [], heap: [] });
    T.step(1, 'Les variables locales naissent et meurent toutes seules. Pour un bloc dont <b>vous</b> choisissez la durée de vie, on utilise le <b>tas</b>.');
    T.step(2, '<b>malloc(sizeof(int))</b> réserve un bloc de 4 octets dans le <b>tas</b> (numéro 2000) et renvoie son adresse. On range <b>2000</b> dans <b>p</b>. Le contenu du bloc est encore indéterminé.', function () {
      T.S.heap.push({ id: 'b1', addr: 2000, fields: [{ n: 'int', v: undefined }], cls: 'hl' }); T.S.stack.push({ id: 'p', name: 'p', addr: 100, p: 'b1', ptr: true });
    });
    T.step(3, '<b>*p = 42;</b> : on suit l’adresse 2000 et on écrit 42 dans le bloc.', function () { T.B('b1').fields[0].v = 42; });
    T.step(4, '<b>free(p);</b> : on rend le bloc au système. Il n’est plus à nous. Mais <b>p contient toujours 2000</b> : c’est un pointeur « pendant ».', function () { T.B('b1').freed = true; T.B('b1').cls = ''; T.V('p').cls = 'bad'; });
    T.step(5, '<b>p = NULL;</b> : bonne habitude, on remplace 2000 par NULL pour ne plus pouvoir utiliser l’ancienne adresse par erreur.', function () { T.V('p').p = null; T.V('p').cls = 'hl'; });
    T.step(6, '<b>return 0;</b> : p disparaît (variable locale). Le bloc libéré a bien été rendu.', function () { T.S.stack = []; });
    return T.steps;
  }
  var CODE_MALLOC = ['#include <stdlib.h>', 'int main(void) {', '    int *p = malloc(sizeof(int));', '    *p = 42;', '    free(p);', '    p = NULL;', '    return 0;', '}'];

  /* Passage par valeur et par adresse */
  function tCopy() {
    var T = builder({ stack: [], heap: [] });
    T.step(4, 'Le programme démarre dans <b>main</b>.');
    T.step(5, '<b>int a = 5;</b> : <b>a</b> est une variable locale de main (numéro 100).', function () { T.S.stack.push({ id: 'a', name: 'a', addr: 100, v: 5, tag: 'main', cls: 'hl' }); });
    T.step(6, '<b>f(a);</b> : on appelle f en lui passant la <b>valeur</b> de a, soit 5. Le paramètre <b>x</b> est une <b>copie</b> : une nouvelle case (numéro 200).', function () { T.V('a').cls = ''; T.S.stack.push({ id: 'x', name: 'x', addr: 200, v: 5, tag: 'f', cls: 'hl' }); });
    T.step(1, '<b>x = 9;</b> : on modifie la copie. La case de a n’est pas touchée.', function () { T.V('x').v = 9; });
    T.step(2, '<b>}</b> : f se termine, sa variable locale <b>x disparaît</b>. <b>a vaut toujours 5</b> : f n’a pas pu modifier a.', function () { T.del('stack', 'x'); T.V('a').cls = 'hl'; });
    T.step(7, '<b>return 0;</b> : main se termine.', function () { T.S.stack = []; });
    return T.steps;
  }
  function tRef() {
    var T = builder({ stack: [], heap: [] });
    T.step(4, 'Le programme démarre dans <b>main</b>.');
    T.step(5, '<b>int a = 5;</b> : a est une variable locale de main (numéro 100).', function () { T.S.stack.push({ id: 'a', name: 'a', addr: 100, v: 5, tag: 'main', cls: 'hl' }); });
    T.step(6, '<b>g(&amp;a);</b> : on passe <b>l’adresse de a</b>, soit 100. Le paramètre <b>y</b> (numéro 200) est une copie de ce nombre : <b>y contient 100</b>, il désigne a.', function () { T.V('a').cls = ''; T.S.stack.push({ id: 'y', name: 'y', addr: 200, p: 'a', ptr: true, tag: 'g', cls: 'hl' }); });
    T.step(1, '<b>*y = 9;</b> : <b>*y</b> est la case d’adresse 100, donc a elle-même. On y écrit 9.', function () { T.V('y').cls = ''; T.V('a').v = 9; T.V('a').cls = 'hl'; });
    T.step(2, '<b>}</b> : g se termine, y disparaît, mais <b>a vaut maintenant 9</b>. Pour modifier une variable dans une fonction, on passe son <b>adresse</b>.', function () { T.del('stack', 'y'); });
    T.step(7, '<b>return 0;</b> : main se termine.', function () { T.S.stack = []; });
    return T.steps;
  }
  var CODE_COPY = ['void f(int x) {', '    x = 9;', '}', '', 'int main(void) {', '    int a = 5;', '    f(a);', '    return 0;', '}'];
  var CODE_REF = ['void g(int *y) {', '    *y = 9;', '}', '', 'int main(void) {', '    int a = 5;', '    g(&a);', '    return 0;', '}'];

  /* Quatre erreurs classiques */
  function eLeak() {
    var T = builder({ stack: [], heap: [] });
    T.step(2, '<b>malloc</b> réserve un premier bloc (numéro 2000). p contient <b>2000</b>.', function () { T.S.heap.push({ id: 'b1', addr: 2000, fields: [{ n: 'int', v: undefined }] }); T.S.stack.push({ id: 'p', name: 'p', addr: 100, p: 'b1', ptr: true }); });
    T.step(3, '<b>*p = 1;</b> : on écrit 1 dans le premier bloc.', function () { T.B('b1').fields[0].v = 1; });
    T.step(4, 'Deuxième <b>malloc</b> : un nouveau bloc (numéro 2048). On range <b>2048</b> dans p, <b>ce qui écrase 2000</b>. Plus aucune variable ne contient l’adresse du premier bloc.', function () { T.S.heap.push({ id: 'b2', addr: 2048, fields: [{ n: 'int', v: undefined }] }); T.V('p').p = 'b2'; T.B('b1').cls = 'bad'; });
    T.step(5, '<b>*p = 2;</b> : on écrit dans le second bloc.', function () { T.B('b2').fields[0].v = 2; });
    T.step(6, '<b>return 0;</b> sans aucun free : <b>fuite mémoire</b>. Le bloc 2000 est perdu pour de bon (personne ne connaît plus son adresse) et le bloc 2048 n’est pas rendu non plus. Dans une boucle, cela finit par saturer la mémoire.', function () { T.S.stack = []; T.B('b2').cls = 'bad'; });
    return T.steps;
  }
  function eNull() {
    var T = builder({ stack: [], heap: [] });
    T.step(1, '<b>int *p = NULL;</b> : p ne désigne rien.', function () { T.S.stack.push({ id: 'p', name: 'p', addr: 100, p: null, ptr: true, cls: 'hl' }); });
    T.step(2, '<b>*p = 5;</b> : on essaie de suivre une adresse qui n’existe pas. Le programme <b>plante</b> (erreur de segmentation).', function () { T.V('p').cls = 'bad'; });
    return T.steps;
  }
  function eDouble() {
    var T = builder({ stack: [], heap: [] });
    T.step(2, '<b>malloc</b> : un bloc (numéro 2000). p contient 2000.', function () { T.S.heap.push({ id: 'b1', addr: 2000, fields: [{ n: 'int', v: 7 }] }); T.S.stack.push({ id: 'p', name: 'p', addr: 100, p: 'b1', ptr: true }); });
    T.step(3, '<b>free(p);</b> : premier free, correct. Le bloc est rendu.', function () { T.B('b1').freed = true; });
    T.step(4, '<b>free(p);</b> une seconde fois : on rend un bloc <b>déjà rendu</b>. Comportement indéfini : plantage ou corruption de la mémoire. Avec <span class="mono">p = NULL</span> après le premier free, le second <span class="mono">free(NULL)</span> serait sans effet.', function () { T.V('p').cls = 'bad'; T.B('b1').cls = 'bad'; });
    return T.steps;
  }
  function eDangling() {
    var T = builder({ stack: [], heap: [] });
    T.step(2, '<b>malloc</b> : un bloc (numéro 2000). p contient 2000.', function () { T.S.heap.push({ id: 'b1', addr: 2000, fields: [{ n: 'int', v: 7 }] }); T.S.stack.push({ id: 'p', name: 'p', addr: 100, p: 'b1', ptr: true }); });
    T.step(3, '<b>free(p);</b> : le bloc est rendu, mais p contient toujours 2000.', function () { T.B('b1').freed = true; });
    T.step(4, '<b>*p = 9;</b> : on écrit dans un bloc qui ne nous appartient plus. Peut-être rien ne se voit aujourd’hui, mais ce bloc a pu être réutilisé ailleurs : <b>bug sournois</b>.', function () { T.V('p').cls = 'bad'; T.B('b1').fields[0].v = 9; });
    return T.steps;
  }
  var E_CODES = {
    leak: ['#include <stdlib.h>', 'int main(void) {', '    int *p = malloc(sizeof(int));', '    *p = 1;', '    p = malloc(sizeof(int));', '    *p = 2;', '    return 0;', '}'],
    nul: ['int main(void) {', '    int *p = NULL;', '    *p = 5;', '    return 0;', '}'],
    dbl: ['#include <stdlib.h>', 'int main(void) {', '    int *p = malloc(sizeof(int));', '    free(p);', '    free(p);', '    return 0;', '}'],
    dang: ['#include <stdlib.h>', 'int main(void) {', '    int *p = malloc(sizeof(int));', '    free(p);', '    *p = 9;', '    return 0;', '}']
  };

  /* ======================= Listes chaînées (adresses décimales) ======================= */
  function listInit() {
    return {
      stack: [{ id: 'tete', name: 'tete', addr: 100, p: 'A', ptr: true }],
      heap: [
        { id: 'A', addr: 2000, fields: [{ n: 'valeur', v: 7 }, { n: 'suivant', p: 'B', ptr: true }] },
        { id: 'B', addr: 2048, fields: [{ n: 'valeur', v: 3 }, { n: 'suivant', p: 'C', ptr: true }] },
        { id: 'C', addr: 2112, fields: [{ n: 'valeur', v: 9 }, { n: 'suivant', p: null, ptr: true }] }
      ]
    };
  }
  function tParcours() {
    var T = builder(listInit()), out = '';
    T.S.out = '';
    T.step(-1, 'Une liste de trois nœuds : <b>7, 3, 9</b>. La variable <b>tete</b> contient 2000 : l’adresse du premier. Le dernier nœud contient <b>NULL</b>.');
    T.step(0, '<b>courant ← tete</b> : courant reçoit la même valeur que tete (2000) : il désigne le premier nœud.', function () { T.S.stack.push({ id: 'c', name: 'courant', addr: 108, p: 'A', ptr: true, cls: 'hl' }); T.B('A').cls = 'hl'; });
    [['A', 'B', 7, 2048], ['B', 'C', 3, 2112], ['C', null, 9, null]].forEach(function (x) {
      T.step(1, 'Test <b>courant ≠ NULL</b> : courant contient une adresse, c’est vrai.', function () { });
      T.step(2, '<b>afficher(courant.valeur)</b> : on lit la valeur <b>' + x[2] + '</b>.', function () { out += x[2] + ' '; T.S.out = out; });
      T.step(3, x[1] ? '<b>courant ← courant.suivant</b> : courant reçoit le champ « suivant » du nœud, soit <b>' + x[3] + '</b> : il désigne le nœud suivant.' : '<b>courant ← courant.suivant</b> : le champ suivant du dernier nœud vaut NULL, donc courant devient <b>NULL</b>.', function () { T.B(x[0]).cls = ''; T.V('c').p = x[1]; if (x[1]) T.B(x[1]).cls = 'hl'; });
    });
    T.step(1, 'Test <b>courant ≠ NULL</b> : faux. La boucle s’arrête. Chaque nœud a été visité une fois : n étapes.', function () { T.V('c').cls = ''; });
    return T.steps;
  }
  var CODE_PARCOURS = ['courant ← tete', 'tant que courant ≠ NULL faire', '    afficher(courant.valeur)', '    courant ← courant.suivant'];

  function tTete(bonOrdre) {
    var T = builder(listInit());
    T.step(-1, 'On veut insérer <b>5</b> au début de la liste 7, 3, 9.');
    T.step(0, '<b>n ← nouveau nœud</b> (malloc) : un bloc apparaît dans le tas, n’importe où : ici au numéro <b>2160</b>. n contient 2160. Ses champs sont encore indéterminés.', function () { T.S.heap.push({ id: 'N', addr: 2160, fields: [{ n: 'valeur', v: undefined }, { n: 'suivant', ptr: true }], cls: 'hl' }); T.S.stack.push({ id: 'n', name: 'n', addr: 108, p: 'N', ptr: true }); });
    T.step(1, '<b>n.valeur ← 5</b> : on range la valeur dans le nouveau nœud.', function () { T.F('N', 'valeur').v = 5; });
    if (bonOrdre) {
      T.step(2, '<b>n.suivant ← tete</b> : on copie dans le champ suivant la valeur de tete (<b>2000</b>) : le nouveau nœud désigne <b>l’ancien premier</b>. Rien n’est perdu : tete contient toujours 2000.', function () { T.F('N', 'suivant').p = 'A'; });
      T.step(3, '<b>tete ← n</b> : tete reçoit 2160. La liste commence maintenant par le nouveau nœud : <b>5, 7, 3, 9</b>. Quatre instructions, <b>quelle que soit la longueur</b> de la liste : coût constant.', function () { T.V('tete').p = 'N'; T.B('N').cls = ''; });
    } else {
      T.step(2, '<b>tete ← n</b> (mauvais ordre) : tete reçoit 2160. Mais plus <b>aucune variable</b> ne contient l’adresse 2000 de l’ancien premier nœud !', function () { T.V('tete').p = 'N'; T.B('A').cls = 'bad'; T.B('B').cls = 'bad'; T.B('C').cls = 'bad'; });
      T.step(3, '<b>n.suivant ← tete</b> : tete vaut maintenant 2160, donc le nœud se désigne <b>lui-même</b>. L’ancienne liste 7, 3, 9 est <b>perdue</b> (fuite).', function () { T.F('N', 'suivant').p = 'N'; T.B('N').cls = 'bad'; });
    }
    return T.steps;
  }
  var CODE_TETE_OK = ['n ← nouveau nœud', 'n.valeur ← 5', 'n.suivant ← tete', 'tete ← n'];
  var CODE_TETE_KO = ['n ← nouveau nœud', 'n.valeur ← 5', 'tete ← n', 'n.suivant ← tete'];

  function tFin() {
    var T = builder(listInit());
    T.step(-1, 'On veut insérer <b>5</b> à la <b>fin</b>. Mais on ne connaît que <b>tete</b> : il faut d’abord trouver le dernier nœud.');
    T.step(0, '<b>courant ← tete</b> : courant contient 2000.', function () { T.S.stack.push({ id: 'c', name: 'courant', addr: 108, p: 'A', ptr: true, cls: 'hl' }); });
    T.step(1, 'Test <b>courant.suivant ≠ NULL</b> : le nœud 7 contient 2048, ce n’est pas NULL. On avance.', function () { });
    T.step(2, '<b>courant ← courant.suivant</b> : courant reçoit 2048.', function () { T.V('c').p = 'B'; });
    T.step(1, 'Test : le nœud 3 contient 2112, pas NULL. On avance encore.', function () { });
    T.step(2, '<b>courant ← courant.suivant</b> : courant reçoit 2112 : le nœud 9.', function () { T.V('c').p = 'C'; });
    T.step(1, 'Test : le champ suivant du nœud 9 est NULL. <b>C’est le dernier.</b> On a fait n − 1 avancées : coût proportionnel à n.', function () { });
    T.step(3, '<b>n ← nouveau nœud</b>, valeur 5, suivant NULL : un bloc apparaît (numéro 2160).', function () { T.S.heap.push({ id: 'N', addr: 2160, fields: [{ n: 'valeur', v: 5 }, { n: 'suivant', p: null, ptr: true }], cls: 'hl' }); T.S.stack.push({ id: 'n', name: 'n', addr: 116, p: 'N', ptr: true }); });
    T.step(4, '<b>courant.suivant ← n</b> : le champ suivant du dernier nœud reçoit 2160. Liste : <b>7, 3, 9, 5</b>.', function () { T.F('C', 'suivant').p = 'N'; T.B('N').cls = ''; });
    return T.steps;
  }
  var CODE_FIN = ['courant ← tete', 'tant que courant.suivant ≠ NULL faire', '    courant ← courant.suivant', 'n ← nouveau nœud (valeur 5, suivant NULL)', 'courant.suivant ← n'];

  function tSupprMilieu() {
    var T = builder(listInit());
    T.step(-1, 'On veut supprimer le nœud de valeur <b>3</b> (au milieu).');
    T.step(0, '<b>precedent ← tete</b> et <b>courant ← tete.suivant</b> : deux variables, à la suite l’une de l’autre (2000 et 2048).', function () { T.S.stack.push({ id: 'pr', name: 'precedent', addr: 108, p: 'A', ptr: true, cls: 'hl' }, { id: 'c', name: 'courant', addr: 116, p: 'B', ptr: true, cls: 'hl' }); });
    T.step(1, 'Test <b>courant.valeur ≠ 3</b> : courant désigne déjà le nœud 3, la boucle ne tourne pas. (Sinon, on avancerait precedent et courant d’un cran.)', function () { });
    T.step(2, '<b>precedent.suivant ← courant.suivant</b> : le champ suivant du nœud 7 reçoit 2112 : il désigne directement le nœud 9. Le nœud 3 est <b>court-circuité</b>.', function () { T.F('A', 'suivant').p = 'C'; T.B('B').cls = 'bad'; });
    T.step(3, '<b>libérer(courant)</b> (free) : on rend le bloc du nœud 3. Liste : <b>7, 9</b>.', function () { T.B('B').freed = true; T.B('B').cls = ''; T.del('stack', 'c'); T.del('stack', 'pr'); });
    return T.steps;
  }
  var CODE_SUPPR = ['precedent ← tete ; courant ← tete.suivant', 'tant que courant.valeur ≠ 3 : avancer', 'precedent.suivant ← courant.suivant', 'libérer(courant)'];
  function tSupprTete() {
    var T = builder(listInit());
    T.step(-1, 'On veut supprimer le <b>premier</b> nœud (7). Cas particulier : il n’a pas de « précédent », c’est <b>tete</b> qui doit changer.');
    T.step(0, '<b>temp ← tete</b> : on garde l’adresse (2000) du nœud à supprimer. Sans cela, on le perdrait avant de pouvoir le libérer.', function () { T.S.stack.push({ id: 'tp', name: 'temp', addr: 108, p: 'A', ptr: true, cls: 'hl' }); });
    T.step(1, '<b>tete ← tete.suivant</b> : tete reçoit 2048 : elle désigne maintenant le nœud 3.', function () { T.V('tete').p = 'B'; T.B('A').cls = 'bad'; });
    T.step(2, '<b>libérer(temp)</b> : on rend le bloc de l’ancien premier nœud. Liste : <b>3, 9</b>.', function () { T.B('A').freed = true; T.B('A').cls = ''; T.del('stack', 'tp'); });
    return T.steps;
  }
  var CODE_SUPPR_TETE = ['temp ← tete', 'tete ← tete.suivant', 'libérer(temp)'];

  /* ======================= Insérer au début d'un tableau ======================= */
  function shiftTrace(n) {
    var base = [4, 7, 1, 8, 3, 6, 2, 5].slice(0, n), t = base.concat(['·']), tr = [], k = 0;
    tr.push({ line: -1, vars: { n: n, i: undefined }, ops: 0, note: 'On veut insérer <b>9</b> au <b>début</b> du tableau. Il reste une case libre à droite. La case 0 est occupée : il faut <b>faire de la place</b>.', t: t.slice(), cur: -1 });
    for (var i = n - 1; i >= 0; i--) {
      t[i + 1] = t[i]; k++;
      tr.push({ line: 1, vars: { n: n, i: i }, ops: k, note: '<b>t[' + (i + 1) + '] ← t[' + i + ']</b> : on décale ' + t[i] + ' d’une case vers la droite. <b>Décalage n° ' + k + '.</b>', t: t.slice(), cur: i + 1 });
    }
    t[0] = 9;
    tr.push({ line: 2, vars: { n: n, i: undefined }, ops: k, note: '<b>t[0] ← 9</b> : la case 0 est libre. Il a fallu <b>' + k + ' décalages</b> = n. Avec une liste chaînée : 4 instructions, quel que soit n.', t: t.slice(), cur: 0 });
    return tr;
  }
  function arrayShift(root) {
    root = $(root);
    var holder = h('div'); root.appendChild(holder);
    var tr = S0.tracer(holder, {
      code: ['pour i de n-1 à 0 (en reculant) faire', '    t[i+1] ← t[i]', 't[0] ← 9'], trace: shiftTrace(5), opsLabel: 'décalages',
      viz: function (el, st) {
        var cls = {}; st.t.forEach(function (v, k) { if (v === '·') cls[k] = 'range'; });
        if (st.cur >= 0) cls[st.cur] = 'found';
        arrayViz(el, { values: st.t, cls: cls, ptrs: { i: st.vars.i === undefined ? null : st.vars.i }, cw: st.t.length > 7 ? 74 : 90 });
      }
    });
    var row = h('div', { class: 'row', style: 'margin-top:14px' }, h('span', { class: 'small' }, 'Taille n :'));
    [4, 5, 8].forEach(function (n) { var b = btn('n = ' + n, function () { tr.setTrace(shiftTrace(n)); clearOn(row); b.classList.add('on'); }, n === 5 ? 'on' : ''); row.appendChild(b); });
    root.appendChild(row);
  }

  /* ======================= Pile : démonstration interactive ======================= */
  function stackPlay(root) {
    root = $(root); root.classList.add('sim');
    var st = [], next = 1, view = 'dessin', CAP = 8, msg = h('div', { class: 'note', style: 'font-size:29px;min-height:76px' }), ops = h('div', { class: 'ops' });
    var area = h('div', { style: 'min-height:330px' }), board = null, lastCost = '';
    var views = h('div', { class: 'row', style: 'margin-bottom:12px;gap:10px' });
    [['dessin', 'Pile d’assiettes'], ['tableau', 'Avec un tableau'], ['liste', 'Avec une liste chaînée']].forEach(function (v, i) {
      var b = btn(v[1], function () { view = v[0]; clearOn(views); b.classList.add('on'); board = null; draw(); }, 'sm' + (i === 0 ? ' on' : '')); views.appendChild(b);
    });
    var ctl = h('div', { class: 'ctl' },
      btn('Empiler', function () { push(); }, 'pri'), btn('Dépiler', function () { pop(); }), btn('Voir le sommet', function () { peek(); }), btn('Vider', function () { st = []; next = 1; say('La pile est vide.'); draw(); }, 'sm'));
    root.append(views, area, ops, msg, ctl);
    function say(t) { msg.innerHTML = t; }
    function cost(n, t) { ops.innerHTML = ''; ops.append(String(n), h('small', null, t)); }
    function push() {
      if (st.length >= CAP) { say('<b class="bad">Pile pleine</b> : avec un tableau de ' + CAP + ' cases, on ne peut plus empiler (débordement). Une liste chaînée n’a pas cette limite.'); return; }
      var v = next++; st.push(v); say('<b>empiler(' + v + ')</b> : la valeur <b>' + v + '</b> est posée au-dessus. Elle sera la première à ressortir.'); cost(1, 'opération · coût constant'); draw(true);
    }
    function pop() {
      if (!st.length) { say('<b class="bad">Pile vide</b> : on ne peut rien dépiler. Il faut toujours tester <code>est_vide</code> avant.'); return; }
      var v = st[st.length - 1];
      if (view === 'dessin') { var top = area.querySelector('.assiette.top'); if (top) top.classList.add('mb-out'); }
      setTimeout(function () { st.pop(); say('<b>dépiler()</b> renvoie <b>' + v + '</b> : le dernier arrivé est le premier sorti.'); cost(1, 'opération · coût constant'); draw(); }, view === 'dessin' ? 380 : 0);
    }
    function peek() {
      if (!st.length) { say('<b class="bad">Pile vide</b> : pas de sommet.'); return; }
      say('<b>sommet()</b> montre <b>' + st[st.length - 1] + '</b> sans le retirer.'); cost(1, 'opération · coût constant');
    }
    function draw(pushed) {
      if (view === 'dessin') {
        area.innerHTML = '';
        var col = h('div', { class: 'pile-col' });
        st.forEach(function (v, i) { var cls = 'assiette' + (i === st.length - 1 ? ' top' : '') + (pushed && i === st.length - 1 ? ' drop' : ''); col.appendChild(h('div', { class: cls }, String(v), i === st.length - 1 ? h('span', { class: 'sm-tag' }, '◀ sommet') : '')); });
        area.append(h('div', { class: 'pile-wrap' }, col, h('div', { class: 'pile-base' })));
      } else if (view === 'tableau') {
        area.innerHTML = ''; var a = h('div'); area.appendChild(a);
        var vals = [], cls = {}; for (var i = 0; i < CAP; i++) { vals.push(i < st.length ? st[i] : '·'); if (i < st.length) cls[i] = i === st.length - 1 ? 'cur' : ''; else cls[i] = 'range'; }
        arrayViz(a, { values: vals, cls: cls, ptrs: { sommet: st.length ? st.length - 1 : null }, cw: 96 });
        area.appendChild(h('div', { class: 'small', style: 'margin-top:4px' }, 'Le tableau a ' + CAP + ' cases. La variable « sommet » est l’indice de la dernière case occupée : empiler = sommet + 1 puis écrire ; dépiler = lire puis sommet − 1.'));
      } else {
        if (!board) { area.innerHTML = ''; board = memBoard({}); area.appendChild(board.el); }
        board.el.style.zoom = Math.min(1, 1650 / (420 + 330 * Math.max(st.length, 1)));
        var heap = [], stack = [{ id: 'sommet', name: 'sommet', addr: 100, p: st.length ? 'n' + (st.length - 1) : null, ptr: true }];
        st.forEach(function (v, i) { heap.push({ id: 'n' + i, addr: 2000 + i * 48, fields: [{ n: 'valeur', v: v }, { n: 'suivant', p: i ? 'n' + (i - 1) : null, ptr: true }], cls: i === st.length - 1 ? 'hl' : '' }); });
        board.render({ stack: stack, heap: heap });
      }
    }
    say('Cliquez sur « Empiler » plusieurs fois, puis sur « Dépiler » : quel nombre sort en premier ?'); cost(0, 'opération');
    draw();
  }

  /* ======================= Parenthèses bien formées ======================= */
  var PAIR = { ')': '(', ']': '[', '}': '{' };
  function parensTrace(expr) {
    var tr = [], stack = [], ch = expr.split(''), fail = false;
    tr.push({ i: -1, stack: [], txt: 'Expression : <b class="mono">' + expr + '</b>. On la lit de gauche à droite avec une <b>pile</b> vide.', state: '' });
    for (var i = 0; i < ch.length && !fail; i++) {
      var c = ch[i];
      if ('([{'.indexOf(c) >= 0) { stack.push(c); tr.push({ i: i, stack: stack.slice(), txt: '<b>' + c + '</b> est une <b>ouvrante</b> : on l’<b>empile</b>.', state: '' }); }
      else if (')]}'.indexOf(c) >= 0) {
        if (!stack.length) { tr.push({ i: i, stack: [], txt: '<b>' + c + '</b> est une fermante, mais la pile est <b>vide</b> : aucune ouvrante ne l’attend. <b class="bad">Mal parenthésée.</b>', state: 'bad' }); fail = true; }
        else {
          var top = stack.pop();
          if (top !== PAIR[c]) { tr.push({ i: i, stack: stack.concat([top]), txt: '<b>' + c + '</b> est une fermante : on dépile <b>' + top + '</b>, qui ne lui correspond pas. <b class="bad">Mal parenthésée.</b>', state: 'bad' }); fail = true; }
          else tr.push({ i: i, stack: stack.slice(), txt: '<b>' + c + '</b> est une fermante : on <b>dépile</b> <b>' + top + '</b>, qui lui correspond. Bien.', state: '' });
        }
      } else tr.push({ i: i, stack: stack.slice(), txt: '<b>' + c + '</b> n’est pas une parenthèse : on l’<b>ignore</b>.', state: '' });
    }
    if (!fail) {
      if (stack.length) tr.push({ i: ch.length, stack: stack.slice(), txt: 'L’expression est lue, mais la pile n’est <b>pas vide</b> : il reste des ouvrantes jamais fermées. <b class="bad">Mal parenthésée.</b>', state: 'bad' });
      else tr.push({ i: ch.length, stack: [], txt: 'L’expression est lue et la pile est <b>vide</b> : tout a été fermé dans le bon ordre. <b class="ok">Bien parenthésée.</b>', state: 'ok' });
    }
    return tr;
  }
  function pileBoxes(stack, cls) {
    var col = h('div', { class: 'pile-col small-p' });
    stack.forEach(function (v, i) { col.appendChild(h('div', { class: 'assiette' + (i === stack.length - 1 ? ' top' : '') }, String(v))); });
    return h('div', { class: 'pile-wrap' }, col, h('div', { class: 'pile-base' }));
  }
  function parens(root) {
    root = $(root); root.classList.add('sim');
    var cur = '([]{})', tr = parensTrace(cur), arr = h('div'), pileEl = h('div', { style: 'min-width:220px' }), note = h('div', { class: 'note', style: 'font-size:34px;min-height:130px;margin-top:14px' });
    var row = h('div', { class: 'row', style: 'margin-bottom:12px;gap:10px' }), sp;
    [['([]{})', '([]{})'], ['([)]', '([)]'], ['((a+b)*c', '((a+b)*c'], ['{[()()]}', '{[()()]}'], ['())', '())']].forEach(function (p, i) {
      var b = btn(p[1], function () { clearOn(row); b.classList.add('on'); cur = p[0]; tr = parensTrace(cur); sp.reset(); }, 'sm' + (i === 0 ? ' on' : '')); b.style.fontFamily = 'var(--mono)'; row.appendChild(b);
    });
    function render(k) {
      var s = tr[k], chars = cur.split(''), cls = {};
      chars.forEach(function (c, i) { if (i < s.i) cls[i] = 'done'; });
      if (s.i >= 0 && s.i < chars.length) cls[s.i] = s.state === 'bad' ? 'bad' : 'cur';
      arrayViz(arr, { values: chars, cls: cls, ptrs: { lecture: s.i >= 0 && s.i < chars.length ? s.i : null }, cw: 98 });
      pileEl.innerHTML = ''; pileEl.append(h('div', { class: 'small', style: 'font-weight:700;margin-bottom:6px' }, 'Pile'), pileBoxes(s.stack));
      note.innerHTML = s.txt; note.style.color = s.state === 'bad' ? 'var(--bad)' : 'var(--fg)';
    }
    sp = stepper(function () { return tr.length; }, render, { delay: 1300 });
    root.append(row, h('div', { class: 'row', style: 'align-items:flex-start;flex-wrap:nowrap;gap:40px' }, h('div', { style: 'flex:1;min-width:0' }, arr, note), pileEl), sp.el);
    sp.go(0);
  }

  /* ======================= Évaluation postfixe ======================= */
  function postfixTrace(expr) {
    var tk = expr.split(' '), tr = [], st = [];
    tr.push({ i: -1, stack: [], txt: 'Expression postfixe : <b class="mono">' + expr + '</b>. Les opérateurs viennent <b>après</b> leurs opérandes. On lit de gauche à droite avec une pile.' });
    tk.forEach(function (t, i) {
      if (/^-?\d+$/.test(t)) { st.push(+t); tr.push({ i: i, stack: st.slice(), txt: '<b>' + t + '</b> est un nombre : on l’<b>empile</b>.' }); }
      else {
        var b = st.pop(), a = st.pop(), r = t === '+' ? a + b : t === '-' ? a - b : t === '*' ? a * b : Math.trunc(a / b);
        st.push(r);
        tr.push({ i: i, stack: st.slice(), txt: '<b>' + t + '</b> est un opérateur : on dépile <b>' + b + '</b> puis <b>' + a + '</b>, on calcule <b>' + a + ' ' + t + ' ' + b + ' = ' + r + '</b>, et on <b>empile</b> le résultat.' });
      }
    });
    tr.push({ i: tk.length, stack: st.slice(), txt: 'Fin de l’expression : il reste un seul nombre dans la pile, <b class="ok">' + st[0] + '</b>. C’est le résultat.' });
    return tr;
  }
  function postfix(root) {
    root = $(root); root.classList.add('sim');
    var cur = '3 4 + 2 *', tr = postfixTrace(cur), arr = h('div'), pileEl = h('div', { style: 'min-width:220px' }), note = h('div', { class: 'note', style: 'font-size:34px;min-height:130px;margin-top:14px' });
    var row = h('div', { class: 'row', style: 'margin-bottom:12px;gap:10px' }), sp;
    [['3 4 +', 'équivaut à 3 + 4'], ['3 4 + 2 *', 'équivaut à (3 + 4) × 2'], ['5 1 2 + 4 * + 3 -', 'équivaut à 5 + (1 + 2) × 4 − 3']].forEach(function (p, i) {
      var b = btn(p[0], function () { clearOn(row); b.classList.add('on'); cur = p[0]; tr = postfixTrace(cur); eq.textContent = p[1]; sp.reset(); }, 'sm' + (i === 1 ? ' on' : '')); b.style.fontFamily = 'var(--mono)'; row.appendChild(b);
    });
    row.children[0].classList.remove('on'); row.children[1].classList.add('on');
    var eq = h('span', { class: 'small', style: 'margin-left:10px' }, 'équivaut à (3 + 4) × 2');
    row.appendChild(eq);
    function render(k) {
      var s = tr[k], tk = cur.split(' '), cls = {};
      tk.forEach(function (c, i) { if (i < s.i) cls[i] = 'done'; });
      if (s.i >= 0 && s.i < tk.length) cls[s.i] = 'cur';
      arrayViz(arr, { values: tk, cls: cls, ptrs: { lecture: s.i >= 0 && s.i < tk.length ? s.i : null }, cw: 98 });
      pileEl.innerHTML = ''; pileEl.append(h('div', { class: 'small', style: 'font-weight:700;margin-bottom:6px' }, 'Pile'), pileBoxes(s.stack));
      note.innerHTML = s.txt;
    }
    sp = stepper(function () { return tr.length; }, render, { delay: 1500 });
    root.append(row, h('div', { class: 'row', style: 'align-items:flex-start;flex-wrap:nowrap;gap:40px' }, h('div', { style: 'flex:1;min-width:0' }, arr, note), pileEl), sp.el);
    sp.go(0);
  }

  /* ======================= File : liste avec tete et queue ======================= */
  function fileInit() {
    return {
      stack: [{ id: 'tete', name: 'tete', addr: 100, p: 'A', ptr: true }, { id: 'queue', name: 'queue', addr: 104, p: 'C', ptr: true }],
      heap: [
        { id: 'A', addr: 2000, fields: [{ n: 'valeur', v: 7 }, { n: 'suivant', p: 'B', ptr: true }] },
        { id: 'B', addr: 2048, fields: [{ n: 'valeur', v: 3 }, { n: 'suivant', p: 'C', ptr: true }] },
        { id: 'C', addr: 2112, fields: [{ n: 'valeur', v: 9 }, { n: 'suivant', p: null, ptr: true }] }
      ]
    };
  }
  function tEnfiler() {
    var T = builder(fileInit());
    T.step(-1, 'Une file de trois éléments : <b>7, 3, 9</b>. <b>tete</b> (2000) désigne le premier, celui qui sortira. <b>queue</b> (2112) désigne le <b>dernier</b>, celui qui est arrivé en dernier. On veut enfiler <b>5</b>.');
    T.step(0, '<b>n ← nouveau nœud</b> (malloc) : un bloc apparaît dans le tas (numéro 2160). n contient 2160.', function () { T.S.heap.push({ id: 'N', addr: 2160, fields: [{ n: 'valeur', v: undefined }, { n: 'suivant', ptr: true }], cls: 'hl' }); T.S.stack.push({ id: 'n', name: 'n', addr: 108, p: 'N', ptr: true }); });
    T.step(1, '<b>n.valeur ← 5</b> : on range la valeur.', function () { T.F('N', 'valeur').v = 5; });
    T.step(2, '<b>n.suivant ← NULL</b> : le nouveau nœud sera le dernier, il ne désigne personne.', function () { T.F('N', 'suivant').p = null; });
    T.step(3, '<b>queue.suivant ← n</b> : le champ suivant de l’ancien dernier nœud (le 9) reçoit 2160. Le nouveau nœud est <b>accroché au bout</b>.', function () { T.F('C', 'suivant').p = 'N'; });
    T.step(4, '<b>queue ← n</b> : queue reçoit 2160 : elle désigne le nouveau dernier. File : <b>7, 3, 9, 5</b>. Cinq instructions, <b>sans rien parcourir</b> : coût constant, grâce à <b>queue</b>.', function () { T.V('queue').p = 'N'; T.B('N').cls = ''; });
    return T.steps;
  }
  var CODE_ENFILER = ['n ← nouveau nœud', 'n.valeur ← 5', 'n.suivant ← NULL', 'queue.suivant ← n', 'queue ← n'];
  function tDefiler() {
    var T = builder(fileInit());
    T.step(-1, 'Même file : <b>7, 3, 9</b>. On veut <b>défiler</b> : retirer le <b>premier</b> arrivé, celui que désigne <b>tete</b>.');
    T.step(0, '<b>temp ← tete</b> : on garde l’adresse (2000) du nœud à retirer.', function () { T.S.stack.push({ id: 'tp', name: 'temp', addr: 108, p: 'A', ptr: true, cls: 'hl' }); T.B('A').cls = 'hl'; });
    T.step(1, '<b>x ← temp.valeur</b> : on lit la valeur à renvoyer : <b>7</b>.', function () { T.S.stack.push({ id: 'x', name: 'x', addr: 112, v: 7, cls: 'hl' }); });
    T.step(2, '<b>tete ← tete.suivant</b> : tete reçoit 2048 : le nœud 3 devient le premier. L’ancien premier n’est plus dans la file.', function () { T.V('tete').p = 'B'; T.B('A').cls = 'bad'; T.V('x').cls = ''; });
    T.step(3, '<b>libérer(temp)</b> : on rend le bloc de l’ancien premier. File : <b>3, 9</b>. <b>queue</b> n’a pas bougé. (Cas particulier : si la file devient vide, il faut aussi remettre <b>queue ← NULL</b>.)', function () { T.B('A').freed = true; T.B('A').cls = ''; T.del('stack', 'tp'); });
    return T.steps;
  }
  var CODE_DEFILER = ['temp ← tete', 'x ← temp.valeur', 'tete ← tete.suivant', 'libérer(temp)', '// renvoyer x'];

  /* ======================= File : démonstration interactive ======================= */
  function queuePlay(root) {
    root = $(root); root.classList.add('sim');
    var CAP = 6, ring = [], debut = 0, taille = 0, next = 1, view = 'guichet', cost = h('div', { class: 'ops' });
    var msg = h('div', { class: 'note', style: 'font-size:29px;min-height:76px' }), area = h('div', { style: 'min-height:330px' }), board = null;
    var views = h('div', { class: 'row', style: 'margin-bottom:12px;gap:10px' });
    [['guichet', 'File d’attente'], ['tableau', 'Avec un tableau circulaire'], ['liste', 'Avec une liste chaînée']].forEach(function (v, i) {
      var b = btn(v[1], function () { view = v[0]; clearOn(views); b.classList.add('on'); board = null; draw(); }, 'sm' + (i === 0 ? ' on' : '')); views.appendChild(b);
    });
    var ctl = h('div', { class: 'ctl' }, btn('Enfiler', function () { push(); }, 'pri'), btn('Défiler', function () { pop(); }), btn('Voir le premier', function () { peek(); }), btn('Vider', function () { ring = []; debut = 0; taille = 0; next = 1; say('La file est vide.'); draw(); }, 'sm'));
    root.append(views, area, cost, msg, ctl);
    function say(t) { msg.innerHTML = t; }
    function setCost(n, t) { cost.innerHTML = ''; cost.append(String(n), h('small', null, t)); }
    function at(k) { return ring[(debut + k) % CAP]; }
    function push() {
      if (taille >= CAP) { say('<b class="bad">File pleine</b> : le tableau n’a que ' + CAP + ' cases. Avec une liste chaînée, il n’y a pas de limite.'); return; }
      var v = next++; ring[(debut + taille) % CAP] = v; taille++;
      say('<b>enfiler(' + v + ')</b> : ' + v + ' se place <b>à la fin</b>. Il sortira après tous ceux qui sont déjà là.'); setCost(1, 'opération · coût constant'); draw(true);
    }
    function pop() {
      if (!taille) { say('<b class="bad">File vide</b> : rien à défiler. On teste <code>est_vide</code> avant.'); return; }
      var v = at(0); ring[debut] = undefined; debut = (debut + 1) % CAP; taille--;
      say('<b>défiler()</b> renvoie <b>' + v + '</b> : le <b>premier arrivé</b> est le premier sorti.' + (view === 'tableau' ? ' Aucun décalage : on avance simplement <b>début</b>.' : '')); setCost(1, 'opération · coût constant'); draw();
    }
    function peek() {
      if (!taille) { say('<b class="bad">File vide</b> : pas de premier élément.'); return; }
      say('<b>premier()</b> montre <b>' + at(0) + '</b> sans le retirer.'); setCost(1, 'opération · coût constant');
    }
    function box(txt, extra) {
      return h('div', { style: 'border:3px solid var(--head);border-radius:14px;background:var(--panel);font:700 46px var(--mono);padding:12px 28px;min-width:92px;text-align:center;' + (extra || '') }, String(txt));
    }
    function draw(pushed) {
      if (view === 'guichet') {
        area.innerHTML = '';
        var row = h('div', { style: 'display:flex;align-items:center;gap:14px;min-height:200px;flex-wrap:nowrap' });
        row.appendChild(h('div', { style: 'font:700 28px var(--sans);text-align:center;color:var(--muted)' }, 'sortie', h('div', null, '◀')));
        if (!taille) row.appendChild(h('div', { class: 'small' }, 'file vide'));
        for (var k = 0; k < taille; k++) {
          var isFirst = k === 0, isLast = k === taille - 1;
          row.appendChild(h('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:8px' }, box(at(k), isFirst ? 'border-color:var(--ok);' : (pushed && isLast ? 'border-color:var(--accent);' : '')), h('span', { class: 'small', style: 'font-weight:700' }, isFirst ? 'premier' : (isLast ? 'dernier' : ' '))));
        }
        row.appendChild(h('div', { style: 'font:700 28px var(--sans);text-align:center;color:var(--muted)' }, 'entrée', h('div', null, '◀')));
        area.appendChild(row);
      } else if (view === 'tableau') {
        area.innerHTML = ''; var a = h('div'); area.appendChild(a);
        var vals = [], cls = {};
        for (var i = 0; i < CAP; i++) {
          var used = ((i - debut + CAP) % CAP) < taille;
          vals.push(used ? ring[i] : '·'); cls[i] = used ? (i === debut ? 'found' : '') : 'range';
        }
        arrayViz(a, { values: vals, cls: cls, ptrs: { 'début': taille ? debut : debut, 'fin': (debut + taille) % CAP }, cw: 96 });
        area.appendChild(h('div', { class: 'small', style: 'margin-top:4px', html: 'Tableau de ' + CAP + ' cases, vu comme un cercle : après la case ' + (CAP - 1) + ', on revient à la case 0 (calcul « modulo ' + CAP + ' »). <b>début</b> = case du premier, <b>fin</b> = prochaine case libre. Éléments : ' + taille + '.' }));
      } else {
        if (!board) { area.innerHTML = ''; board = memBoard({}); area.appendChild(board.el); }
        board.el.style.zoom = Math.min(1, 1650 / (420 + 330 * Math.max(taille, 1)));
        var heap = [], stack = [{ id: 'tete', name: 'tete', addr: 100, p: taille ? 'n0' : null, ptr: true }, { id: 'queue', name: 'queue', addr: 104, p: taille ? 'n' + (taille - 1) : null, ptr: true }];
        for (var j = 0; j < taille; j++) heap.push({ id: 'n' + j, addr: 2000 + j * 48, fields: [{ n: 'valeur', v: at(j) }, { n: 'suivant', p: j < taille - 1 ? 'n' + (j + 1) : null, ptr: true }], cls: j === 0 ? 'hl' : '' });
        board.render({ stack: stack, heap: heap });
      }
    }
    say('Cliquez sur « Enfiler » plusieurs fois, puis sur « Défiler » : quel nombre sort en premier ?'); setCost(0, 'opération');
    draw();
  }

  /* ======================= Chaînes (anatomie, variantes) ======================= */
  function chain(root, o) {
    root = $(root);
    var vals = o.vals || [7, 3, 9], row = h('div', { class: 'chain' });
    if (o.head) row.appendChild(h('div', { class: 'ch-head' }, 'tete', h('span', null, '→')));
    vals.forEach(function (v, i) {
      var nd = h('div', { class: 'ch-node' }, o.dbl ? h('div', { class: 'ch-c pv' }, 'prec') : '', h('div', { class: 'ch-c' }, String(v)), h('div', { class: 'ch-c pv' }, 'suiv'));
      row.appendChild(nd);
      if (i < vals.length - 1) row.appendChild(h('div', { class: 'ch-ar' }, o.dbl ? '⇄' : '→'));
    });
    if (!o.circ) row.appendChild(h('div', { class: 'ch-ar' }, '→')), row.appendChild(h('div', { class: 'ch-null' }, 'NULL'));
    else row.appendChild(h('div', { class: 'ch-back' }, '↩ revient au premier'));
    root.appendChild(row);
  }

  window.Sim2 = { memBoard: memBoard, memStatic: memStatic, matrixView: matrixView, memTracer: memTracer, builder: builder, arrayShift: arrayShift, stackPlay: stackPlay, queuePlay: queuePlay, parens: parens, postfix: postfix, chain: chain,
    scen: { vars: tVars, local: tLocal, ptr: tPtr, pp: tPP, alloueKo: tAlloueKo, alloueOk: tAlloueOk, matrix: tMatrix, malloc: tMalloc, copy: tCopy, ref: tRef, leak: eLeak, nul: eNull, dbl: eDouble, dang: eDangling, parcours: tParcours, teteOk: function () { return tTete(true); }, teteKo: function () { return tTete(false); }, fin: tFin, supprMilieu: tSupprMilieu, supprTete: tSupprTete, enfiler: tEnfiler, defiler: tDefiler },
    code: { vars: CODE_VARS, local: CODE_LOCAL, ptr: CODE_PTR, pp: CODE_PP, alloueKo: CODE_ALLOUE_KO, alloueOk: CODE_ALLOUE_OK, matrix: CODE_MATRIX, malloc: CODE_MALLOC, copy: CODE_COPY, ref: CODE_REF, err: E_CODES, parcours: CODE_PARCOURS, teteOk: CODE_TETE_OK, teteKo: CODE_TETE_KO, fin: CODE_FIN, suppr: CODE_SUPPR, supprTete: CODE_SUPPR_TETE, enfiler: CODE_ENFILER, defiler: CODE_DEFILER } };
})();
