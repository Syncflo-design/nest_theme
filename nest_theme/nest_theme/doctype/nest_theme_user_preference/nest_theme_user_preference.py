import frappe
from frappe.model.document import Document


class NestThemeUserPreference(Document):
    def validate(self):
        from nest_theme.boot import ALLOWED_DENSITY, ALLOWED_FONT_SCALE
        if self.density and self.density not in ALLOWED_DENSITY:
            frappe.throw(f"Invalid density: {self.density}")
        if self.font_scale and self.font_scale not in ALLOWED_FONT_SCALE:
            frappe.throw(f"Invalid font_scale: {self.font_scale}")
