/* nest_theme — syn_boot.bundle.js
 *
 * 1. Apply body classes from frappe.boot.syn_classes ASAP (before paint).
 * 2. Build navbar toolbar widgets: density segment + font scaler.
 * 3. Listen for syn_palette_changed realtime events and live-swap palette.
 * 4. Keyboard shortcuts: Ctrl+= / Ctrl+- (font), Ctrl+Shift+D (density cycle).
 *
 * Pure additive overlay — never modifies Frappe DOM beyond appending one <li>
 * to .navbar-nav. Idempotent: re-render won't duplicate widgets.
 */

(function () {
  'use strict';

  const FONT_STEPS = ['xs', 'sm', 'md', 'lg', 'xl'];
  const FONT_PCTS  = { xs: 85, sm: 92, md: 100, lg: 115, xl: 130 };
  const DENSITIES  = ['compact', 'cozy', 'comfortable'];
  const DENSITY_LABEL = { compact: '▬', cozy: '▬▬', comfortable: '▬▬▬' };

  // -------- 1. Apply boot classes --------------------------------------
  function applyBootClasses() {
    if (!window.frappe || !frappe.boot || !frappe.boot.syn_classes) return;
    const wanted = String(frappe.boot.syn_classes).split(/\s+/).filter(Boolean);
    if (!document.body) return;
    // Remove any prior syn-* classes (defensive on repeat applies)
    Array.from(document.body.classList)
      .filter((c) => c.startsWith('syn-'))
      .forEach((c) => document.body.classList.remove(c));
    wanted.forEach((c) => document.body.classList.add(c));
  }

  if (document.body) applyBootClasses();
  document.addEventListener('DOMContentLoaded', applyBootClasses);


  // -------- 2. Toolbar widgets -----------------------------------------
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
        // Silent: no toast on success/error
        callback: function () {},
      });
    }, 350);
  }

  function buildWidgets() {
    if (document.querySelector('.syn-toolbar-widgets')) return;  // idempotent
    const navbar = document.querySelector('.navbar .navbar-nav, header.navbar ul');
    if (!navbar) return;
    if (!frappe || !frappe.boot) return;

    const settings = frappe.boot.syn_settings || {};
    const allowDensity = settings.allow_user_density_override !== false &&
                         settings.allow_user_density_override !== 0;
    const allowFont    = settings.allow_user_font_override    !== false &&
                         settings.allow_user_font_override    !== 0;
    if (!allowDensity && !allowFont) return;

    const li = document.createElement('li');
    li.className = 'syn-toolbar-widgets nav-item';

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
        btn.addEventListener('click', () => setDensity(d));
        seg.appendChild(btn);
      });
      li.appendChild(seg);
    }

    if (allowFont) {
      const scaler = document.createElement('div');
      scaler.className = 'syn-font-scaler';
      scaler.title = 'Font size (right-click to reset, Ctrl+= / Ctrl+-)';

      const minus = document.createElement('button');
      minus.type = 'button';
      minus.textContent = '−';
      minus.title = 'Smaller font (Ctrl+-)';
      minus.addEventListener('click', () => bumpFont(-1));

      const pct = document.createElement('span');
      pct.className = 'syn-font-pct';
      pct.textContent = (FONT_PCTS[currentFont()] || 100) + '%';

      const plus = document.createElement('button');
      plus.type = 'button';
      plus.textContent = '+';
      plus.title = 'Larger font (Ctrl+=)';
      plus.addEventListener('click', () => bumpFont(1));

      scaler.appendChild(minus);
      scaler.appendChild(pct);
      scaler.appendChild(plus);
      scaler.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const instanceDefault = (frappe.boot.syn_settings && frappe.boot.syn_settings.default_font_scale) || 'md';
        setFont(instanceDefault);
      });
      li.appendChild(scaler);
    }

    navbar.appendChild(li);
  }

  function waitForNavbar(triesLeft) {
    if (triesLeft === undefined) triesLeft = 50;  // ~10 s max
    if (document.querySelector('.navbar .navbar-nav, header.navbar ul')) {
      buildWidgets();
      return;
    }
    if (triesLeft <= 0) return;
    setTimeout(() => waitForNavbar(triesLeft - 1), 200);
  }
  document.addEventListener('DOMContentLoaded', () => waitForNavbar());
  if (document.readyState !== 'loading') waitForNavbar();


  // -------- 3. Realtime palette change ---------------------------------
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


  // -------- 4. Keyboard shortcuts --------------------------------------
  document.addEventListener('keydown', function (e) {
    // Ignore when typing in an input/textarea/contenteditable
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
