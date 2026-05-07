app_name        = "nest_theme"
app_title       = "Nest Theme"
app_publisher   = "Syncflo"
app_description = "Syncflo internal: branded palette + per-user density and font controls for Frappe v16"
app_email       = "ops@syncflo.co.za"
app_license     = "MIT"

# Bundle filenames only (no /assets/... prefix) — the bundler resolves and
# fingerprints these. Hash-suffixed URLs sidestep the Frappe Cloud CDN cache trap.
app_include_css = "syn_theme.bundle.css"
app_include_js  = "syn_boot.bundle.js"

# Compute and inject body classes at session boot.
boot_session = "nest_theme.boot.boot_session"

# Push a realtime event when the admin saves a new palette so logged-in users
# repaint without reload.
doc_events = {
    "Nest Theme Settings": {
        "on_update": "nest_theme.boot.publish_palette_change",
    },
}
