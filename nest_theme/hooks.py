app_name        = "nest_theme"
app_title       = "Nest Theme"
app_publisher   = "Syncflo"
app_description = "Syncflo internal: Soft Professional theme for Frappe v16 + customer logo branding"
app_email       = "ops@syncflo.co.za"
app_license     = "MIT"

# Bundle filenames only — Frappe's bundler hash-fingerprints them, sidestepping
# the Frappe Cloud CDN cache trap (gotcha 2026-05-06-frappe-cloud-cdn-stale-assets.md).
app_include_css = "syn_theme.bundle.css"
app_include_js  = "syn_boot.bundle.js"

# Compute and inject body class + logo URL at session boot.
boot_session = "nest_theme.boot.boot_session"

# Push a realtime event when the admin uploads / clears a customer logo so
# logged-in desks repaint without reload.
doc_events = {
    "Nest Theme Settings": {
        "on_update": "nest_theme.boot.publish_logo_change",
    },
}
