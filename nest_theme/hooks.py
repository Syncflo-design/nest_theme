app_name        = "nest_theme"
app_title       = "Nest Theme"
app_publisher   = "Syncflo"
app_description = "Syncflo internal: 5-palette theme switcher + customer logo branding for Frappe v16"
app_email       = "ops@syncflo.co.za"
app_license     = "MIT"

app_include_css = "syn_theme.bundle.css"
app_include_js  = "syn_boot.bundle.js"

boot_session = "nest_theme.boot.boot_session"

# Push palette + logo realtime events when admin saves Settings.
doc_events = {
    "Nest Theme Settings": {
        "on_update": "nest_theme.boot.publish_settings_change",
    },
}
