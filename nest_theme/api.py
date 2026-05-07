"""Whitelisted endpoints for nest_theme toolbar widgets."""

import frappe

from nest_theme.boot import ALLOWED_DENSITY, ALLOWED_FONT_SCALE


@frappe.whitelist()
def set_user_pref(field, value):
    """Persist a per-user theme preference. Called by the toolbar widgets,
    debounced client-side. Validates field + value, upserts the user's row in
    Nest Theme User Preference."""
    user = frappe.session.user
    if user == "Guest":
        frappe.throw("Login required")

    if field == "density":
        if value not in ALLOWED_DENSITY:
            frappe.throw(f"Invalid density: {value}")
    elif field == "font_scale":
        if value not in ALLOWED_FONT_SCALE:
            frappe.throw(f"Invalid font_scale: {value}")
    else:
        frappe.throw(f"Unknown pref field: {field}")

    _ensure_pref_row(user)
    frappe.db.set_value(
        "Nest Theme User Preference",
        {"user": user},
        field,
        value,
    )
    frappe.db.commit()
    return {"ok": True, "field": field, "value": value}


@frappe.whitelist()
def reset_user_pref(field):
    """Clear a per-user pref so the instance default applies again."""
    user = frappe.session.user
    if user == "Guest":
        frappe.throw("Login required")
    if field not in ("density", "font_scale"):
        frappe.throw(f"Unknown pref field: {field}")

    if frappe.db.exists("Nest Theme User Preference", {"user": user}):
        frappe.db.set_value(
            "Nest Theme User Preference",
            {"user": user},
            field,
            None,
        )
        frappe.db.commit()
    return {"ok": True}


# --- helpers ---------------------------------------------------------------

def _ensure_pref_row(user):
    if frappe.db.exists("Nest Theme User Preference", {"user": user}):
        return
    doc = frappe.new_doc("Nest Theme User Preference")
    doc.user = user
    doc.insert(ignore_permissions=True)
