# Econometrics Lab v0.1

A zero-server, browser-based econometrics workspace. It uses webR to execute R locally in the visitor's browser.

## Included in this MVP

- Responsive visual workspace
- CSV and Excel import
- Dataset preview and type detection
- OLS through `stats::lm()`
- Classical or manually calculated HC1 standard errors
- Jarque-Bera, Breusch-Pagan, Breusch-Godfrey lag-1, and VIF diagnostics
- Coefficient tables, residual plots, generated R code, and CSV export
- Custom R console
- Local browser project saving and portable JSON export
- PWA manifest and offline shell cache
- 32-method coverage ledger

## Run locally

Serve the folder over HTTP. For example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

The first model run downloads webR. After the browser and service worker cache the resources, repeat use can work offline subject to browser cache policies.

## Deploy free on Cloudflare Pages

1. Push this folder to a public GitHub repository.
2. In Cloudflare Pages, import the repository.
3. Use no build command.
4. Set the output directory to `/`.
5. The included `_headers` file enables cross-origin isolation where supported.

GitHub Pages can be used as a backup host. webR automatically falls back to its PostMessage channel where cross-origin isolation headers are unavailable.

## Current boundary

Only methods marked **Executable** have been validated in this MVP. The remaining methods are indexed and require additional visual adapters and webR package compatibility testing.

## Interface preview

![Econometrics Lab workspace](screenshots/home.png)

![Method library](screenshots/methods.png)

![Mobile layout](screenshots/mobile.png)
