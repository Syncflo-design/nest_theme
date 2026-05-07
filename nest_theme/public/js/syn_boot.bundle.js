/* nest_theme — syn_boot.bundle.js (v0.3.0)
 *
 * Three jobs:
 * 1. Apply the palette body class from frappe.boot.syn_classes ASAP (no FOUC).
 * 2. Swap the navbar logo to frappe.boot.syn_logo_url. Listen for
 *    syn_logo_changed realtime events so admin logo uploads propagate live.
 * 3. Listen for syn_palette_changed realtime events so admin palette
 *    swaps repaint live without reload.
 *
 * No interactive controls (v0.2 dropped the toolbar widgets — see
 * gotchas/2026-05-07-frappe-v16-modern-desk-click-interception.md).
 */

(function () {
  'use strict';

  // -------- 1. Apply boot classes -------------------------------------
  function applyBootClasses() {
    if (!window.frappe || !frappe.boot || !frappe.boot.syn_classes) return;
    if (!document.body) return;
    const wanted = String(frappe.boot.syn_classes).split(/\s+/).filter(Boolean);
    Array.from(document.body.classList)
      .filter((c) => c.startsWith('syn-'))
      .forEach((c) => document.body.classList.remove(c));
    wanted.forEach((c) => document.body.classList.add(c));
  }

  if (document.body) applyBootClasses();
  document.addEventListener('DOMContentLoaded', applyBootClasses);


  // -------- 2. Logo swap ---------------------------------------------
  function applyLogo() {
    if (!window.frappe || !frappe.boot || !frappe.boot.syn_logo_url) return;
    const url = frappe.boot.syn_logo_url;
    const candidates = [
      'header.desktop-navbar .navbar-home img',
      '.navbar-home img',
      '.navbar .app-logo',
      'header img.app-logo',
    ];
    for (let i = 0; i < candidates.length; i++) {
      const el = document.querySelector(candidates[i]);
      if (el && el.getAttribute('src') !== url) {
        el.setAttribute('src', url);
        el.setAttribute('alt', 'Logo');
      }
    }
  }

  function waitForLogoEl(triesLeft) {
    if (triesLeft === undefined) triesLeft = 50;
    if (document.querySelector('header.desktop-navbar .navbar-home img, .navbar-home img')) {
      applyLogo();
      attachLogoObserver();
      return;
    }
    if (triesLeft <= 0) return;
    setTimeout(() => waitForLogoEl(triesLeft - 1), 200);
  }
  document.addEventListener('DOMContentLoaded', () => waitForLogoEl());
  if (document.readyState !== 'loading') waitForLogoEl();

  let logoObserver = null;
  function attachLogoObserver() {
    const root = document.querySelector('header.desktop-navbar') ||
                 document.querySelector('.navbar') ||
                 document.body;
    if (!root || root._synLogoObserved) return;
    logoObserver = new MutationObserver(() => applyLogo());
    logoObserver.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
    root._synLogoObserved = true;
  }

  function attachRouter() {
    if (!window.frappe || !frappe.router || !frappe.router.on) {
      setTimeout(attachRouter, 500);
      return;
    }
    frappe.router.on('change', () => applyLogo());
  }
  attachRouter();


  // -------- 3. Realtime: palette + logo ------------------------------
  function attachRealtime() {
    if (!window.frappe || !frappe.realtime || !frappe.realtime.on) {
      setTimeout(attachRealtime, 500);
      return;
    }

    frappe.realtime.on('syn_palette_changed', (data) => {
      if (!data || !data.palette) return;
      Array.from(document.body.classList)
        .filter((c) => c.startsWith('syn-palette-'))
        .forEach((c) => document.body.classList.remove(c));
      document.body.classList.add('syn-palette-' + data.palette);
    });

    frappe.realtime.on('syn_logo_changed', (data) => {
      if (data && data.logo_url) {
        frappe.boot.syn_logo_url = data.logo_url;
        applyLogo();
      }
    });
  }
  attachRealtime();
})();
