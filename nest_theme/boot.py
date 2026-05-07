"""boot_session hook + realtime palette publisher for nest_theme.

The boot_session hook computes a single space-separated string of body classes
(`syn-palette-* syn-density-* syn-font-*`) and attaches it to bootinfo. The JS
bundle reads it and applies it to <body> as early as possible so the user
never sees an unstyled flash.
"""

import frappe


# UI Select labels → CSS class slugs. Adding a new palette = add a row here
# and add the matching :root.syn-palette-<slug> block to syn_theme.bundle.css.
PALETTE_SLUG = {
    "Soft Professional": "soft-pro",
    "Accounting Crisp":  "crisp",
    "Warm Earth":        "warm-earth",
    "Corporate Navy":    "corp-navy",
    "Minimal Mono":      "minimal",
}

DEFAULT_PALETTE_SLUG = "soft-pro"
DEFAULT_DENSITY      = "comfortable"
DEFAULT_FONT_SCALE   = "md"

ALLOWED_DENSITY    = {"compact", "cozy", "comfortable"}
ALLOWED_FONT_SCALE = {"xs", "sm", "md", "lg", "xl"}


def boot_session(bootinfo):
    """Inject computed body classes + raw settings into bootinfo."""
    settings   = _settings()
    user       = frappe.session.user
    palette    = _palette_slug(settings)
    density    = _resolve_density(settings, user)
    font_scale = _resolve_font_scale(settings, user)

    bootinfo["syn_classes"] = (
        f"syn-palette-{palette} "
        f"syn-density-{density} "
        f"syn-font-{font_scale}"
    )
    bootinfo["syn_settings"]   = settings
    bootinfo["syn_user_prefs"] = _user_prefs_dict(user)


def publish_palette_change(doc, method=None):
    """When admin saves Nest Theme Settings, push a realtime event so every
    logged-in desk repaints without reload."""
    slug = PALETTE_SLUG.get(doc.palette, DEFAULT_PALETTE_SLUG)
    frappe.publish_realtime(
        "syn_palette_changed",
        {"palette": slug},
        after_commit=True,
    )


# --- helpers ---------------------------------------------------------------

def _settings():
    """Return the Nest Theme Settings doc as a plain dict, or {} if missing.
    Cached so the boot hook is cheap on every page load."""
    try:
        s = frappe.get_cached_doc("Nest Theme Settings")
        return {
            "palette":                       s.palette,
            "default_density":               s.default_density,
            "default_font_scale":            s.default_font_scale,
            "allow_user_density_override":   bool(s.allow_user_density_override),
            "allow_user_font_override":      bool(s.allow_user_font_override),
        }
    except Exception:
        return {}


def _palette_slug(settings):
    label = settings.get("palette") or "Soft Professional"
    return PALETTE_SLUG.get(label, DEFAULT_PALETTE_SLUG)


def _resolve_density(settings, user):
    instance_default = settings.get("default_density") or DEFAULT_DENSITY
    if not settings.get("allow_user_density_override", True):
        return instance_default
    pref = _user_pref(user, "density")
    return pref if pref in ALLOWED_DENSITY else instance_default


def _resolve_font_scale(settings, user):
    instance_default = settings.get("default_font_scale") or DEFAULT_FONT_SCALE
    if not settings.get("allow_user_font_override", True):
        return instance_default
    pref = _user_pref(user, "font_scale")
    return pref if pref in ALLOWED_FONT_SCALE else instance_default


def _user_pref(user, fieldname):
    if not user or user in ("Guest", "Administrator"):
        return None
    try:
        val = frappe.db.get_value(
            "Nest Theme User Preference",
            {"user": user},
            fieldname,
        )
        return val or None
    except Exception:
        return None


def _user_prefs_dict(user):
    return {
        "density":    _user_pref(user, "density"),
        "font_scale": _user_pref(user, "font_scale"),
    }
