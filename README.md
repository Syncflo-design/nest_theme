# nest_theme

Syncflo-internal Frappe v16 app: a curated palette gallery (instance-locked) plus per-user toolbar widgets for density and font scale. Internal use only — no public release, no marketplace.

See `CoWork_Helper/projects/theme_studio/SCOPE.md` for the design.

## Status

v0.1 — pipeline prototype with toolbar widgets. One palette (Soft Professional, light + dark).

## Install

1. Push to `Syncflo-design/nest_theme` on GitHub (private).
2. Frappe Cloud → Bench → Apps → Add App from GitHub → branch `main`.
3. Wait for green build → Deploy.
4. Sites → `<site>` → Apps → Install → pick `nest_theme`.

## Update procedure

Any change under `public/` requires a full **Deploy** (not Update) on Frappe Cloud — Update skips `bench build` and assets stay stale. CSS/JS files are named `*.bundle.css` / `*.bundle.js` so the bundler hash-fingerprints the asset URL, killing the CDN cache trap.

## Layout

```
nest_theme/
├── pyproject.toml
├── README.md
├── license.txt
└── nest_theme/
    ├── __init__.py
    ├── hooks.py
    ├── modules.txt
    ├── patches.txt
    ├── boot.py                ← boot_session hook + realtime publisher
    ├── api.py                 ← whitelisted set_user_pref
    ├── public/
    │   ├── css/syn_theme.bundle.css
    │   └── js/syn_boot.bundle.js
    └── nest_theme/
        └── doctype/
            ├── nest_theme_settings/         ← Single, admin-only
            └── nest_theme_user_preference/  ← regular, autoname=field:user
```
