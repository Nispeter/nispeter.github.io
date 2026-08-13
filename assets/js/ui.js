/* ============================================================
   ui.js — site-wide interaction layer for the Cosmic Observatory.
   Vanilla, no deps, loaded with `defer` on every page.

   Everything here is progressive enhancement: the markup it drives is either
   hidden behind the `.has-ui` class (set in head.html before first paint) or
   already works without it. Nothing touches window.OBS / the idle game.
   ============================================================ */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = root.classList.contains('reduce-motion');
  var finePointer = !root.classList.contains('coarse-pointer');

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  /* ---------------------------------------------------------
     Scroll state: masthead compression, reading progress, to-top.
     One passive listener, one rAF, three consumers.
     --------------------------------------------------------- */
  (function scrollState() {
    var body = doc.body;
    var toTop = $('[data-to-top]');
    var progress = $('.masthead__progress');
    var ticking = false;

    if (toTop) {
      toTop.removeAttribute('hidden');
      toTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    }

    function measure() {
      var y = window.pageYOffset || root.scrollTop;
      var max = doc.documentElement.scrollHeight - window.innerHeight;

      body.classList.toggle('is-scrolled', y > 8);
      if (toTop) toTop.classList.toggle('is-on', y > 600);

      // Only a page with real reading length earns a progress bar.
      if (progress) {
        var worth = max > window.innerHeight * 0.4 && !body.classList.contains('home-observatory');
        body.classList.toggle('has-progress', worth);
        if (worth) progress.style.setProperty('--p', max > 0 ? clamp(y / max, 0, 1) : 0);
      }
      ticking = false;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(measure);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    measure();
  })();

  /* ---------------------------------------------------------
     Nav: sliding indicator + mobile drawer a11y.
     The CSS keeps a static pill on .is-active as the no-JS fallback;
     under .has-ui that pill is transparent and this drives it instead.
     --------------------------------------------------------- */
  (function nav() {
    var navEl = $('.masthead__nav');
    var indicator = $('.nav-indicator');
    if (!navEl || !indicator) return;

    var links = $$('a', navEl);
    var active = $('a.is-active', navEl);
    var lit = null;

    function moveTo(link) {
      if (lit) lit.classList.remove('is-lit');
      if (!link) {
        indicator.style.setProperty('--nav-o', 0);
        lit = null;
        return;
      }
      indicator.style.setProperty('--nav-x', link.offsetLeft + 'px');
      indicator.style.setProperty('--nav-w', link.offsetWidth + 'px');
      indicator.style.setProperty('--nav-o', 1);
      link.classList.add('is-lit');
      lit = link;
    }

    links.forEach(function (link) {
      link.addEventListener('mouseenter', function () { moveTo(link); });
      link.addEventListener('focus', function () { moveTo(link); });
    });
    navEl.addEventListener('mouseleave', function () { moveTo(active); });
    navEl.addEventListener('focusout', function (e) {
      if (!navEl.contains(e.relatedTarget)) moveTo(active);
    });

    // Fonts land after first paint and change link widths — remeasure then.
    moveTo(active);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { moveTo(lit || active); });
    window.addEventListener('resize', function () { moveTo(lit || active); }, { passive: true });

    // Mobile drawer: the checkbox owns the state, we only mirror it for a11y.
    var toggle = $('#nav-toggle');
    var burger = $('.nav-burger');
    if (toggle && burger) {
      var sync = function () { burger.setAttribute('aria-expanded', String(toggle.checked)); };
      toggle.addEventListener('change', sync);
      sync();
      // The <label> is keyboard-reachable via tabindex, so make Enter/Space work.
      burger.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle.checked = !toggle.checked;
          sync();
        }
      });
      doc.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && toggle.checked) { toggle.checked = false; sync(); burger.focus(); }
      });
    }
  })();

  /* ---------------------------------------------------------
     Reflective cards: specular sheen, spotlight border, tilt.
     Delegated per grid; rects are cached on enter and the CSS vars
     are written inside one rAF per move.
     --------------------------------------------------------- */
  (function reflectiveCards() {
    if (!finePointer || reduceMotion) return;

    var MAX_TILT = 5; // degrees
    var grids = $$('.card-grid, .fallback-grid, .project__nav');
    if (!grids.length) return;

    grids.forEach(function (grid) {
      var current = null;
      var rect = null;
      var pending = null;
      var frame = 0;

      function apply() {
        frame = 0;
        if (!current || !pending || !rect) return;
        var px = (pending.x - rect.left) / rect.width;   // 0..1
        var py = (pending.y - rect.top) / rect.height;
        current.style.setProperty('--mx', (px * 100).toFixed(2) + '%');
        current.style.setProperty('--my', (py * 100).toFixed(2) + '%');
        current.style.setProperty('--ry', (clamp(px - 0.5, -0.5, 0.5) * 2 * MAX_TILT).toFixed(2) + 'deg');
        current.style.setProperty('--rx', (clamp(0.5 - py, -0.5, 0.5) * 2 * MAX_TILT).toFixed(2) + 'deg');
      }

      function release() {
        if (!current) return;
        current.classList.remove('is-lit', 'is-tilting');
        current.style.removeProperty('--rx');
        current.style.removeProperty('--ry');
        current = null;
        rect = null;
      }

      grid.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var card = e.target.closest('.card, .planet-card, .pnav__item');
        if (!card || !grid.contains(card)) { release(); return; }
        if (card !== current) {
          release();
          current = card;
          rect = card.getBoundingClientRect();
          card.classList.add('is-lit', 'is-tilting');
        }
        pending = { x: e.clientX, y: e.clientY };
        if (!frame) frame = requestAnimationFrame(apply);
      }, { passive: true });

      grid.addEventListener('pointerleave', release);
      // A card that scrolls or resizes under a held cursor has a stale rect.
      window.addEventListener('scroll', function () { if (current) rect = current.getBoundingClientRect(); }, { passive: true });
    });
  })();

  /* ---------------------------------------------------------
     Reveal on scroll — staggered per grid position.
     --------------------------------------------------------- */
  (function reveal() {
    if (reduceMotion || !('IntersectionObserver' in window)) return;

    var targets = $$('.card, .section-hero, .award, .gallery__item, .project__sidebar, .pnav__item');
    if (!targets.length) return;

    targets.forEach(function (el, i) {
      el.setAttribute('data-reveal', '');
      // Stagger resets per row-ish group so a long list doesn't wait seconds.
      el.style.setProperty('--i', i % 6);
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    targets.forEach(function (el) { io.observe(el); });
  })();

  /* ---------------------------------------------------------
     Section filters: tech chips + free text, mirrored in the URL.
     --------------------------------------------------------- */
  (function filters() {
    var wrap = $('[data-filters]');
    var grid = $('[data-filter-grid]');
    if (!wrap || !grid) return;

    var input = $('[data-filter-input]', wrap);
    var countEl = $('[data-filter-count]', wrap);
    var emptyEl = $('[data-filter-empty]');
    var chips = $$('.fchip', wrap);
    var cards = $$('.card', grid);
    var tech = '*';

    function matches(card, q) {
      if (tech !== '*') {
        var list = (card.getAttribute('data-tech') || '').split('|');
        if (list.indexOf(tech) === -1) return false;
      }
      if (!q) return true;
      var hay = (card.getAttribute('data-title') || '') + ' ' +
                (card.getAttribute('data-tech') || '') + ' ' +
                (card.getAttribute('data-year') || '') + ' ' +
                (card.getAttribute('data-text') || '');
      return hay.indexOf(q) !== -1;
    }

    function run(pushUrl) {
      var q = (input ? input.value : '').trim().toLowerCase();
      var shown = 0;

      cards.forEach(function (card) {
        var ok = matches(card, q);
        card.classList.toggle('is-filtered', !ok);
        // A card hidden at load never intersected, so it would come back invisible.
        if (ok) { card.classList.add('is-in'); shown++; }
      });

      if (countEl) countEl.textContent = shown + ' / ' + cards.length;
      if (emptyEl) emptyEl.hidden = shown !== 0;

      if (pushUrl) {
        var params = new URLSearchParams();
        if (tech !== '*') params.set('tech', tech);
        if (q) params.set('q', q);
        var qs = params.toString();
        history.replaceState(null, '', qs ? '?' + qs : location.pathname);
      }
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        tech = chip.getAttribute('data-tech');
        chips.forEach(function (c) {
          var on = c === chip;
          c.classList.toggle('is-on', on);
          c.setAttribute('aria-pressed', String(on));
        });
        run(true);
      });
    });

    if (input) {
      input.addEventListener('input', function () { run(true); });
      // Esc clears rather than closing anything — the palette owns global Esc.
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && input.value) { e.stopPropagation(); input.value = ''; run(true); }
      });
    }

    // Restore a linked/bookmarked filter state.
    (function restore() {
      var params = new URLSearchParams(location.search);
      var t = (params.get('tech') || '').toLowerCase();
      var q = params.get('q') || '';
      // Text first: chip.click() re-runs and would otherwise drop ?q from the URL.
      if (q && input) input.value = q;
      if (t) {
        var chip = chips.filter(function (c) { return c.getAttribute('data-tech') === t; })[0];
        if (chip) chip.click();
      }
      run(false);
    })();
  })();

  /* ---------------------------------------------------------
     Command palette (Ctrl/⌘+K, or "/").
     --------------------------------------------------------- */
  (function palette() {
    var el = $('#palette');
    var dataEl = $('#search-index');
    if (!el || !dataEl) return;

    var items;
    try { items = JSON.parse(dataEl.textContent); } catch (e) { return; }
    if (!items || !items.length) return;

    var input = $('#palette-input');
    var list = $('#palette-results');
    var emptyEl = $('#palette-empty');
    var isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform || '');
    var open = false;
    var results = [];
    var sel = 0;
    var lastFocus = null;

    el.removeAttribute('hidden');

    $$('[data-shortcut-hint]').forEach(function (n) { n.textContent = isMac ? '⌘K' : 'Ctrl K'; });

    function score(item, q) {
      var title = item.t.toLowerCase();
      if (!q) return 1;
      var at = title.indexOf(q);
      if (at === 0) return 100;          // title prefix wins
      if (at > 0) return 60 - at;        // then title substring, earlier is better
      if (item.k.indexOf(q) !== -1) return 20;   // then tech / section / excerpt
      return 0;
    }

    function render() {
      list.innerHTML = '';
      results.forEach(function (item, i) {
        var li = doc.createElement('li');
        var a = doc.createElement('a');
        a.className = 'presult' + (i === sel ? ' is-sel' : '');
        a.href = item.u;
        a.id = 'presult-' + i;
        a.setAttribute('role', 'option');
        a.setAttribute('aria-selected', String(i === sel));
        a.innerHTML =
          '<span class="presult__dot presult__dot--' + (item.c || 'nav') + '" aria-hidden="true"></span>' +
          '<span class="presult__main"><span class="presult__t"></span><span class="presult__s"></span></span>' +
          '<span class="presult__y"></span>';
        // Index data is site-authored, but fill it as text anyway.
        $('.presult__t', a).textContent = item.t;
        $('.presult__s', a).textContent = item.s;
        $('.presult__y', a).textContent = item.y || '';
        a.addEventListener('mousemove', function () { if (sel !== i) { sel = i; paintSel(); } });
        li.appendChild(a);
        list.appendChild(li);
      });
      if (emptyEl) emptyEl.hidden = results.length !== 0;
      paintSel();
    }

    function paintSel() {
      $$('.presult', list).forEach(function (a, i) {
        a.classList.toggle('is-sel', i === sel);
        a.setAttribute('aria-selected', String(i === sel));
      });
      var cur = list.children[sel] && list.children[sel].firstChild;
      if (cur) {
        input.setAttribute('aria-activedescendant', cur.id);
        cur.scrollIntoView({ block: 'nearest' });
      }
    }

    function search(raw) {
      var q = raw.trim().toLowerCase();
      results = items
        .map(function (item) { return { item: item, s: score(item, q) }; })
        .filter(function (r) { return r.s > 0; })
        .sort(function (a, b) { return b.s - a.s; })
        .slice(0, 12)
        .map(function (r) { return r.item; });
      sel = 0;
      render();
    }

    function show() {
      if (open) return;
      open = true;
      lastFocus = doc.activeElement;
      el.classList.add('is-open');
      input.value = '';
      search('');
      input.focus();
    }

    function hide() {
      if (!open) return;
      open = false;
      el.classList.remove('is-open');
      input.removeAttribute('aria-activedescendant');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    $$('[data-palette-open]').forEach(function (btn) {
      btn.addEventListener('click', show);
    });

    el.addEventListener('mousedown', function (e) { if (e.target === el) hide(); });
    input.addEventListener('input', function () { search(input.value); });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(results.length, 1); paintSel(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + results.length) % Math.max(results.length, 1); paintSel(); }
      else if (e.key === 'Enter') {
        var cur = list.children[sel] && list.children[sel].firstChild;
        if (cur) { e.preventDefault(); location.href = cur.href; }
      } else if (e.key === 'Tab') {
        e.preventDefault();   // single-input dialog: keep focus inside
      }
    });

    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (open) { e.preventDefault(); hide(); return; }
        // Also let Esc dismiss an open lightbox (:target based).
        if (location.hash.indexOf('#lb-') === 0) { history.replaceState(null, '', location.pathname + location.search); }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        open ? hide() : show();
        return;
      }
      // "/" opens too, unless the user is typing somewhere.
      var focused = doc.activeElement || doc.body;
      if (e.key === '/' && !open && !/^(INPUT|TEXTAREA|SELECT)$/.test(focused.tagName) && !focused.isContentEditable) {
        e.preventDefault();
        show();
      }
    });
  })();
})();
