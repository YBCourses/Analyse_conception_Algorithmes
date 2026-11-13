/* Pages de lecture : thème, boutons « Copier », surlignage du sommaire. */
(function () {
  try { var t0 = localStorage.getItem('inpt-theme'); if (t0) document.documentElement.setAttribute('data-theme', t0); } catch (e) {}
  var tb = document.getElementById('theme');
  if (tb) tb.addEventListener('click', function () {
    var r = document.documentElement, dark = r.getAttribute('data-theme') === 'dark' || (!r.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    var nt = dark ? 'light' : 'dark'; r.setAttribute('data-theme', nt);
    try { localStorage.setItem('inpt-theme', nt); } catch (e) {}
  });
  [].forEach.call(document.querySelectorAll('pre.code'), function (p) {
    var raw = p.textContent;
    var b = document.createElement('button'); b.className = 'cp'; b.type = 'button'; b.textContent = 'Copier';
    b.addEventListener('click', function () {
      function ok() { b.textContent = 'Copié'; setTimeout(function () { b.textContent = 'Copier'; }, 1600); }
      function fallback() {
        var r = document.createRange(); r.selectNodeContents(p); var s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Sélectionné';
        setTimeout(function () { b.textContent = 'Copier'; }, 1600);
      }
      try { navigator.clipboard.writeText(raw).then(ok, fallback); } catch (e) { fallback(); }
    });
    p.appendChild(b);
  });
  var links = [].slice.call(document.querySelectorAll('aside.toc a'));
  var heads = links.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
  if (heads.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { links.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id); }); } });
    }, { rootMargin: '-10% 0px -80% 0px' });
    heads.forEach(function (h) { io.observe(h); });
  }
})();
