/* nest_theme — syn_boot.bundle.js (v0.1.2)
 *
 * 1. Apply body classes from frappe.boot.syn_classes ASAP (before paint).
 * 2. Build navbar toolbar widgets: density segment + font scaler.
 *    - Modern v16 anchor: insert immediately before .desktop-notifications
 *      inside header.desktop-navbar > .flex.
 *    - Legacy fallback: .navbar .navbar-nav, filtered to skip the hidden
 *      notification-item-tabs ul (which is what tripped v0.1).
 *    - MutationObserver re-builds if Frappe re-renders the navbar.
 *    - frappe.router.on('change') hook re-builds on SPA route changes.
 * 3. Document-level CAPTURE-phase click + contextmenu delegation. Frappe v16
 *    has handlers in the navbar that swallow real mouse clicks before they
 *    reach our buttons (programmatic .click() bypasses them — that's how we
 *    spotted it). We listen on document with {capture: true} to run before
 *    those handlers, stopPropagation to keep Frappe's bubble handlers out.
 * 4. Listen for syn_palette_changed realtime events and live-swap palette.
 * 5. Keyboard shortcuts: Ctrl+= / Ctrl+- (font), Ctrl+Shift+D (density cycle).
 *
 * v0.1.2: capture-phase delegation. v0.1.1: v16 anchor + observer.
 */

