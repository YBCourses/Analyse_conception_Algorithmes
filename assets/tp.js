/* Sujet de TP interactif : tableaux et réponses saisissables, brouillon enregistré,
   export JSON du compte rendu, import pour reprendre. Réutilisable pour chaque TP :
   <body data-tp="tp1" data-seance="1" data-titre="TP 1 · Mesurer la complexité" data-fichiers="tp1.c, tp1.py"> */
(function () {
  var body = document.body, ID = body.dataset.tp || 'tp', KEY = 'inpt-tp:' + ID;
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  /* ---- cellules de tableau et zones de réponse générées ---- */
  [].forEach.call(document.querySelectorAll('table[data-table]'), function (t) {
    var tid = t.dataset.table;
    [].forEach.call(t.rows, function (r, ri) {
      [].forEach.call(r.cells, function (c, ci) {
        if (!c.hasAttribute('data-in')) return;
        var i = el('input', 'cell'); i.type = 'text'; i.setAttribute('inputmode', 'decimal'); i.autocomplete = 'off';
        i.dataset.k = tid + '_' + ri + '_' + ci;
        var lab = (t.dataset.title || tid) + ' · ligne ' + ri + ', colonne ' + (t.rows[0].cells[ci] ? t.rows[0].cells[ci].textContent : ci);
        i.setAttribute('aria-label', lab);
        c.appendChild(i);
      });
    });
  });
  [].forEach.call(document.querySelectorAll('li[data-q]'), function (li) {
    var ta = el('textarea', 'ans'); ta.rows = 2; ta.placeholder = 'Votre réponse…'; ta.dataset.k = li.dataset.q;
    ta.setAttribute('aria-label', 'Réponse à la question ' + li.dataset.q);
    li.appendChild(ta);
  });
  var fields = [].slice.call(document.querySelectorAll('[data-k]'));

  /* ---- brouillon dans le navigateur ---- */
  var status = document.getElementById('save-status'), prog = document.getElementById('progress'), timer;
  function val(f) { return f.type === 'checkbox' ? f.checked : f.value; }
  function collect() { var o = {}; fields.forEach(function (f) { o[f.dataset.k] = val(f); }); return o; }
  function apply(o) { fields.forEach(function (f) { var v = o[f.dataset.k]; if (v === undefined) return; if (f.type === 'checkbox') f.checked = !!v; else f.value = v; }); }
  function counts() {
    var cells = [].filter.call(fields, function (f) { return f.classList.contains('cell'); }), done = cells.filter(function (f) { return f.value.trim() !== ''; }).length;
    var qs = [].filter.call(fields, function (f) { return f.classList.contains('ans'); }), qd = qs.filter(function (f) { return f.value.trim() !== ''; }).length;
    return { cells: cells.length, cellsDone: done, q: qs.length, qDone: qd };
  }
  function refresh() { var c = counts(); if (prog) prog.textContent = 'Cases remplies : ' + c.cellsDone + ' / ' + c.cells + ' · Réponses écrites : ' + c.qDone + ' / ' + c.q; }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(collect())); if (status) status.textContent = 'Brouillon enregistré dans ce navigateur.'; }
    catch (e) { if (status) status.textContent = 'Enregistrement automatique indisponible : pensez à exporter régulièrement.'; }
  }
  fields.forEach(function (f) {
    f.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(persist, 400); refresh(); });
    f.addEventListener('change', function () { clearTimeout(timer); timer = setTimeout(persist, 400); refresh(); });
  });
  try { var s = localStorage.getItem(KEY); if (s) apply(JSON.parse(s)); } catch (e) {}
  refresh();

  /* ---- export JSON ---- */
  function text(node) { var c = node.cloneNode(true); [].forEach.call(c.querySelectorAll('textarea,input'), function (x) { x.remove(); }); return c.textContent.replace(/\s+/g, ' ').trim(); }
  function fval(k) { var f = fields.filter(function (x) { return x.dataset.k === k; })[0]; return f ? f.value.trim() : ''; }
  function payload() {
    var tables = [].map.call(document.querySelectorAll('table[data-table]'), function (t) {
      var head = [].map.call(t.rows[0].cells, function (c) { return c.textContent.replace(/\s+/g, ' ').trim(); });
      var rows = [].slice.call(t.rows, 1).map(function (r) {
        return [].map.call(r.cells, function (c) { var i = c.querySelector('input.cell'); return i ? i.value.trim() : c.textContent.replace(/\s+/g, ' ').trim(); });
      });
      return { id: t.dataset.table, titre: t.dataset.title || t.dataset.table, colonnes: head, lignes: rows };
    });
    var answers = [].map.call(document.querySelectorAll('li[data-q]'), function (li) {
      return { id: li.dataset.q, question: text(li), reponse: fval(li.dataset.q) };
    });
    return {
      tp: ID, seance: +body.dataset.seance || null, titre: body.dataset.titre || ID,
      exporte_le: new Date().toISOString(),
      etudiant: { nom: fval('nom'), prenom: fval('prenom'), groupe: fval('groupe'), binome: fval('binome') },
      codes_testes: { c: !!(fields.filter(function (f) { return f.dataset.k === 'code_c_ok'; })[0] || {}).checked, python: !!(fields.filter(function (f) { return f.dataset.k === 'code_py_ok'; })[0] || {}).checked },
      tableaux: tables, reponses: answers, brut: collect()
    };
  }
  function slug(t) { return t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }
  var msg = document.getElementById('export-msg');
  function say(t, bad) { if (!msg) return; msg.textContent = t; msg.className = 'msg ' + (bad ? 'bad' : 'ok'); }
  function check() {
    var n = fval('nom'), p = fval('prenom');
    if (!n || !p) { say('Indiquez votre nom et votre prénom (en haut de la page) avant d’exporter.', true); var f = document.getElementById(n ? 'f-prenom' : 'f-nom'); if (f) { f.scrollIntoView({ block: 'center' }); f.focus(); } return false; }
    return true;
  }
  function download(name, str) {
    var blob = new Blob([str], { type: 'application/json' });
    function anchor() { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
    if (window.claude && window.claude.use) {
      window.claude.use('downloads').then(function (d) { if (d) d.save({ filename: name, data: blob }).catch(function () {}); else anchor(); }, anchor);
    } else anchor();
  }
  var bx = document.getElementById('btn-export');
  if (bx) bx.addEventListener('click', function () {
    if (!check()) return;
    var p = payload(), name = ID.toUpperCase() + '_' + slug(p.etudiant.nom).toUpperCase() + '_' + slug(p.etudiant.prenom) + '.json', c = counts();
    download(name, JSON.stringify(p, null, 2));
    say('Fichier « ' + name + ' » exporté (' + c.cellsDone + '/' + c.cells + ' cases, ' + c.qDone + '/' + c.q + ' réponses). Envoyez-le avec vos fichiers de code' + (body.dataset.fichiers ? ' (' + body.dataset.fichiers + ')' : '') + '.', false);
  });
  var bc = document.getElementById('btn-copy');
  if (bc) bc.addEventListener('click', function () {
    if (!check()) return;
    var str = JSON.stringify(payload(), null, 2);
    try { navigator.clipboard.writeText(str).then(function () { say('JSON copié dans le presse-papiers.', false); }, function () { say('Copie impossible : utilisez le bouton Exporter.', true); }); }
    catch (e) { say('Copie impossible : utilisez le bouton Exporter.', true); }
  });
  var bi = document.getElementById('file-import');
  if (bi) bi.addEventListener('change', function () {
    var f = bi.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try { var o = JSON.parse(r.result); if (!o.brut) throw new Error('format'); apply(o.brut); persist(); refresh(); say('Compte rendu importé : vous pouvez continuer.', false); }
      catch (e) { say('Fichier non reconnu : importez un JSON exporté depuis cette page.', true); }
    };
    r.readAsText(f); bi.value = '';
  });
  var br = document.getElementById('btn-reset');
  if (br) br.addEventListener('click', function () {
    if (br.dataset.sure !== '1') { br.dataset.sure = '1'; br.textContent = 'Cliquez encore pour tout effacer'; setTimeout(function () { br.dataset.sure = ''; br.textContent = 'Tout effacer'; }, 3500); return; }
    fields.forEach(function (f) { if (f.type === 'checkbox') f.checked = false; else f.value = ''; });
    try { localStorage.removeItem(KEY); } catch (e) {}
    br.dataset.sure = ''; br.textContent = 'Tout effacer'; refresh(); say('Tout a été effacé.', false);
  });
})();
