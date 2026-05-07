"""boot_session hook + realtime logo publisher for nest_theme.

v0.2 simplification: no density/font/per-user prefs. The body always gets
a single class (`syn-palette-soft-pro`); the navbar logo URL is computed
from Settings.customer_logo with a packaged Nest default fallback.
"""

import frappe


PALETTE_CLASS = "syn-palette-soft-pro"
DEFAULT_LOGO_URL = "/assets/nest_theme/images/nest_logo.svg"


def boot_session(bootinfo):
    """Inject body class + logo URL into bootinfo."""
    bootinfo["syn_classes"] = PALETTE_CLASS
    bootinfo["syn_logo_url"] = _logo_url()


def publish_logo_change(doc, method=None):
    """When admin saves Nest Theme Settings (e.g. uploads a customer logo),
    push a realtime event so every open desk swaps the navbar logo without
    reload."""
    frappe.publish_realtime(
        "syn_logo_changed",
        {"logo_url": _logo_url()},
        after_commit=True,
    )


# --- helpers ---------------------------------------------------------------

def _logo_url():
    try:
        s = frappe.get_cached_doc("Nest Theme Settings")
        if s.customer_logo:
            return s.customer_logo
    except Exception:
        pass
    return DEFAULT_LOGO_URL