(function () {
  'use strict';

  const FONT_STEPS = ['xs', 'sm', 'md', 'lg', 'xl'];
  const FONT_PCTS  = { xs: 85, sm: 92, md: 100, lg: 115, xl: 130 };
  const DENSITIES  = ['compact', 'cozy', 'comfortable'];
  const DENSITY_LABEL = { compact: '─', cozy: '──', comfortable: '───' };

  // -------- 1. Apply boot classes --------------------------------------
  function applyBootClasses() {
    if (!window.frappe || !frappe.boot || !frappe.boot.syn_classes) return;
    const wanted = String(frappe.boot.syn_classes).split(/\s+/).filter(Boolean);
    if (!document.body) return;
    Array.from(document.body.classList)
      .filter((c) => c.startsWith('syn-'))
      .forEach((c) => document.body.classList.remove(c));
    wanted.forEach((c) => document.body.classList.add(c));
  }

  if (document.body) applyBootClasses();
  document.addEventListener('DOMContentLoaded', applyBootClasses);


  // -------- 2. State helpers + setters --------------------------------
  function currentDensity() {
    const cls = Array.from(document.body.classList).find((c) => c.startsWith('syn-density-'));
    return cls ? cls.replace('syn-density-', '') : 'comfortable';
  }
  function currentFont() {
    const cls = Array.from(document.body.classList).find((c) => c.startsWith('syn-font-'));
    return cls ? cls.replace('syn-font-', '') : 'md';
  }

  function setDensity(d) {
    if (!DENSITIES.includes(d)) return;
    Array.from(document.body.classList)
      .filter((c) => c.startsWith('syn-density-'))
      .forEach((c) => document.body.classList.remove(c));
    document.body.classList.add('syn-density-' + d);
    document.querySelectorAll('.syn-density-segment button').forEach((b) => {
      b.classList.toggle('active', b.dataset.density === d);
    });
    debouncedSave('density', d);
  }

  function setFont(slug) {
    if (!FONT_STEPS.includes(slug)) return;
    Array.from(document.body.classList)
      .filter((c) => c.startsWith('syn-font-'))
      .forEach((c) => document.body.classList.remove(c));
    document.body.classList.add('syn-font-' + slug);
    const pctEl = document.querySelector('.syn-font-pct');
    if (pctEl) pctEl.textContent = FONT_PCTS[slug] + '%';
    debouncedSave('font_scale', slug);
  }

  function bumpFont(delta) {
    const cur = currentFont();
    const idx = FONT_STEPS.indexOf(cur);
    const next = Math.max(0, Math.min(FONT_STEPS.length - 1, idx + delta));
    if (FONT_STEPS[next] === cur) return;
    setFont(FONT_STEPS[next]);
  }

  let saveTimer = null;
  function debouncedSave(field, value) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (!window.frappe || !frappe.call) return;
      frappe.call({
        method: 'nest_theme.api.set_user_pref',
        args:   { field: field, value: value },
        callback: function () {},
      });
    }, 350);
  }


  // -------- 3. Document-level event delegation (CAPTURE phase) --------
  // Runs before Frappe's bubble-phase navbar click handlers. Survives any
  // number of widget rebuilds since the listener is on document, not buttons.

  document.addEventListener('click', function (e) {
    const t = e.target;
    if (!t || !t.closest) return;
    if (!t.closest('.syn-toolbar-widgets')) return;

    const dBtn = t.closest('.syn-density-segment button');
    if (dBtn) {
      e.stopPropagation();
      e.preventDefault();
      setDensity(dBtn.dataset.density);
      return;
    }

    const fBtn = t.closest('.syn-font-scaler button');
    if (fBtn) {
      e.stopPropagation();
      e.preventDefault();
      // Minus button has the textContent '−' (U+2212), plus has '+'.
      bumpFont(fBtn.textContent === '−' ? -1 : 1);
      return;
    }
  }, { capture: true });

  document.addEventListener('contextmenu', function (e) {
    if (!e.target || !e.target.closest) return;
    if (!e.target.closest('.syn-font-scaler')) return;
    e.stopPropagation();
    e.preventDefault();
    const def = (window.frappe && frappe.boot && frappe.boot.syn_settings &&
                 frappe.boot.syn_settings.default_font_scale) || 'md';
    setFont(def);
  }, { capture: true });

  // Also block mousedown propagation so Frappe doesn't get a chance to
  // swallow the subsequent click before it reaches us.
  document.addEventListener('mousedown', function (e) {
    if (e.target && e.target.closest && e.target.closest('.syn-toolbar-widgets button')) {
      e.stopPropagation();
    }
  }, { capture: true });


  // -------- 4. Build / re-build the widget ---------------------------
  // Find where to insert. Modern v16 desk first, legacy navbar second.
  function findAnchor() {
    const bell = document.querySelector('header.desktop-navbar .desktop-notifications');
    if (bell && bell.parentElement) {
      return { mode: 'before', node: bell };
    }
    const navs = document.querySelectorAll('.navbar .navbar-nav');
    for (let i = 0; i < navs.length; i++) {
      const n = navs[i];
      if (n.classList.contains('notification-item-tabs')) continue;
      if (n.classList.contains('nav-tabs'))               continue;
      if (n.offsetWidth === 0)                            continue;
      return { mode: 'append', node: n };
    }
    return null;
  }

  function buildWidgets() {
    if (document.querySelector('.syn-toolbar-widgets')) return;  // idempotent
    if (!window.frappe || !frappe.boot)                 return;
    const anchor = findAnchor();
    if (!anchor) return;

    const settings = frappe.boot.syn_settings || {};
    const allowDensity = settings.allow_user_density_override !== false &&
                         settings.allow_user_density_override !== 0;
    const allowFont    = settings.allow_user_font_override    !== false &&
                         settings.allow_user_font_override    !== 0;
    if (!allowDensity && !allowFont) return;

    const wrap = document.createElement('div');
    wrap.className = 'syn-toolbar-widgets';

    if (allowDensity) {
      const seg = document.createElement('div');
      seg.className = 'syn-density-segment';
      seg.title = 'Density (Ctrl+Shift+D to cycle)';
      DENSITIES.forEach((d) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.density = d;
        btn.title = d.charAt(0).toUpperCase() + d.slice(1);
        btn.textContent = DENSITY_LABEL[d];
        if (currentDensity() === d) btn.classList.add('active');
        // No per-button click handler — document-level delegation handles it.
        seg.appendChild(btn);
      });
      wrap.appendChild(seg);
    }

    if (allowFont) {
      const scaler = document.createElement('div');
      scaler.className = 'syn-font-scaler';
      scaler.title = 'Font size (right-click to reset, Ctrl+= / Ctrl+-)';

      const minus = document.createElement('button');
      minus.type = 'button';
      minus.textContent = '−';   // U+2212, must match the click delegate
      minus.title = 'Smaller font (Ctrl+-)';

      const pct = document.createElement('span');
      pct.className = 'syn-font-pct';
      pct.textContent = (FONT_PCTS[currentFont()] || 100) + '%';

      const plus = document.createElement('button');
      plus.type = 'button';
      plus.textContent = '+';
      plus.title = 'Larger font (Ctrl+=)';

      scaler.appendChild(minus);
      scaler.appendChild(pct);
      scaler.appendChild(plus);
      wrap.appendChild(scaler);
    }

    if (anchor.mode === 'before') {
      anchor.node.parentElement.insertBefore(wrap, anchor.node);
    } else {
      anchor.node.appendChild(wrap);
    }
  }

  // Re-build the widget if Frappe wipes the navbar / re-renders it.
  let observer = null;
  function attachObserver() {
    const root = document.querySelector('header.desktop-navbar') ||
                 document.querySelector('.navbar')               ||
                 document.body;
    if (!root || root._synObserved) return;
    observer = new MutationObserver(() => {
      if (!document.querySelector('.syn-toolbar-widgets')) {
        buildWidgets();
      }
    });
    observer.observe(root, { childList: true, subtree: true });
    root._synObserved = true;
  }

  function waitForNavbar(triesLeft) {
    if (triesLeft === undefined) triesLeft = 50;  // ~10 s max
    if (findAnchor()) {
      buildWidgets();
      attachObserver();
      return;
    }
    if (triesLeft <= 0) return;
    setTimeout(() => waitForNavbar(triesLeft - 1), 200);
  }
  document.addEventListener('DOMContentLoaded', () => waitForNavbar());
  if (document.readyState !== 'loading') waitForNavbar();

  function attachRouter() {
    if (!window.frappe || !frappe.router || !frappe.router.on) {
      setTimeout(attachRouter, 500);
      return;
    }
    frappe.router.on('change', () => {
      buildWidgets();
      attachObserver();
    });
  }
  attachRouter();


  // -------- 5. Realtime palette change -------------------------------
  function attachRealtime() {
    if (!window.frappe || !frappe.realtime || !frappe.realtime.on) {
      setTimeout(attachRealtime, 500);
      return;
    }
    frappe.realtime.on('syn_palette_changed', function (data) {
      if (!data || !data.palette) return;
      Array.from(document.body.classList)
        .filter((c) => c.startsWith('syn-palette-'))
        .forEach((c) => document.body.classList.remove(c));
      document.body.classList.add('syn-palette-' + data.palette);
    });
  }
  attachRealtime();


  // -------- 6. Keyboard shortcuts -------------------------------------
  document.addEventListener('keydown', function (e) {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

    if (e.ctrlKey && !e.shiftKey && !e.altKey && (e.key === '=' || e.key === '+')) {
      e.preventDefault();
      bumpFont(1);
    } else if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === '-') {
      e.preventDefault();
      bumpFont(-1);
    } else if (e.ctrlKey && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      const order = ['comfortable', 'cozy', 'compact'];
      const idx = order.indexOf(currentDensity());
      setDensity(order[(idx + 1) % order.length]);
    }
  });
})();
