/* Simulations de la séance 3 : arbres binaires, parcours, arbres binaires de recherche, tas.
   Dépend de sim.js (window.Sim) et sim2.js (window.Sim2). Les arbres sont dessinés en SVG. */
(function () {
  var S0 = window.Sim, S2 = window.Sim2, h = S0.h, sv = S0.sv, stepper = S0.stepper, codeBlock = S0.codeBlock, btn = S0.btn, clearOn = S0.clearOn, arrayViz = S0.arrayViz;
  function $(s) { return typeof s === 'string' ? document.querySelector(s) : s; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var css = document.createElement('style');
  css.textContent = [
    '.t3 svg{display:block;margin:0 auto;overflow:hidden}',
    '.t3 .e{stroke:var(--muted);stroke-width:3.5;fill:none;stroke-linecap:round}',
    '.t3 .e.hot{stroke:var(--accent);stroke-width:5}',
    '.t3 .e.dim{opacity:.22}',
    '.t3 .nd circle{fill:var(--surface);stroke:var(--head);stroke-width:3.5;transition:fill .3s,stroke .3s}',
    '.t3 .nd text{fill:var(--head);font:700 30px var(--mono);text-anchor:middle;dominant-baseline:central}',
    '.t3 .nd .tg{fill:var(--muted);font:700 23px var(--mono);dominant-baseline:auto;paint-order:stroke;stroke:var(--surface);stroke-width:7px;stroke-linejoin:round}',
    '.t3 .nd .ix{fill:var(--muted);font:600 22px var(--mono);dominant-baseline:auto}',
    '.t3 .nd.cur circle{fill:var(--accent-soft);stroke:var(--blue);stroke-width:6}',
    '.t3 .nd.stk circle{fill:var(--accent-soft);stroke:var(--blue)}',
    '.t3 .nd.vis circle,.t3 .nd.found circle{fill:var(--ok-soft);stroke:var(--ok)}',
    '.t3 .nd.vis text,.t3 .nd.found text{fill:var(--ok)}',
    '.t3 .nd.path circle{fill:var(--warn-soft);stroke:var(--warn)}',
    '.t3 .nd.cmp circle{fill:var(--warn-soft);stroke:var(--warn);stroke-width:5}',
    '.t3 .nd.bad circle{fill:var(--bad-soft);stroke:var(--bad)}',
    '.t3 .nd.bad text{fill:var(--bad)}',
    '.t3 .nd.sub circle{fill:var(--panel);stroke:var(--blue);stroke-dasharray:8 5}',
    '.t3 .nd.dim{opacity:.22}',
    '.t3 .nd.ghost circle{fill:none;stroke:var(--line);stroke-dasharray:6 6}',
    '.t3 .nd.new circle{fill:var(--ok-soft);stroke:var(--ok);stroke-width:6}',
    '.t3 .nd.new{animation:t3pop .5s ease-out}',
    '@keyframes t3pop{from{opacity:0}to{opacity:1}}',
    '.t3 .lvl{fill:var(--muted);font:600 22px var(--font);dominant-baseline:central}',
    '.t3-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap;min-height:60px}',
    '.t3-row .lab{font:600 24px var(--font);color:var(--muted);min-width:170px}',
    '.t3-box{border:3px solid var(--head);border-radius:12px;background:var(--panel);font:700 28px var(--mono);padding:2px 14px;min-width:54px;text-align:center;color:var(--head)}',
    '.t3-box.ok{border-color:var(--ok);background:var(--ok-soft);color:var(--ok)}',
    '.t3-box.hl{border-color:var(--blue);background:var(--accent-soft)}',
    '.t3-box.mt{border-style:dashed;color:var(--muted);background:none}',
    '.t3 .info{font-size:27px;line-height:1.5;color:var(--fg)}',
    '.t3 .info b{color:var(--head)}',
    '.t3 .kv{display:grid;grid-template-columns:auto 1fr;gap:8px 24px;font-size:32px}',
    '.t3 .kv .k{color:var(--muted)}',
    '.t3 .kv .v{font:700 1em var(--mono);color:var(--head)}',
    '.t3 .nd{cursor:default}.t3.click .nd{cursor:pointer}',
    '.t3 .nd.ghost{cursor:default}'
  ].join('\n');
  document.head.appendChild(css);

  /* ============================ Arbres : données ============================ */
  function T(v, l, r) { return { id: String(v), v: v, l: l || null, r: r || null }; }
  function height(a) { return a ? 1 + Math.max(height(a.l), height(a.r)) : -1; }
  function size(a) { return a ? 1 + size(a.l) + size(a.r) : 0; }
  function inorder(a, o) { o = o || []; if (a) { inorder(a.l, o); o.push(a.v); inorder(a.r, o); } return o; }
  function find(a, id) { if (!a) return null; if (a.id === id) return a; return find(a.l, id) || find(a.r, id); }
  function parentOf(a, id) { if (!a) return null; if ((a.l && a.l.id === id) || (a.r && a.r.id === id)) return a; return parentOf(a.l, id) || parentOf(a.r, id); }
  function ids(a, o) { o = o || []; if (a) { o.push(a.id); ids(a.l, o); ids(a.r, o); } return o; }
  function depthOf(a, id, d) { if (!a) return -1; d = d || 0; if (a.id === id) return d; var x = depthOf(a.l, id, d + 1); return x >= 0 ? x : depthOf(a.r, id, d + 1); }
  function bstIns(a, v) { if (!a) return T(v); if (v < a.v) a.l = bstIns(a.l, v); else if (v > a.v) a.r = bstIns(a.r, v); return a; }
  function bstFrom(list) { var r = null; list.forEach(function (v) { r = bstIns(r, v); }); return r; }
  function minNode(a) { while (a.l) a = a.l; return a; }
  function bstDel(a, v) {
    if (!a) return null;
    if (v < a.v) a.l = bstDel(a.l, v); else if (v > a.v) a.r = bstDel(a.r, v);
    else {
      if (!a.l) return a.r; if (!a.r) return a.l;
      var s = minNode(a.r); a.v = s.v; a.id = String(s.v); a.r = bstDel(a.r, s.v);
    }
    return a;
  }

  /* ============================ Mise en page ============================ */
  var DX = 84, DY = 104;
  /* Mise en page « ordre infixe » : x = rang dans le parcours infixe, y = profondeur. */
  function lay(root, cls, tags, o) {
    o = o || {};
    var nodes = [], k = 0;
    (function go(a, d, p) {
      if (!a) return;
      go(a.l, d + 1, a);
      var nd = { id: a.id, v: a.v, x: k++ * DX, y: d * DY, p: p ? p.id : null, cls: (cls && cls[a.id]) || '', tag: tags && tags[a.id] };
      nodes.push(nd);
      go(a.r, d + 1, a);
    })(root, 0, null);
    var W = Math.max(nodes.length, o.minN || 9) * DX, H = Math.max(height(root), o.minH == null ? 3 : o.minH) * DY + 52 + 84;
    var off = (W - nodes.length * DX) / 2;
    nodes.forEach(function (n) { n.x += off + DX / 2; n.y += 52; });
    return { nodes: nodes, w: W, h: H };
  }
  /* Mise en page « tas » : niveau par niveau, position fixe selon l'indice. */
  function layHeap(items, cls, o) {
    o = o || {};
    var L = o.levels || 4, leaves = Math.pow(2, L - 1), dx = o.dx || 100, W = leaves * dx, nodes = [];
    items.forEach(function (it, i) {
      var lv = Math.floor(Math.log(i + 1) / Math.LN2 + 1e-9), pos = i + 1 - Math.pow(2, lv), per = Math.pow(2, lv);
      nodes.push({ id: 'i' + i, v: it.v, x: (pos + .5) * W / per, y: lv * (o.dy || 100) + 52, p: i ? 'i' + Math.floor((i - 1) / 2) : null, cls: (cls && cls[i]) || '', ix: i, tag: it.name });
    });
    return { nodes: nodes, w: W, h: (L - 1) * (o.dy || 100) + 52 + 84 + (o.names ? 22 : 0) };
  }

  function drawTree(host, F, o) {
    o = o || {};
    host.classList.add('t3'); host.innerHTML = '';
    var R = o.r || 33, scale = Math.min(o.scale || 1, (o.maxH || 380) / F.h);
    var svg = sv('svg', { viewBox: '0 0 ' + F.w + ' ' + F.h, style: 'width:100%;max-width:' + Math.round(F.w * scale) + 'px;height:auto' });
    var byId = {}; F.nodes.forEach(function (n) { byId[n.id] = n; });
    F.nodes.forEach(function (n) {
      if (n.p && byId[n.p]) {
        var q = byId[n.p], dim = (n.cls || '').indexOf('dim') >= 0, hot = o.hot && o.hot[n.id];
        svg.appendChild(sv('line', { class: 'e' + (dim ? ' dim' : '') + (hot ? ' hot' : ''), x1: q.x, y1: q.y, x2: n.x, y2: n.y }));
      }
    });
    F.nodes.forEach(function (n) {
      var g = sv('g', { class: 'nd ' + (n.cls || ''), transform: 'translate(' + n.x + ',' + n.y + ')' });
      g.dataset.id = n.id;
      g.appendChild(sv('circle', { r: R }));
      var t = sv('text', { y: 1 }); t.textContent = n.v; g.appendChild(t);
      if (n.ix != null) { var ix = sv('text', { class: 'ix', x: -R - 6, y: -R + 6, 'text-anchor': 'end' }); ix.textContent = n.ix; g.appendChild(ix); }
      if (n.tag) { var tg = sv('text', { class: 'tg', x: 0, y: n.p ? R + 24 : -R - 10 }); tg.textContent = n.tag; g.appendChild(tg); }
      svg.appendChild(g);
    });
    if (o.levels) o.levels.forEach(function (l) { var t = sv('text', { class: 'lvl', x: 6, y: l.y }); t.textContent = l.t; svg.appendChild(t); });
    host.appendChild(svg);
    return svg;
  }

  function boxRow(label, items, o) {
    o = o || {};
    var row = h('div', { class: 't3-row' }, h('span', { class: 'lab' }, label));
    if (!items.length) row.appendChild(h('span', { class: 't3-box mt' }, o.empty || '∅'));
    items.forEach(function (x, i) { row.appendChild(h('span', { class: 't3-box' + (o.hl === i ? ' hl' : '') + (o.ok ? ' ok' : '') }, String(x))); });
    return row;
  }

  /* ============================ Lecteur générique ============================
     steps : [{ line, note, F (arbre), out, stack, queue, arr, ops, info }]
     cfg   : { code, steps, scenarios, codeW, codeSize, out:'Ordre de visite', stack:'Pile d'appels', queue:'File', arr:true } */
  function play(root, cfg) {
    root = $(root); root.classList.add('sim');
    var steps = cfg.steps, cb, codeHold = h('div');
    var treeEl = h('div', { style: 'min-height:' + (cfg.treeH || 300) + 'px' }), extra = h('div'), opsEl = h('div', { class: 'ops' }), arrEl = h('div');
    var note = h('div', { class: 'note', style: 'font-size:' + (cfg.noteSize || 26) + 'px;min-height:' + (cfg.noteH || 100) + 'px' });
    function setCode(lines) { cb = codeBlock(lines); cb.el.classList.add('sm'); cb.el.style.fontSize = (cfg.codeSize || 22) + 'px'; codeHold.innerHTML = ''; codeHold.appendChild(cb.el); }
    if (!cfg.noCode) setCode(cfg.code);
    function render(k) {
      var st = steps[k]; drawTree(treeEl, st.F, { r: cfg.r, hot: st.hot, levels: st.levels, scale: cfg.scale || .86, maxH: cfg.maxH });
      if (cb) cb.lines.forEach(function (l, i) { l.classList.toggle('hl', i === st.line); });
      note.innerHTML = st.note || '';
      extra.innerHTML = '';
      if (st.vars) extra.appendChild(boxRow(cfg.varsLabel || 'Variables locales', st.vars, { empty: '—' }));
      if (st.stack) extra.appendChild(boxRow(cfg.stackLabel || 'Pile d’appels', st.stack.map(function (s) { return s; }), { empty: 'vide', hl: st.stack.length - 1 }));
      if (st.queue) extra.appendChild(boxRow(cfg.queueLabel || 'File', st.queue, { empty: 'vide', hl: 0 }));
      if (st.out) extra.appendChild(boxRow(cfg.outLabel || 'Ordre de visite', st.out, { empty: '…', ok: true }));
      if (st.arr) { arrEl.innerHTML = ''; var a = h('div'); arrEl.appendChild(a); arrayViz(a, { values: st.arr.v, cls: st.arr.cls, ptrs: {}, cw: cfg.cw || 56 }); }
      if (st.ops) { opsEl.innerHTML = ''; opsEl.append(String(st.ops[0]), h('small', null, st.ops[1])); } else opsEl.innerHTML = '';
    }
    var sp = stepper(function () { return steps.length; }, render, { delay: cfg.delay || 1500, noSpeed: true });
    var scen = h('div', { class: 'row', style: 'margin-bottom:10px;gap:10px' });
    if (cfg.scenarios) cfg.scenarios.forEach(function (sc, i) {
      var b = btn(sc.label, function () { clearOn(scen); b.classList.add('on'); steps = sc.steps; if (!cfg.noCode) setCode(sc.code || cfg.code); sp.reset(); }, 'sm' + (i === 0 ? ' on' : '')); scen.appendChild(b);
    });
    var right = h('div', { class: 'col', style: 'gap:10px;min-width:0' }, treeEl, cfg.arr ? arrEl : '', extra, opsEl, note);
    var body = cfg.noCode ? right : h('div', { class: 'mb-side', style: 'grid-template-columns:' + (cfg.codeW || 600) + 'px minmax(0,1fr)' }, codeHold, right);
    root.append(cfg.scenarios ? scen : '', body, sp.el);
    sp.go(0);
    return { go: sp.go };
  }

  /* ============================ Exemples ============================ */
  function treeA() { /* un arbre « quelconque » pour le vocabulaire */
    return T('A', T('B', T('D'), T('E', T('H'), T('I'))), T('C', null, T('F', T('G'))));
  }
  function treeBST() { return bstFrom([8, 3, 10, 1, 6, 14, 4, 7, 13]); }

  /* ----- Explorer : cliquer sur un nœud pour lire son vocabulaire ----- */
  function explore(rootEl, o) {
    rootEl = $(rootEl); rootEl.classList.add('sim');
    var tree = (o && o.tree) || treeA(), sel = null;
    var host = h('div', { class: 'click' }), info = h('div', { class: 'info t3' });
    var body = h('div', { style: 'display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:34px;align-items:start' }, host, info);
    rootEl.append(body);
    function sub(a, set) { if (a) { set[a.id] = 1; sub(a.l, set); sub(a.r, set); } }
    function draw() {
      var cls = {}, hot = {};
      if (sel) {
        var n = find(tree, sel), set = {}; sub(n, set); Object.keys(set).forEach(function (k) { cls[k] = 'sub'; });
        var p = parentOf(tree, sel), c = n; while (p) { cls[p.id] = 'path'; hot[c.id] = 1; c = p; p = parentOf(tree, p.id); }
        cls[sel] = 'cur';
      }
      var F = lay(tree, cls, null, { minN: 9 });
      F.nodes.forEach(function (nd) { if (nd.id === 'A' && !sel) nd.tag = 'racine'; });
      var svg = drawTree(host, F, { hot: hot, scale: 1.3, r: 36, maxH: 430 });
      host.classList.add('click');
      [].forEach.call(svg.querySelectorAll('.nd'), function (g) { g.addEventListener('click', function () { sel = g.dataset.id; draw(); }); });
      info.innerHTML = '';
      if (!sel) { info.innerHTML = '<div class="small">Cliquez sur un nœud pour lire son <b>vocabulaire</b>.</div>'; return; }
      var n2 = find(tree, sel), pr = parentOf(tree, sel);
      var kind = !pr ? 'racine' : (!n2.l && !n2.r ? 'feuille' : 'nœud interne');
      var kv = h('div', { class: 'kv' });
      [['Nœud', n2.v], ['Type', kind], ['Parent', pr ? pr.v : 'aucun'], ['Fils gauche', n2.l ? n2.l.v : 'NULL'], ['Fils droit', n2.r ? n2.r.v : 'NULL'],
       ['Profondeur', depthOf(tree, sel)], ['Hauteur', height(n2)], ['Taille du sous-arbre', size(n2)]].forEach(function (r) { kv.append(h('span', { class: 'k' }, r[0]), h('span', { class: 'v' }, String(r[1]))); });
      info.appendChild(kv);
      info.appendChild(h('div', { class: 'small', style: 'margin-top:14px', html: 'Le sous-arbre de <b>' + n2.v + '</b> est en pointillés. Le chemin jusqu’à la racine est en jaune.' }));
    }
    draw();
  }

  /* ----- Niveaux : combien de nœuds au plus ? ----- */
  function levels(rootEl) {
    rootEl = $(rootEl); rootEl.classList.add('sim');
    var H = 3, host = h('div', { class: 't3' }), info = h('div', { class: 'info t3' });
    var slider = h('input', { type: 'range', min: 0, max: 4, value: H, 'aria-label': 'Hauteur' });
    var lab = h('span', { class: 'mono', style: 'font:700 30px var(--mono);color:var(--accent)' });
    rootEl.append(h('div', { style: 'display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:34px;align-items:start' }, host, info),
      h('div', { class: 'ctl' }, h('label', null, 'Hauteur h ', slider, lab)));
    function perfect(d) { return d < 0 ? null : (function mk(k, i) { var a = { id: k + '_' + i, v: '', l: null, r: null }; if (k < d) { a.l = mk(k + 1, 2 * i); a.r = mk(k + 1, 2 * i + 1); } return a; })(0, 0); }
    function draw() {
      H = +slider.value; lab.textContent = 'h = ' + H;
      var n = Math.pow(2, H + 1) - 1, items = [], cls = {}; for (var q = 0; q < n; q++) items.push({ v: '' }); for (var q2 = Math.pow(2, H) - 1; q2 < n; q2++) cls[q2] = 'stk';
      drawTree(host, layHeap(items, cls, { levels: 5, dx: 66, dy: 80 }), { r: 21, scale: 1.1, maxH: 420 });
      var rows = '';
      for (var k2 = 0; k2 <= H; k2++) rows += '<tr><td>niveau ' + k2 + '</td><td class="mono">2<sup>' + k2 + '</sup> = ' + Math.pow(2, k2) + '</td></tr>';
      var total = Math.pow(2, H + 1) - 1;
      info.innerHTML = '<table class="tbl" style="font-size:27px">' + rows + '</table><div style="margin-top:12px;font-size:29px">Total : <b class="mono">2<sup>' + (H + 1) + '</sup> − 1 = ' + total + '</b> nœuds au plus.</div>';
    }
    slider.addEventListener('input', draw); draw();
  }

  /* ----- Parcours : préfixe, infixe, postfixe, largeur ----- */
  function travSteps(t, order, concept) {
    var steps = [], out = [], stack = [], vis = {};
    var VL = { pre: 2, 'in': 3, post: 4 }[order], LL = { pre: 3, 'in': 2, post: 2 }[order], RL = { pre: 4, 'in': 4, post: 3 }[order];
    var seq = { pre: ['V', 'L', 'R'], 'in': ['L', 'V', 'R'], post: ['L', 'R', 'V'] }[order];
    function names() { return stack.map(function (id) { return id === '∅' ? 'NULL' : id; }); }
    function frame(cur, note, line) {
      var cls = {}; stack.forEach(function (id) { cls[id] = 'stk'; }); Object.keys(vis).forEach(function (id) { cls[id] = 'vis'; }); if (cur) cls[cur] = 'cur';
      steps.push({ line: line, note: note, F: lay(t, cls), out: out.slice(), stack: names() });
    }
    var fn = { pre: 'prefixe', 'in': 'infixe', post: 'postfixe' }[order];
    function run(a, line, what) {
      stack.push(a ? a.id : '∅');
      if (!a) { frame(null, what + (concept ? ' Ce fils n’existe pas : il n’y a rien à visiter, on remonte.' : ' Ce fils n’existe pas : <b>a == NULL</b>, on retourne tout de suite à l’appelant.'), 1); stack.pop(); return; }
      frame(a.id, what + ' Le nœud courant est <b>' + a.v + '</b>.', line);
      seq.forEach(function (s) {
        if (s === 'V') { out.push(a.v); vis[a.id] = 1; frame(a.id, concept ? 'On <b>visite</b> <b>' + a.v + '</b> : on le note dans la liste.' : '<b>printf(' + a.v + ')</b> : on affiche <b>' + a.v + '</b>.', VL); }
        else if (s === 'L') run(a.l, LL, concept ? 'On descend au <b>fils gauche</b> de ' + a.v + '.' : 'Appel <b>' + fn + '(a->gauche)</b> depuis ' + a.v + '.');
        else run(a.r, RL, concept ? 'On descend au <b>fils droit</b> de ' + a.v + '.' : 'Appel <b>' + fn + '(a->droit)</b> depuis ' + a.v + '.');
      });
      stack.pop();
    }
    run(t, 0, concept ? 'On part de la <b>racine</b>.' : 'Appel initial <b>' + fn + '(racine)</b>.');
    var cls2 = {}; Object.keys(vis).forEach(function (id) { cls2[id] = 'vis'; });
    steps.push({ line: 0, note: 'Fin du parcours : chaque nœud a été visité <b>exactement une fois</b>. Ordre obtenu : <b>' + out.join(' ') + '</b>.', F: lay(t, cls2), out: out.slice(), stack: [] });
    return steps;
  }
  var CODE_TRAV = {
    pre: ['void prefixe(Noeud *a) {', '    if (a == NULL) return;', '    printf("%d ", a->valeur);', '    prefixe(a->gauche);', '    prefixe(a->droit);', '}'],
    'in': ['void infixe(Noeud *a) {', '    if (a == NULL) return;', '    infixe(a->gauche);', '    printf("%d ", a->valeur);', '    infixe(a->droit);', '}'],
    post: ['void postfixe(Noeud *a) {', '    if (a == NULL) return;', '    postfixe(a->gauche);', '    postfixe(a->droit);', '    printf("%d ", a->valeur);', '}']
  };
  function bfsSteps(t) {
    var steps = [], out = [], q = [t], vis = {};
    function names() { return q.map(function (n) { return n.v; }); }
    function frame(cur, note, line) {
      var cls = {}; q.forEach(function (n) { cls[n.id] = 'stk'; }); Object.keys(vis).forEach(function (id) { cls[id] = 'vis'; }); if (cur) cls[cur.id] = 'cur';
      steps.push({ line: line, note: note, F: lay(t, cls), out: out.slice(), queue: names() });
    }
    frame(null, '<b>enfiler(racine)</b> : la file contient la racine <b>' + t.v + '</b>. On visitera les nœuds <b>niveau par niveau</b>.', 0);
    while (q.length) {
      var x = q.shift();
      frame(x, '<b>x ← défiler()</b> : on sort le plus ancien de la file, <b>' + x.v + '</b>.', 2);
      out.push(x.v); vis[x.id] = 1; q.unshift();
      var cls = {}; Object.keys(vis).forEach(function (id) { cls[id] = 'vis'; }); q.forEach(function (n) { cls[n.id] = 'stk'; }); cls[x.id] = 'cur';
      steps.push({ line: 3, note: '<b>visiter(' + x.v + ')</b> : on affiche <b>' + x.v + '</b>.', F: lay(t, cls), out: out.slice(), queue: names() });
      if (x.l) { q.push(x.l); frame(x, '<b>enfiler(x.gauche)</b> : le fils gauche <b>' + x.l.v + '</b> se place à la fin de la file.', 4); }
      if (x.r) { q.push(x.r); frame(x, '<b>enfiler(x.droit)</b> : le fils droit <b>' + x.r.v + '</b> se place à la fin de la file.', 5); }
    }
    steps.push({ line: 1, note: 'La file est vide : le parcours est terminé. Ordre obtenu : <b>' + out.join(' ') + '</b>, c’est-à-dire <b>niveau par niveau</b>.', F: lay(t, (function () { var c = {}; ids(t).forEach(function (i) { c[i] = 'vis'; }); return c; })()), out: out.slice(), queue: [] });
    return steps;
  }
  var CODE_BFS = ['enfiler(racine)', 'tant que la file n’est pas vide faire', '    x ← défiler()', '    visiter(x)', '    si x.gauche ≠ NULL alors enfiler(x.gauche)', '    si x.droit ≠ NULL alors enfiler(x.droit)'];
  function traverse(rootEl, o) {
    o = o || {}; var t = o.tree || treeA(), cn = !!o.noCode;
    var all = [{ label: 'Préfixe', steps: travSteps(t, 'pre', cn), code: CODE_TRAV.pre }, { label: 'Infixe', steps: travSteps(t, 'in', cn), code: CODE_TRAV['in'] },
      { label: 'Postfixe', steps: travSteps(t, 'post', cn), code: CODE_TRAV.post }, { label: 'En largeur (avec une file)', steps: bfsSteps(t), code: CODE_BFS }];
    var sc = o.only ? all.filter(function (s) { return o.only.indexOf(s.label) >= 0; }) : all;
    play(rootEl, { code: sc[0].code, steps: sc[0].steps, scenarios: sc.length > 1 ? sc : null, noCode: cn, codeW: 600, codeSize: 23, delay: 1200, treeH: o.treeH || 300, scale: o.scale || .86 });
  }

  /* ----- ABR : recherche ----- */
  function searchSteps(t, x, concept) {
    var steps = [], cls = {}, hot = {}, cnt = 0, a = t, prev = null;
    function sub(n, set) { if (n) { set[n.id] = 'dim'; sub(n.l, set); sub(n.r, set); } }
    function F(extra) { var c = Object.assign({}, cls, extra || {}); return lay(t, c); }
    steps.push({ line: 1, note: 'On cherche <b>' + x + '</b> dans cet arbre binaire de recherche. On part de la <b>racine</b>.', F: F(), ops: [0, 'comparaisons'] });
    while (a) {
      cnt++;
      if (x === a.v) { cls[a.id] = 'found'; steps.push({ line: 2, note: '<b>' + x + ' = ' + a.v + '</b> : trouvé ! Il a fallu visiter <b>' + cnt + '</b> nœud' + (cnt > 1 ? 's' : '') + ', sur un arbre de ' + size(t) + ' nœuds.', F: F(), ops: [cnt, 'nœuds visités'] }); return steps; }
      var go = x < a.v ? 'l' : 'r', other = x < a.v ? 'r' : 'l';
      steps.push({ line: x < a.v ? 3 : 4, note: '<b>' + x + (x < a.v ? ' < ' : ' > ') + a.v + '</b> : si ' + x + ' est dans l’arbre, il est forcément dans le sous-arbre <b>' + (x < a.v ? 'gauche' : 'droit') + '</b>. Tout l’autre côté est éliminé.', F: F((function () { var s = {}; sub(a[other], s); s[a.id] = 'cur'; return s; })()), ops: [cnt, 'nœuds visités'] });
      sub(a[other], cls); cls[a.id] = 'path';
      prev = a; a = a[go];
    }
    steps.push({ line: 6, note: concept ? 'On est arrivé au bout d’une branche sans trouver <b>' + x + '</b> : il est <b>absent</b>. Coût : ' + cnt + ' nœuds visités.' : '<b>a == NULL</b> : la boucle s’arrête, on a atteint le bout d’une branche sans trouver <b>' + x + '</b> : <b>return NULL</b>. Coût : ' + cnt + ' nœuds visités.', F: F(), ops: [cnt, 'nœuds visités'] });
    return steps;
  }
  var CODE_SEARCH = ['Noeud *abr_chercher(Noeud *a, int v) {', '    while (a != NULL) {', '        if (v == a->valeur) return a;', '        if (v < a->valeur) a = a->gauche;', '        else               a = a->droit;', '    }', '    return NULL;      // absent', '}'];
  function abrSearch(rootEl, o) {
    o = o || {}; var cn = !!o.noCode, t = treeBST();
    var sc = [[7, 'Chercher 7'], [13, 'Chercher 13'], [5, 'Chercher 5 (absent)'], [8, 'Chercher 8 (la racine)']].map(function (z) { return { label: z[1], steps: searchSteps(t, z[0], cn), code: CODE_SEARCH }; });
    play(rootEl, { code: CODE_SEARCH, steps: sc[0].steps, scenarios: sc, noCode: cn, codeW: 700, codeSize: 22, delay: 1500, treeH: 300 });
  }

  /* ----- ABR : insertion ----- */
  function insSteps(t0, x, concept) {
    var t = clone(t0), steps = [], cls = {}, a = t, cnt = 0, prev = null, side = null;
    function F(extra) { return lay(t, Object.assign({}, cls, extra || {})); }
    steps.push({ line: 0, note: 'On veut insérer <b>' + x + '</b>. Comme pour une recherche, on descend depuis la racine : la place de ' + x + ' est celle où on le <b>chercherait</b>.', F: F(), ops: [0, 'comparaisons'] });
    while (a) {
      cnt++;
      var left = x < a.v;
      steps.push({ line: left ? 4 : 6, note: '<b>' + x + (left ? ' < ' : ' > ') + a.v + '</b> : on descend à <b>' + (left ? 'gauche' : 'droite') + '</b>.', F: F((function () { var c = {}; c[a.id] = 'cur'; return c; })()), ops: [cnt, 'comparaisons'] });
      cls[a.id] = 'path'; prev = a; side = left ? 'l' : 'r'; a = left ? a.l : a.r;
    }
    prev[side] = T(x);
    steps.push({ line: 2, note: (concept ? 'La place est libre. ' : '<b>a == NULL</b> : la place est libre, <b>creer_noeud(' + x + ')</b> renvoie le nouveau nœud. ') + 'On crée le nœud <b>' + x + '</b> et on l’accroche ici : une <b>feuille</b> de plus. Aucun autre nœud n’a bougé.', F: F((function () { var c = {}; c[String(x)] = 'new'; return c; })()), ops: [cnt, 'comparaisons'] });
    steps.push({ line: 7, note: (concept ? 'Les liens existants sont <b>conservés</b>. ' : 'Chaque appel exécute <b>return a</b> : il renvoie sa racine, et <span class="mono">a->gauche = …</span> remet le même pointeur (ou le nouveau nœud). ') + 'L’insertion a coûté <b>' + cnt + '</b> comparaisons : au plus la <b>hauteur</b> de l’arbre + 1.', F: F(), ops: [cnt, 'comparaisons'] });
    return steps;
  }
  var CODE_INS = ['Noeud *abr_inserer(Noeud *a, int v) {', '    if (a == NULL)', '        return creer_noeud(v);', '    if (v < a->valeur)', '        a->gauche = abr_inserer(a->gauche, v);', '    else if (v > a->valeur)', '        a->droit = abr_inserer(a->droit, v);', '    return a;', '}'];
  function abrInsert(rootEl, o) {
    o = o || {}; var cn = !!o.noCode, t = treeBST();
    var sc = [[5, 'Insérer 5'], [12, 'Insérer 12'], [2, 'Insérer 2']].map(function (z) { return { label: z[1], steps: insSteps(t, z[0], cn), code: CODE_INS }; });
    play(rootEl, { code: CODE_INS, steps: sc[0].steps, scenarios: sc, noCode: cn, codeW: 720, codeSize: 21, delay: 1500, treeH: 300 });
  }

  /* ----- ABR : minimum et maximum en C ----- */
  function minSteps(t, side) {
    var steps = [], a = t, cls = {}, mx = side === 'droit', nm = mx ? 'droit' : 'gauche', cnt = 0;
    function F(id, c) { var o = Object.assign({}, cls); o[id] = c; return lay(t, o); }
    steps.push({ line: 1, note: 'On cherche le ' + (mx ? 'maximum' : 'minimum') + '. <b>a</b> désigne la racine <b>' + a.v + '</b>.', F: F(a.id, 'cur'), ops: [0, 'déplacements'] });
    while (a[mx ? 'r' : 'l']) {
      steps.push({ line: 1, note: '<b>a->' + nm + ' != NULL</b> : ' + a.v + ' a un fils ' + nm + ', donc il existe une valeur ' + (mx ? 'plus grande' : 'plus petite') + '. On continue.', F: F(a.id, 'cur'), ops: [cnt, 'déplacements'] });
      cls[a.id] = 'path'; a = a[mx ? 'r' : 'l']; cnt++;
      steps.push({ line: 2, note: '<b>a = a->' + nm + '</b> : on descend sur <b>' + a.v + '</b>.', F: F(a.id, 'cur'), ops: [cnt, 'déplacements'] });
    }
    steps.push({ line: 1, note: '<b>a->' + nm + ' == NULL</b> : plus de fils ' + nm + ', la boucle s’arrête.', F: F(a.id, 'cur'), ops: [cnt, 'déplacements'] });
    steps.push({ line: 3, note: '<b>return a</b> : le ' + (mx ? 'maximum' : 'minimum') + ' est <b>' + a.v + '</b>, trouvé en ' + cnt + ' déplacements : au plus la hauteur de l’arbre.', F: F(a.id, 'found'), ops: [cnt, 'déplacements'] });
    return steps;
  }
  function abrMin(rootEl) {
    var t = treeBST();
    var cMin = ['Noeud *abr_min(Noeud *a) {', '    while (a->gauche != NULL)', '        a = a->gauche;', '    return a;', '}'], cMax = ['Noeud *abr_max(Noeud *a) {', '    while (a->droit != NULL)', '        a = a->droit;', '    return a;', '}'];
    var sc = [{ label: 'Le minimum', steps: minSteps(t, 'gauche'), code: cMin }, { label: 'Le maximum', steps: minSteps(t, 'droit'), code: cMax }];
    play(rootEl, { code: cMin, steps: sc[0].steps, scenarios: sc, codeW: 600, codeSize: 24, delay: 1500, treeH: 300 });
  }

  /* ----- ABR : suppression ----- */
  function delSteps(kind) {
    var t = treeBST(), steps = [], cls = {};
    function F(extra, tr) { return lay(tr || t, Object.assign({}, cls, extra || {})); }
    if (kind === 'feuille') {
      steps.push({ line: 0, note: 'On veut supprimer <b>4</b>. D’abord, on le <b>cherche</b> (comme avant), puis on regarde combien de fils il a.', F: F({ 4: 'cur' }) });
      steps.push({ line: 1, note: '<b>4 n’a aucun fils</b> : c’est une feuille. On la retire : le champ <b>droit... gauche</b> de son parent <b>6</b> est mis à <b>NULL</b>, puis on libère le nœud.'.replace('droit... gauche', 'gauche'), F: F({ 4: 'bad', 6: 'path' }) });
      var t2 = bstFrom([8, 3, 10, 1, 6, 14, 7, 13]); steps.push({ line: 1, note: '<b>Cas 1 réglé</b> : le reste de l’arbre n’a pas bougé et reste un arbre binaire de recherche.', F: F({}, t2) });
    } else if (kind === 'un') {
      steps.push({ line: 2, note: 'On veut supprimer <b>14</b>. Il a <b>un seul fils</b> : 13.', F: F({ 14: 'cur', 13: 'path' }) });
      steps.push({ line: 3, note: 'Le parent <b>10</b> va désormais pointer <b>directement vers 13</b>, qui prend la place de 14 avec tout son sous-arbre. On libère ensuite le nœud 14.', F: F({ 14: 'bad', 10: 'path', 13: 'path' }) });
      var t3 = bstFrom([8, 3, 10, 1, 6, 4, 7, 13]); steps.push({ line: 3, note: '<b>Cas 2 réglé</b> : 13 est maintenant le fils droit de 10. L’ordre est toujours respecté : 13 > 10.', F: F({ 13: 'found' }, t3) });
    } else {
      steps.push({ line: 4, note: 'On veut supprimer <b>3</b>. Il a <b>deux fils</b> (1 et 6) : on ne peut pas simplement le retirer, il faudrait deux liens vers un seul parent.', F: F({ 3: 'cur', 1: 'path', 6: 'path' }) });
      steps.push({ line: 5, note: 'Idée : le nœud qui prendra sa place doit rester <b>plus grand que tout le sous-arbre gauche</b> et <b>plus petit que tout le sous-arbre droit</b>. C’est le <b>plus petit élément du sous-arbre droit</b> : le <b>successeur</b>. On descend à droite (6), puis toujours à gauche.', F: F({ 3: 'cur', 6: 'path', 4: 'found' }) });
      var t4 = treeBST(); find(t4, '3').v = 4; var cl = { 3: 'found', 4: 'bad' };
      steps.push({ line: 6, note: 'On <b>copie la valeur 4</b> dans le nœud de 3. L’ordre est respecté : 1 < 4 < 6, 7. Il reste un doublon à retirer : l’ancien nœud 4.', F: lay(t4, { 3: 'found', 4: 'bad' }) });
      var t5 = bstFrom([8, 3, 10, 1, 6, 14, 7, 13]); find(t5, '3').v = 4;
      steps.push({ line: 7, note: '<b>On supprime l’ancien nœud 4</b>, qui est une feuille (cas 1). Résultat : un arbre binaire de recherche valide, où <b>4</b> a pris la place de 3.', F: lay(t5, { 3: 'found' }) });
    }
    return steps;
  }
  var CODE_DEL = ['si le nœud est une feuille alors', '    le retirer : le parent pointe vers NULL', 'si le nœud a un seul fils alors', '    le parent pointe vers ce fils', 'si le nœud a deux fils alors', '    s ← minimum du sous-arbre droit (successeur)', '    copier s.valeur dans le nœud', '    supprimer s (feuille ou un seul fils)'];
  function abrDelete(rootEl) {
    var sc = [{ label: 'Une feuille (4)', steps: delSteps('feuille') }, { label: 'Un seul fils (14)', steps: delSteps('un') }, { label: 'Deux fils (3)', steps: delSteps('deux') }];
    play(rootEl, { code: CODE_DEL, steps: sc[0].steps, scenarios: sc, codeW: 720, codeSize: 21, delay: 2000, treeH: 300 });
  }

  /* ----- ABR : bac à sable (insertion, recherche, suppression, ordre d'arrivée) ----- */
  function abrPlay(rootEl, o) {
    rootEl = $(rootEl); rootEl.classList.add('sim'); o = o || {};
    var tree = o.start ? bstFrom(o.start) : null, host = h('div', { style: 'min-height:' + (o.treeH || 370) + 'px' }), info = h('div', { class: 'info t3' }), msg = h('div', { class: 'note', style: 'font-size:27px;min-height:84px' }), busy = false;
    var inp = h('input', { type: 'number', min: 0, max: 99, value: 5, 'aria-label': 'Valeur', style: 'width:110px' });
    function say(t) { msg.innerHTML = t; }
    function draw(cls, tags) { drawTree(host, lay(tree, cls, tags, { minN: o.minN || 9, minH: o.minH == null ? 3 : o.minH }), { r: o.r || 33 }); stats(); }
    function stats() {
      var n = size(tree), hh = height(tree), best = n ? Math.ceil(Math.log(n + 1) / Math.LN2) - 1 : -1;
      info.innerHTML = '<div class="kv" style="font-size:28px"><span class="k">Nœuds n</span><span class="v">' + n + '</span><span class="k">Hauteur h</span><span class="v">' + hh + '</span><span class="k">Hauteur minimale</span><span class="v">' + best + '</span><span class="k">Pire recherche</span><span class="v">' + (n ? hh + 1 : 0) + ' compar.</span></div>' +
        '<div style="margin-top:14px;font-size:26px;color:var(--muted)">Parcours infixe : <b class="mono" style="color:var(--head)">' + (n ? inorder(tree).join(' ') : '(vide)') + '</b></div>';
    }
    function pathOf(x) { var a = tree, p = [], hit = false; while (a) { p.push(a.id); if (x === a.v) { hit = true; break; } a = x < a.v ? a.l : a.r; } return { p: p, hit: hit }; }
    function ins(x) {
      if (busy) return; x = Math.round(+x); if (isNaN(x)) return;
      var pr = pathOf(x), cls = {}; pr.p.forEach(function (i) { cls[i] = 'path'; });
      if (pr.hit) { cls[String(x)] = 'found'; draw(cls); say('<b>' + x + '</b> est déjà dans l’arbre : on ne l’insère pas deux fois.'); return; }
      busy = true; draw(cls);
      say('On descend : <b>' + pr.p.length + '</b> comparaison' + (pr.p.length > 1 ? 's' : '') + ' pour trouver la place de <b>' + x + '</b>.');
      setTimeout(function () { tree = bstIns(tree, x); var c2 = {}; c2[String(x)] = 'new'; draw(c2); say('<b>' + x + '</b> est inséré comme feuille. Hauteur de l’arbre : <b>' + height(tree) + '</b>.'); busy = false; }, o.fast ? 250 : 650);
    }
    function search(x) {
      if (busy) return; x = Math.round(+x); if (isNaN(x)) return; var pr = pathOf(x), cls = {}; pr.p.forEach(function (i) { cls[i] = 'path'; }); if (pr.hit) cls[String(x)] = 'found';
      draw(cls); say(pr.hit ? '<b>' + x + '</b> trouvé en <b>' + pr.p.length + '</b> comparaisons.' : '<b>' + x + '</b> est absent : <b>' + pr.p.length + '</b> comparaisons pour s’en assurer.');
    }
    function del(x) {
      if (busy) return; x = Math.round(+x); if (isNaN(x)) return; var n = find(tree, String(x));
      if (!n) { draw(); say('<b>' + x + '</b> n’est pas dans l’arbre.'); return; }
      var kind = !n.l && !n.r ? 'une <b>feuille</b> : on la retire.' : (n.l && n.r ? '<b>deux fils</b> : on le remplace par son successeur (<b>' + minNode(n.r).v + '</b>).' : '<b>un seul fils</b> : le parent pointe vers ce fils.');
      var c = {}; c[String(x)] = 'bad'; draw(c); busy = true; say('<b>' + x + '</b> a ' + kind);
      setTimeout(function () { tree = bstDel(tree, x); draw(); busy = false; }, 800);
    }
    function load(list) { tree = bstFrom(list); draw(); }
    var row = h('div', { class: 'ctl' }, h('label', null, 'Valeur ', inp), btn('Insérer', function () { ins(inp.value); }, 'pri'), btn('Chercher', function () { search(inp.value); }), btn('Supprimer', function () { del(inp.value); }), btn('Vider', function () { tree = null; draw(); say('Arbre vide.'); }, 'sm'));
    var pre = h('div', { class: 'row', style: 'gap:10px;margin-bottom:10px;flex-wrap:wrap' });
    (o.presets || []).forEach(function (p) { pre.appendChild(btn(p.label, function () { if (p.list) load(p.list); else { load([]); var i = 0; (function nx() { if (busy) { setTimeout(nx, 120); return; } if (i >= p.seq.length) return; ins(p.seq[i++]); setTimeout(nx, 120); })(); } say(p.msg || ''); }, 'sm')); });
    if (o.random) pre.appendChild(btn('10 valeurs aléatoires', function () { var s = {}, l = []; while (l.length < 10) { var v = 1 + Math.floor(Math.random() * 40); if (!s[v]) { s[v] = 1; l.push(v); } } load(l); say('Dix valeurs dans un ordre quelconque : la hauteur reste modeste.'); }, 'sm'));
    rootEl.append(pre, h('div', { style: 'display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:30px;align-items:start' }, host, h('div', null, info, msg)), o.free === false ? '' : row);
    draw(); say(o.hint || 'Insérez des valeurs et observez la forme de l’arbre.');
  }

  /* ============================ Tas ============================ */
  function hcls(arr, map) { var c = {}; Object.keys(map || {}).forEach(function (k) { c[k] = map[k]; }); return c; }
  function hframe(items, cap, cls, o) {
    o = o || {};
    var F = layHeap(items, cls, { levels: o.levels || 4, dx: o.dx || 100, names: !!o.names, dy: o.dy });
    var v = [], c = {};
    for (var i = 0; i < cap; i++) { v.push(i < items.length ? items[i].v : '·'); c[i] = i < items.length ? (cls && cls[i] === 'cur' ? 'cur' : cls && cls[i] === 'cmp' ? 'acc' : cls && cls[i] === 'new' ? 'found' : cls && cls[i] === 'vis' ? 'found' : '') : 'range'; }
    return { F: F, arr: { v: v, cls: c } };
  }
  function copyItems(a) { return a.map(function (x) { return { v: x.v, name: x.name }; }); }

  /* Insertion avec remontée : renvoie les étapes. */
  function heapInsertSteps(base, x, o) {
    var cn = !!(o && o.concept);
    o = o || {}; var it = copyItems(base), steps = [], cap = o.cap || 15, sw = 0;
    function push(line, note, cls, ops) { var f = hframe(it, cap, cls, o); steps.push({ line: line, note: note, F: f.F, arr: f.arr, ops: ops == null ? null : [ops, 'échange' + (ops > 1 ? 's' : '')] }); }
    push(0, 'Le tas actuel, vu comme un <b>arbre</b> et rangé dans un <b>tableau</b> (même contenu, deux dessins). On veut insérer <b>' + x + '</b>.', {}, 0);
    it.push({ v: x, name: o.name }); var i = it.length - 1;
    var c0 = {}; c0[i] = 'new';
    push(cn ? 1 : 2, (cn ? '' : '<b>h->t[' + i + '] = ' + x + '</b> : ') + 'on place la nouvelle valeur à la <b>première place libre</b> : indice <b>' + i + '</b>, la dernière case du dernier niveau. L’arbre reste parfait, mais la propriété de tas n’est peut-être plus vraie.', c0, 0);
    while (i > 0) {
      var p = Math.floor((i - 1) / 2), cc = {}; cc[i] = 'cur'; cc[p] = 'cmp';
      if (it[i].v < it[p].v) {
        push(3, 'Le parent de l’indice <b>' + i + '</b> est l’indice <b>' + p + '</b> (valeur ' + it[p].v + '). <b>' + it[i].v + ' < ' + it[p].v + '</b> : l’enfant est plus petit que son parent, la propriété est violée.', cc, sw);
        var tmp = it[i]; it[i] = it[p]; it[p] = tmp; sw++; var c2 = {}; c2[p] = 'cur'; c2[i] = 'cmp';
        push(4, '<b>On échange</b> l’enfant et le parent : <b>' + it[p].v + '</b> monte d’un niveau.', c2, sw);
        i = p; var c3 = {}; c3[i] = 'cur'; push(5, (cn ? 'On continue avec le parent : même test, un niveau plus haut (indice <b>' + i + '</b>).' : '<b>i = (i - 1) / 2</b> : on continue à partir de l’indice <b>' + i + '</b>.'), c3, sw);
      } else {
        push(3, 'Le parent (indice ' + p + ') vaut ' + it[p].v + '. <b>' + it[i].v + ' ≥ ' + it[p].v + '</b> : la propriété est respectée, on s’arrête.', cc, sw); break;
      }
    }
    var cf = {}; it.forEach(function (_, k) { cf[k] = ''; });
    push(7, 'Tas rétabli après <b>' + sw + '</b> échange' + (sw > 1 ? 's' : '') + '. Au plus <b>un échange par niveau</b>, donc au plus la hauteur de l’arbre : Θ(log n).', cf, sw);
    return { steps: steps, items: it };
  }
  var CODE_HINS = ['void tas_inserer(Tas *h, int v) {', '    int i = h->n;', '    h->t[i] = v;  h->n++;           // à la fin', '    while (i > 0 && h->t[i] < h->t[(i - 1) / 2]) {', '        echanger(&h->t[i], &h->t[(i - 1) / 2]);', '        i = (i - 1) / 2;            // on monte', '    }', '}'];

  function heapExtractSteps(base, o) {
    var cn = !!(o && o.concept);
    o = o || {}; var it = copyItems(base), steps = [], cap = o.cap || 15, sw = 0;
    function push(line, note, cls, ops, out) { var f = hframe(it, cap, cls, o); steps.push({ line: line, note: note, F: f.F, arr: f.arr, ops: ops == null ? null : [ops, 'échange' + (ops > 1 ? 's' : '')] }); }
    var m = it[0];
    var c0 = { 0: 'cur' };
    push(1, 'Le <b>minimum</b> est toujours à la <b>racine</b> (indice 0) : c’est <b>' + m.v + '</b>. On le retourne tout de suite. Reste à réparer l’arbre.', c0, 0);
    var last = it.pop();
    if (!it.length) { push(2, 'Le tas est vide maintenant.', {}, 0); return { steps: steps, items: it, min: m }; }
    it[0] = last; var i = 0, c1 = { 0: 'new' };
    push(2, (cn ? '' : '<b>h->n--</b> puis <b>h->t[0] = h->t[h->n]</b> : ') + 'la dernière valeur (<b>' + last.v + '</b>) vient occuper la racine. L’arbre reste parfait, mais ' + last.v + ' est sans doute trop grand pour être là.', c1, 0);
    while (true) {
      var l = 2 * i + 1, r = 2 * i + 2;
      if (l >= it.length) { var c = {}; c[i] = 'cur'; push(4, 'L’indice <b>' + i + '</b> n’a plus de fils' + (cn ? '' : ' (<b>2 * i + 1 &lt; h->n</b> est faux)') + ' : on s’arrête.', c, sw); break; }
      var j = (r < it.length && it[r].v < it[l].v) ? r : l, cc = {}; cc[i] = 'cur'; cc[l] = 'cmp'; if (r < it.length) cc[r] = 'cmp';
      var who = r < it.length ? 'Les fils de l’indice ' + i + ' valent <b>' + it[l].v + '</b> et <b>' + it[r].v + '</b> : le plus petit est <b>' + it[j].v + '</b> (indice ' + j + ').' : 'Son seul fils vaut <b>' + it[l].v + '</b> (indice ' + l + ').';
      if (it[i].v > it[j].v) {
        push(7, who + ' <b>' + it[i].v + ' > ' + it[j].v + '</b> : on doit échanger avec <b>le plus petit des deux fils</b> (sinon l’autre fils serait plus petit que son nouveau parent).', cc, sw);
        var tmp = it[i]; it[i] = it[j]; it[j] = tmp; sw++; var c2 = {}; c2[j] = 'cur'; c2[i] = 'cmp';
        push(8, '<b>On échange</b> : <b>' + it[i].v + '</b> remonte, la grande valeur descend d’un niveau (indice <b>' + j + '</b>).', c2, sw); i = j;
      } else { push(7, who + ' <b>' + it[i].v + ' ≤ ' + it[j].v + '</b> : la propriété est respectée, on s’arrête' + (cn ? '' : ' (<b>break</b>)') + '.', cc, sw); break; }
    }
    push(10, 'Minimum extrait : <b>' + m.v + '</b>. Tas rétabli après <b>' + sw + '</b> échange' + (sw > 1 ? 's' : '') + ' : au plus un par niveau, donc Θ(log n).', {}, sw);
    return { steps: steps, items: it, min: m };
  }
  var CODE_HEXT = ['int tas_extraire_min(Tas *h) {', '    int m = h->t[0];                // le minimum', '    h->n--;  h->t[0] = h->t[h->n];  // le dernier monte', '    int i = 0;', '    while (2 * i + 1 < h->n) {      // i a un fils', '        int j = 2 * i + 1;          // fils gauche', '        if (j + 1 < h->n && h->t[j + 1] < h->t[j]) j++;', '        if (h->t[i] <= h->t[j]) break;', '        echanger(&h->t[i], &h->t[j]);  i = j;', '    }', '    return m;', '}'];
  var BASE_HEAP = [2, 5, 3, 9, 6, 8, 4].map(function (v) { return { v: v }; });
  function heapInsert(rootEl, o) {
    var cn = !!(o && o.noCode);
    var sc = [3, 1].map(function (x) { return { label: 'Insérer ' + x, steps: heapInsertSteps(BASE_HEAP, x, { concept: cn }).steps }; });
    play(rootEl, { code: CODE_HINS, steps: sc[0].steps, scenarios: sc, noCode: cn, codeW: 740, codeSize: 20, arr: true, treeH: 220, delay: 1600, r: 29, scale: .7, cw: 46, maxH: 280 });
  }
  function heapExtract(rootEl, o) {
    var cn = !!(o && o.noCode), base = [1, 3, 2, 9, 6, 8, 4].map(function (v) { return { v: v }; });
    var sc = [{ label: 'Extraire le minimum', steps: heapExtractSteps(base, { concept: cn }).steps }];
    play(rootEl, { code: CODE_HEXT, steps: sc[0].steps, noCode: cn, codeW: 740, codeSize: 19, arr: true, cw: 46, treeH: 240, delay: 1600, r: 29, scale: .8, maxH: 290 });
  }

  /* ----- Tas : tableau et arbre, indices parent et fils ----- */
  function heapExplore(rootEl) {
    rootEl = $(rootEl); rootEl.classList.add('sim');
    var items = [1, 3, 2, 7, 4, 8, 5, 9, 6, 10].map(function (v) { return { v: v }; }), cap = 12, sel = null;
    var treeEl = h('div'), arrEl = h('div'), info = h('div', { class: 'info t3', style: 'min-height:140px' });
    rootEl.append(h('div', { style: 'display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:34px;align-items:center' }, treeEl, h('div', null, info)), h('div', { style: 'margin-top:8px' }, arrEl));
    function draw() {
      var cls = {};
      if (sel != null) { cls[sel] = 'cur'; if (sel > 0) cls[Math.floor((sel - 1) / 2)] = 'cmp'; [2 * sel + 1, 2 * sel + 2].forEach(function (c) { if (c < items.length) cls[c] = 'vis'; }); }
      var f = hframe(items, cap, cls, { levels: 4, dx: 96 });
      var svg = drawTree(treeEl, f.F, { r: 30 }); treeEl.classList.add('click');
      [].forEach.call(svg.querySelectorAll('.nd'), function (g) { g.addEventListener('click', function () { sel = +g.dataset.id.slice(1); draw(); }); });
      var ac = {}; for (var i = 0; i < cap; i++) { ac[i] = i < items.length ? '' : 'range'; }
      if (sel != null) { ac[sel] = 'cur'; if (sel > 0) ac[Math.floor((sel - 1) / 2)] = 'acc'; [2 * sel + 1, 2 * sel + 2].forEach(function (c) { if (c < items.length) ac[c] = 'found'; }); }
      arrayViz(arrEl, { values: f.arr.v, cls: ac, ptrs: {}, cw: 74 });
      if (sel == null) { info.innerHTML = 'Cliquez sur un <b>nœud</b> : son <b>parent</b> (jaune) et ses <b>fils</b> (vert) s’allument dans l’arbre <b>et</b> dans le tableau.'; return; }
      var l = 2 * sel + 1, r = 2 * sel + 2, p = Math.floor((sel - 1) / 2);
      info.innerHTML = '<div class="kv"><span class="k">Indice i</span><span class="v">' + sel + '</span>' +
        '<span class="k">Parent ⌊(i − 1) / 2⌋</span><span class="v">' + (sel ? p + ' (valeur ' + items[p].v + ')' : 'aucun : c’est la racine') + '</span>' +
        '<span class="k">Fils gauche 2i + 1</span><span class="v">' + l + (l < items.length ? ' (valeur ' + items[l].v + ')' : ' : absent') + '</span>' +
        '<span class="k">Fils droit 2i + 2</span><span class="v">' + r + (r < items.length ? ' (valeur ' + items[r].v + ')' : ' : absent') + '</span></div>';
    }
    draw();
  }

  /* ----- Tas / file de priorité : bac à sable ----- */
  var TASKS = [['Sauvegarde', 5], ['Alerte incendie', 1], ['Courriel', 4], ['Impression', 3], ['Mise à jour', 6], ['Panne réseau', 2], ['Archivage', 7]];
  function heapPlay(rootEl, o) {
    rootEl = $(rootEl); rootEl.classList.add('sim'); o = o || {};
    var pq = !!o.pq, items = (o.start || []).map(function (v) { return { v: v }; }), cap = o.cap || 15, busy = false, outList = [], tIdx = 0, pending = [], timer = null;
    function drain() { if (!busy && pending.length) pending.shift()(); }
    var treeEl = h('div', { style: 'min-height:' + (o.treeH || 270) + 'px' }), arrEl = h('div'), outEl = h('div'), msg = h('div', { class: 'note', style: 'font-size:27px;min-height:100px' }), opsEl = h('div', { class: 'ops' });
    var inp = h('input', { type: 'number', min: 0, max: 99, value: 4, 'aria-label': 'Valeur', style: 'width:110px' });
    function draw(cls) {
      var f = hframe(items, cap, cls, { levels: 4, dx: 98, names: pq });
      drawTree(treeEl, f.F, { r: pq ? 30 : 29, scale: .8 });
      arrEl.innerHTML = ''; var a = h('div'); arrEl.appendChild(a); arrayViz(a, { values: f.arr.v, cls: f.arr.cls, ptrs: {}, cw: 60 });
      outEl.innerHTML = ''; outEl.appendChild(boxRow(pq ? 'Traitées dans l’ordre' : 'Extraits dans l’ordre', outList.map(function (x) { return x; }), { empty: '…', ok: true }));
    }
    function run(frames, done) {
      busy = true; var k = 0;
      (function nx() {
        if (k >= frames.length) { busy = false; if (done) done(); return; }
        var st = frames[k++]; var f = hframe(st.items || items, cap, st.cls, { levels: 4, dx: 98, names: pq });
        drawTree(treeEl, f.F, { r: 29, scale: .8 }); arrEl.innerHTML = ''; var a = h('div'); arrEl.appendChild(a); arrayViz(a, { values: f.arr.v, cls: f.arr.cls, ptrs: {}, cw: 60 });
        msg.innerHTML = st.note; if (st.ops) { opsEl.innerHTML = ''; opsEl.append(String(st.ops[0]), h('small', null, st.ops[1])); }
        timer = setTimeout(nx, o.delay || 900);
      })();
    }
    function ins(v, name) {
      if (busy) { pending.push(function () { ins(v, name); }); return; } if (items.length >= cap) { msg.innerHTML = '<b class="bad">Tas plein</b> pour ce dessin (' + cap + ' valeurs).'; return; }
      v = Math.round(+v); if (isNaN(v)) return;
      var r = heapInsertSteps(items, v, { cap: cap, name: name, names: pq, concept: true });
      var frames = r.steps.slice(1).map(function (s) { return { note: s.note, ops: s.ops, cls: null, _s: s }; });
      // rejouer avec les états intermédiaires
      var base = items; items = r.items;
      busy = true; var k = 1;
      (function nx() {
        if (k >= r.steps.length) { busy = false; draw(); drain(); return; }
        var s = r.steps[k++]; drawTree(treeEl, s.F, { r: pq ? 30 : 29, scale: .8 }); arrEl.innerHTML = ''; var a = h('div'); arrEl.appendChild(a); arrayViz(a, { values: s.arr.v, cls: s.arr.cls, ptrs: {}, cw: 60 });
        msg.innerHTML = s.note; if (s.ops) { opsEl.innerHTML = ''; opsEl.append(String(s.ops[0]), h('small', null, s.ops[1])); }
        timer = setTimeout(nx, o.delay || 900);
      })();
    }
    function ext(done) {
      if (busy) { if (!done) pending.push(function () { ext(); }); return; } if (!items.length) { msg.innerHTML = '<b class="bad">Tas vide</b> : rien à extraire.'; if (done) done(); return; }
      var r = heapExtractSteps(items, { cap: cap, names: pq, concept: true }); items = r.items; outList.push(pq ? r.min.name + ' (' + r.min.v + ')' : r.min.v);
      busy = true; var k = 0;
      (function nx() {
        if (k >= r.steps.length) { busy = false; draw(); if (done) done(); else drain(); return; }
        var s = r.steps[k++]; drawTree(treeEl, s.F, { r: pq ? 30 : 29, scale: .8 }); arrEl.innerHTML = ''; var a = h('div'); arrEl.appendChild(a); arrayViz(a, { values: s.arr.v, cls: s.arr.cls, ptrs: {}, cw: 60 });
        msg.innerHTML = s.note; if (s.ops) { opsEl.innerHTML = ''; opsEl.append(String(s.ops[0]), h('small', null, s.ops[1])); }
        outEl.innerHTML = ''; outEl.appendChild(boxRow(pq ? 'Traitées dans l’ordre' : 'Extraits dans l’ordre', outList.slice(0, k >= r.steps.length - 1 ? outList.length : outList.length - 1), { empty: '…', ok: true }));
        timer = setTimeout(nx, (o.delay || 900) * (done ? .45 : 1));
      })();
    }
    function sortAll() { if (busy) return; (function nx() { if (!items.length) return; ext(function () { setTimeout(nx, 200); }); })(); }
    var ctl;
    if (pq) {
      ctl = h('div', { class: 'ctl' }, btn('Ajouter une tâche', function () { var t = TASKS[tIdx++ % TASKS.length]; ins(t[1], t[0]); }, 'pri'), btn('Traiter la plus urgente', function () { ext(); }), btn('Vider', function () { items = []; outList = []; tIdx = 0; draw(); msg.innerHTML = 'File vide.'; }, 'sm'));
    } else {
      ctl = h('div', { class: 'ctl' }, h('label', null, 'Valeur ', inp), btn('Insérer', function () { ins(inp.value); }, 'pri'), btn('Extraire le minimum', function () { ext(); }),
        btn('Tout extraire (tri par tas)', function () { sortAll(); }, ''), btn('Vider', function () { items = []; outList = []; draw(); msg.innerHTML = 'Tas vide.'; }, 'sm'));
    }
    rootEl.append(treeEl, o.noArr ? '' : arrEl, outEl, opsEl, msg, ctl);
    draw(); msg.innerHTML = o.hint || 'Insérez des valeurs, puis extrayez le minimum.';
    return { setItems: function (l) { items = l.map(function (v) { return { v: v }; }); draw(); } };
  }

  /* ----- Construire un arbre en mémoire (nœud avec gauche et droit) ----- */
  function nodeBlock(id, addr, v, g, d, cls) { return { id: id, addr: addr, fields: [{ n: 'valeur', v: v }, { n: 'gauche', p: g, ptr: true }, { n: 'droit', p: d, ptr: true }], cls: cls || '' }; }
  function tBuild() {
    var B = S2.builder({ stack: [], heap: [] });
    B.step(0, 'On construit à la main un arbre de trois nœuds. Chaque nœud du <b>tas</b> a trois champs : <b>valeur</b>, <b>gauche</b> et <b>droit</b>.');
    B.step(0, '<b>racine ← creer_noeud(8)</b> : un bloc de trois champs est réservé (numéro 2000). Ses deux pointeurs valent <b>NULL</b>. La variable <b>racine</b> contient 2000.', function () { B.S.heap.push(nodeBlock('A', 2000, 8, null, null, 'hl')); B.S.stack.push({ id: 'racine', name: 'racine', addr: 100, p: 'A', ptr: true }); });
    B.step(1, '<b>racine.gauche ← creer_noeud(3)</b> : un second nœud est créé (numéro 2048) et son adresse est rangée dans le champ <b>gauche</b> de la racine. Un <b>arc</b> de l’arbre est un <b>pointeur</b>.', function () { B.S.heap.push(nodeBlock('B', 2048, 3, null, null, 'hl')); B.F('A', 'gauche').p = 'B'; B.B('A').cls = ''; });
    B.step(2, '<b>racine.droit ← creer_noeud(10)</b> : un troisième nœud (2096) devient le fils droit. L’arbre est complet : 3 nœuds, 4 pointeurs <b>NULL</b>.', function () { B.S.heap.push(nodeBlock('C', 2096, 10, null, null, 'hl')); B.F('A', 'droit').p = 'C'; B.B('B').cls = ''; });
    B.step(2, 'Trois <b>malloc</b>, donc il faudra trois <b>free</b>. Mais dans quel ordre ? Voir plus loin.', function () { B.B('C').cls = ''; });
    return B.steps;
  }
  var CODE_BUILD = ['racine ← creer_noeud(8)', 'racine.gauche ← creer_noeud(3)', 'racine.droit ← creer_noeud(10)'];
  function tFree(bon) {
    var B = S2.builder({ stack: [{ id: 'racine', name: 'racine', addr: 100, p: 'A', ptr: true }], heap: [nodeBlock('A', 2000, 8, 'B', 'C'), nodeBlock('B', 2048, 3, null, null), nodeBlock('C', 2096, 10, null, null)] });
    if (bon) {
      B.step(-1, 'Un arbre de trois nœuds. On veut le <b>libérer</b> entièrement.');
      B.step(0, '<b>liberer(racine)</b> : avant de libérer un nœud, on libère d’abord son <b>sous-arbre gauche</b>.', function () { B.B('B').cls = 'hl'; });
      B.step(2, '<b>free</b> du nœud 3 (feuille) : ses deux fils sont NULL, rien n’est perdu.', function () { B.B('B').freed = true; B.B('B').cls = ''; B.B('C').cls = 'hl'; });
      B.step(3, 'Puis le <b>sous-arbre droit</b> : <b>free</b> du nœud 10.', function () { B.B('C').freed = true; B.B('C').cls = ''; B.B('A').cls = 'hl'; });
      B.step(4, 'Enfin, la racine : ses fils sont déjà libérés, on peut rendre son bloc. <b>Trois malloc, trois free.</b> C’est un parcours <b>postfixe</b> : fils d’abord, nœud ensuite.', function () { B.B('A').freed = true; B.B('A').cls = ''; B.V('racine').p = null; });
    } else {
      B.step(-1, 'Même arbre. Essayons de libérer <b>la racine d’abord</b>.');
      B.step(0, '<b>free(racine)</b> en premier : le bloc 2000 est rendu au système.', function () { B.B('A').freed = true; B.B('A').cls = 'bad'; });
      B.step(1, 'Mais c’était <b>le seul endroit</b> qui contenait les adresses 2048 et 2096 ! Plus aucun moyen de les retrouver : les nœuds 3 et 10 sont <b>perdus</b>. <b>Fuite mémoire</b>.', function () { B.B('B').cls = 'bad'; B.B('C').cls = 'bad'; B.V('racine').p = null; });
    }
    return B.steps;
  }
  var CODE_FREE_OK = ['liberer(racine) :', '    liberer(a.gauche)', '    free(a)  // nœud 3', '    liberer(a.droit)', '    free(a)  // racine'];
  function buildTree(rootEl) {
    S2.memTracer(rootEl, { code: CODE_BUILD, steps: tBuild(), sw: 230, hg: 70, zoom: 1, noteSize: 26 });
  }
  function freeTree(rootEl) {
    var codeOk = ['void liberer(Noeud *a) {', '    if (a == NULL) return;', '    liberer(a->gauche);', '    liberer(a->droit);', '    free(a);', '}'];
    var codeKo = ['free(racine);', '// et les fils ?'];
    S2.memTracer(rootEl, { code: codeOk, steps: tFree(true), sw: 230, hg: 60, zoom: .9, noteSize: 25, scenarios: [
      { label: 'Fils d’abord (postfixe)', steps: tFree(true), code: codeOk },
      { label: 'Racine d’abord', steps: tFree(false), code: codeKo }] });
  }


  /* ----- Hauteur : l'algorithme pas à pas ----- */
  var CODE_H = ['int hauteur(Noeud *a) {', '    if (a == NULL) return -1;', '    int g = hauteur(a->gauche);', '    int d = hauteur(a->droit);', '    return 1 + (g > d ? g : d);', '}'];
  function heightSteps(t, concept) {
    var steps = [], stack = [], done = {}, tags = {};
    function names() { return stack.map(function (s) { return s.nm; }); }
    function vars() { var s = stack[stack.length - 1]; if (!s || s.nm === 'NULL') return []; return ['g = ' + (s.g == null ? '?' : s.g), 'd = ' + (s.d == null ? '?' : s.d)]; }
    function frame(cur, note, line) {
      var cls = {}; stack.forEach(function (s) { if (s.id) cls[s.id] = 'stk'; }); Object.keys(done).forEach(function (id) { cls[id] = 'vis'; }); if (cur) cls[cur] = 'cur';
      steps.push({ line: line, note: note, F: lay(t, cls, tags), stack: names(), vars: concept ? null : vars() });
    }
    function rec(a, who) {
      if (!a) { stack.push({ nm: 'NULL' }); frame(null, (concept ? 'Pas de nœud ici : une branche vide a pour hauteur <b>−1</b>.' : '<b>a == NULL</b> : <b>return -1</b>. L’arbre vide a pour hauteur −1.'), 1); stack.pop(); return -1; }
      var f = { nm: a.v, id: a.id, g: null, d: null }; stack.push(f);
      frame(a.id, who + ' On calcule la hauteur du sous-arbre de <b>' + a.v + '</b>.', 0);
      frame(a.id, concept ? 'D’abord, la hauteur du sous-arbre <b>gauche</b> de ' + a.v + '.' : '<b>g = hauteur(a->gauche)</b> : on demande la hauteur du fils gauche.', 2);
      f.g = rec(a.l, 'On descend à gauche.');
      frame(a.id, concept ? 'Gauche : <b>' + f.g + '</b>. Ensuite, la hauteur du sous-arbre <b>droit</b>.' : '<b>g</b> vaut maintenant <b>' + f.g + '</b>. <b>d = hauteur(a->droit)</b> : on demande la hauteur du fils droit.', 3);
      f.d = rec(a.r, 'On descend à droite.');
      var hh = 1 + Math.max(f.g, f.d); tags[a.id] = 'h = ' + hh; done[a.id] = 1;
      frame(a.id, concept ? 'Droite : <b>' + f.d + '</b>. On garde la plus grande des deux (' + Math.max(f.g, f.d) + ') et on ajoute <b>1</b> pour le niveau de ' + a.v + ' : hauteur <b>' + hh + '</b>.' : '<b>g = ' + f.g + ', d = ' + f.d + '</b> : <b>return 1 + max(' + f.g + ', ' + f.d + ') = ' + hh + '</b>.', 4);
      stack.pop(); return hh;
    }
    var r = rec(t, 'Appel initial sur la racine.');
    var c = {}; Object.keys(done).forEach(function (i) { c[i] = 'vis'; });
    steps.push({ line: 5, note: 'Résultat : la <b>hauteur de l’arbre</b> est <b>' + r + '</b>. Chaque nœud a été traité une seule fois : coût proportionnel au nombre de nœuds, Θ(n).', F: lay(t, c, tags), stack: [], vars: concept ? null : [] });
    return steps;
  }
  function heightSim(rootEl, o) {
    o = o || {}; var cn = !!o.noCode, t = T('A', T('B', T('D'), T('E')), T('C'));
    play(rootEl, { code: CODE_H, steps: heightSteps(t, cn), noCode: cn, codeW: 640, codeSize: 23, delay: 1300, treeH: 280, scale: .9, varsLabel: 'Variables de l’appel en cours' });
  }

  window.Sim3 = { play: play, drawTree: drawTree, lay: lay, explore: explore, levels: levels, traverse: traverse, abrSearch: abrSearch, abrInsert: abrInsert, abrDelete: abrDelete,
    abrPlay: abrPlay, abrMin: abrMin, heightSim: heightSim, heapInsert: heapInsert, heapExtract: heapExtract, heapExplore: heapExplore, heapPlay: heapPlay, buildTree: buildTree, freeTree: freeTree,
    T: T, treeA: treeA, treeBST: treeBST, bstFrom: bstFrom, height: height, size: size,
    staticTree: function (el, tree, o) { o = o || {}; var F = lay(tree, o.cls, o.tags, { minN: o.minN || 1, minH: o.minH == null ? 0 : o.minH }); return drawTree($(el), F, { r: o.r || 33, scale: o.scale || 1 }); },
    staticHeap: function (el, vals, o) { o = o || {}; var items = vals.map(function (v) { return { v: v }; }), f = hframe(items, o.cap || items.length, o.cls, { levels: o.levels || 3, dx: o.dx || 96 }); drawTree($(el), f.F, { r: o.r || 30 }); if (o.arr) { var a = h('div'); $(o.arr).appendChild(a); arrayViz(a, { values: f.arr.v, cls: f.arr.cls, ptrs: {}, cw: o.cw || 70 }); } }
  };
})();
