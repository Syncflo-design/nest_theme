"""boot_session hook + realtime publishers for nest_theme.

v0.3 reintroduces palette switching at instance level. Admin picks the
palette in Nest Theme Settings; boot_session resolves to the body class
slug; CSS scoped under body.syn-palette-<slug> handles the colour swap.
Realtime push on Settings save means open desks repaint without reload.
"""

import frappe


# UI Select labels → CSS class slugs. Adding a new palette = new row here
# AND a matching body.syn-palette-<slug> token block in syn_theme.bundle.css.
PALETTE_SLUG = {
    "Soft Professional": "soft-pro",
    "Accounting Crisp":  "crisp",
    "Warm Earth":        "warm-earth",
    "Corporate Navy":    "corp-navy",
    "Minimal Mono":      "minimal",
}

DEFAULT_PALETTE_LABEL = "Soft Professional"
DEFAULT_PALETTE_SLUG  = "soft-pro"
DEFAULT_LOGO_URL      = "/assets/nest_theme/images/nest_logo.svg"


def boot_session(bootinfo):
    """Inject body class + logo URL into bootinfo on every page load."""
    settings = _settings()
    bootinfo["syn_classes"]  = "syn-palette-" + _palette_slug(settings.get("palette"))
    bootinfo["syn_logo_url"] = _logo_url(settings)


def publish_settings_change(doc, method=None):
    """When admin saves Nest Theme Settings, push BOTH palette and logo
    realtime events so every open desk repaints without reload. JS listens
    on each event independently."""
    frappe.publish_realtime(
        "syn_palette_changed",
        {"palette": _palette_slug(doc.palette)},
        after_commit=True,
    )
    frappe.publish_realtime(
        "syn_logo_changed",
        {"logo_url": _logo_url({"customer_logo": doc.customer_logo})},
        after_commit=True,
    )


# --- helpers ---------------------------------------------------------------

def _settings():
    """Return Settings as a plain dict, or {} if missing.
    Cached so boot_session is cheap on every page load."""
    try:
        s = frappe.get_cached_doc("Nest Theme Settings")
        return {
            "palette":       s.palette,
            "customer_logo": s.customer_logo,
        }
    except Exception:
        return {}


def _palette_slug(label):
    return PALETTE_SLUG.get(label or DEFAULT_PALETTE_LABEL, DEFAULT_PALETTE_SLUG)


def _logo_url(settings):
    if isinstance(settings, dict):
        url = settings.get("customer_logo")
    else:
        url = getattr(settings, "customer_logo", None)
    return url or DEFAULT_LOGO_URL
