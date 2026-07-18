# 06 — Roadmap

Eleven milestones, sequenced to protect the core loop (log a transaction → see it in
Holdings → see it in Dashboard) before any of the higher-value but non-essential
features (Benchmark, Simulate, FX decomposition) get built. This directly addresses the
scope risk named in the Risk & Cost doc — if the build stalls partway through, what
exists at every milestone boundary should still be a working, if incomplete, tool.

| # | Milestone | Delivers | Key dependency/risk |
|---|---|---|---|
| M0 | Environment & account setup | GitHub repo, Vite+React scaffold, GitHub Pages deploy pipeline proven with a trivial page. Google Cloud project + Drive API + OAuth Client ID + Testing-mode consent screen with your email added. Gemini + Twelve Data keys generated. | This is the checklist in the Tech Stack doc, executed once, before any feature code |
| M1 | Core data model + Drive read/write | `settings.json` / `transactions.json` / `asset_trends.json` schema live. Folder detection/creation on first connect. IndexedDB write-ahead buffer + debounced auto-sync + manual Sync, with the basic `modifiedTime` conflict check. | Prove the Drive round-trip works before building anything on top of it |
| M2 | Asset Master seed + basic Transactions/Holdings | Asset Master doc (02b) seeded into settings.json — category, base currency, tracking method, liquidity tier. Manual transaction entry (no LLM yet). Holdings tab showing units/value for price-tracked assets and balance for snapshot assets. | First point where the app is actually usable, even if by hand |
| M3 | Price/FX/Refresh | AMFI, Twelve Data, CoinGecko adapters. Refresh (per-asset + global), gap forward-fill, first-connection backfill. Asset Value Trends tab with status bar (last update, symbol, errors) and the alerts system wired to the left panel. | Twelve Data's real free-tier history/rate limits get verified here, not assumed |
| M4 | XIRR, realized/unrealized P&L, currency model | Newton-Raphson XIRR per holding/aggregate. FIFO-based realized P&L. Per-asset base currency + FX conversion. FX-impact decomposition (growth/currency/interaction) with worked test cases checked against independent calculations. | The single highest-stakes correctness milestone — nothing downstream should build on unverified math |
| M5 | LLM Paste & Interpret | Gemini integration for transaction parsing and asset-value backfill, both current and retrospective. Preview-before-merge on every parse. File upload (CSV/XLSX/TXT) alongside pasted text. | Verify actual Gemini free-tier RPD in AI Studio before locking the model choice |
| M6 | Dashboard, Benchmark, Trends | The interactive Dashboard (cross-filtering donut/treemap, liquidity strip, realized/unrealized P&L widget). Benchmark tab (multi-benchmark, multi-level). Trends tab's five chart types. | This is where "genuinely modern, not a default dashboard" actually gets tested against the real design ask |
| M7 | Simulate | Monte Carlo baseline (parametric, 1,000 paths), scenario comparison, historical stress-test replay, ephemeral goal-seek, save/name a scenario. | The mean/volatility assumptions per asset class need real numbers before this ships, not placeholders |
| M8 | Excel export, Demo mode, alerts polish | Bulk Excel export (transactions, holdings, FX, net worth trends, asset trends, master workbook) via SheetJS. Bundled 10-year demo dataset. Demo/My Data hard switch fully isolated. End-to-end alerts polish. | Demo mode's write-isolation from real Drive data gets explicit testing here, not assumed safe |
| M9 | Real 10-year data migration | Your actual transaction history entered — LLM-assisted for the bulk of it, manual for the 6 assets with no price source (Recovery Tokens, F&O, NPS, 3 unlisted stocks, EPFO). Cross-checked against known current balances. | Named as a real time cost in the Risk doc, not a rounding error — budget accordingly |
| M10 | Launch checklist & retro | Doc 08 — pre-launch QA pass, then a written retrospective once it's been in real use for a few weeks. | — |

## What "done" looks like at each checkpoint

- **After M2:** you can manually log a transaction and see net worth move. Ugly, but real.
- **After M4:** every number on screen is one you'd trust enough to make a decision from.
- **After M6:** the app looks and feels like the product you asked for, not a placeholder.
- **After M9:** it's actually your data, actually current, actually the tool you use monthly.

## Sequencing notes

- M0–M2 are the only strictly linear part — everything depends on the data model and
  Drive round-trip existing first.
- M3 and M5 (Refresh and LLM parsing) could run in either order or in parallel if it
  turns out to be more motivating to alternate between them — both depend on M2, neither
  depends on the other.
- M6–M8 are genuinely independent of each other and could be reordered based on what
  feels most rewarding to build next once the core (M0–M5) is solid.
- M9 deliberately comes *after* the app is feature-complete, not before — migrating 10
  years of real data into a half-finished app means redoing validation work twice.
