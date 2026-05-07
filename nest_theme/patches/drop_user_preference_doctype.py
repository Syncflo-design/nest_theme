"""Drop the v0.1 Nest Theme User Preference doctype on upgrade to v0.2.

v0.1 had per-user density/font prefs. v0.2 removes the toolbar widgets and
the per-user pref layer entirely, so the doctype + table are now orphaned.
"""

import frappe


def execute():
    if frappe.db.exists("DocType", "Nest Theme User Preference"):
        frappe.delete_doc(
            "DocType",
            "Nest Theme User Preference",
            force=True,
            ignore_missing=True,
        )
    try:
        frappe.db.sql("DROP TABLE IF EXISTS `tabNest Theme User Preference`")
    except Exception:
        pass
