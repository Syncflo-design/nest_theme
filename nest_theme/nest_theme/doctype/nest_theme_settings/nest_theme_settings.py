import frappe
from frappe.model.document import Document


class NestThemeSettings(Document):
    def validate(self):
        # Defensive: even though Select limits options, double-check the slugs
        # we'll use downstream are well-formed.
        from nest_theme.boot import (
            PALETTE_SLUG,
            ALLOWED_DENSITY,
            ALLOWED_FONT_SCALE,
        )
        if self.palette and self.palette not in PALETTE_SLUG:
            frappe.throw(f"Unknown palette: {self.palette}")
        if self.default_density and self.default_density not in ALLOWED_DENSITY:
            frappe.throw(f"Invalid default density: {self.default_density}")
        if self.default_font_scale and self.default_font_scale not in ALLOWED_FONT_SCALE:
            frappe.throw(f"Invalid default font scale: {self.default_font_scale}")
