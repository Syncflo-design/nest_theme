/* nest_theme — syn_boot.bundle.js (v0.2.0)
 *
 * Two jobs:
 * 1. Apply the palette body class from frappe.boot.syn_classes ASAP.
 * 2. Swap the navbar logo to frappe.boot.syn_logo_url. Listen for
 *    syn_logo_changed realtime events so admin logo uploads propagate
 *    without reload.
 *
 * v0.2 dropped the toolbar widgets entirely (density / font / per-user
 * prefs) — Frappe v16's navbar swallows mouse clicks even at capture
 * phase. The theme is now apply-only, no interactive controls.
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
    // Modern v16 desk: header.desktop-navbar .navbar-home img
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
    if (triesLeft === undefined) triesLeft = 50;  // ~10 s max
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

  // If Frappe re-renders the navbar (e.g. on logout / login), reapply.
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

  // SPA navigation hook
  function attachRouter() {
    if (!window.frappe || !frappe.router || !frappe.router.on) {
      setTimeout(attachRouter, 500);
      return;
    }
    frappe.router.on('change', () => applyLogo());
  }
  attachRouter();

  // Realtime: admin uploaded a new logo, repaint live.
  function attachRealtime() {
    if (!window.frappe || !frappe.realtime || !frappe.realtime.on) {
      setTimeout(attachRealtime, 500);
      return;
    }
    frappe.realtime.on('syn_logo_changed', (data) => {
      if (data && data.logo_url) {
        frappe.boot.syn_logo_url = data.logo_url;
        applyLogo();
      }
    });
  }
  attachRealtime();
})();
