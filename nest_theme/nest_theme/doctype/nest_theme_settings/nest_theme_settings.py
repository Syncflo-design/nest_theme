import frappe
from frappe.model.document import Document


class NestThemeSettings(Document):
    def validate(self):
        from nest_theme.boot import PALETTE_SLUG
        if self.palette and self.palette not in PALETTE_SLUG:
            frappe.throw(f"Unknown palette: {self.palette}")
