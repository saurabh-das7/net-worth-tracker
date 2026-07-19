# 07 — Build Log

Running journal of what's actually built and learned, filled in milestone by milestone
as the build happens — not written in advance. Empty at this planning stage, same
pattern as the other two portfolio projects' build logs.

## Format for each entry

```
### M[n] — [milestone name] — [date]

**Built:** what actually shipped this session
**Learned:** any gotcha, wrong assumption, or thing that took longer than expected
**Deviated from plan:** anything that changed from the PRD/Tech Stack/Roadmap docs,
  and why — keeps the docs and the real build from silently drifting apart
```

---

### M0 — Environment & deploy pipeline — [autonomous overnight session]

**Built:** Vite+React scaffold, GitHub Actions build/deploy workflow to GitHub Pages,
placeholder page proving the pipeline. Verified locally: `npm install` and `npm run
build` both succeed.
**Learned:** `npm create vite` failed non-interactively in this sandbox due to an
existing `.npmrc` prefix conflict — worked around by hand-authoring the scaffold files
directly rather than via the CLI generator. No functional difference in the output.
**Deviated from plan:** None — matches the Roadmap M0 scope exactly.

### M1 — Core data model + Drive read/write — [autonomous overnight session]

**Built:** `lib/db.js` (IndexedDB write-ahead buffer), `lib/drive.js` (real Drive API
client — folder/file find-or-create, read/write, OAuth via Google Identity Services),
`lib/sync.js` (debounced auto-sync + manual sync orchestration), `context/AppContext.jsx`
(global state: data source, currency, files, sync status, alerts), `data/assetMaster.js`
(full seed data from doc 02b), a small working `data/demoData.js`, and the left-panel
shell (`LeftPanel.jsx` + `App.jsx`) wiring it all together with placeholder tab bodies.

**Learned:** Nothing yet from real use — this was built without a live Google Client ID
(dummy value, per your instruction), so the Drive code path is written for real but
untested against the actual API.

**Deviated from plan — this is the important one:** Since no real Google OAuth Client ID
was available (you're setting that up separately), `lib/drive.js` includes a **mock
mode** — when `VITE_GOOGLE_OAUTH_CLIENT_ID` is unset or the literal dummy placeholder,
"Drive" is simulated via localStorage under a clearly separate key, so the whole app
(sign-in, folder/file creation, read/write, sync) is testable end to end without real
credentials. This was not in the original Tech Stack doc and is worth a deliberate
decision tomorrow: keep mock mode permanently as a dev/testing convenience (recommended
— costs nothing, never runs in production once a real Client ID is set), or strip it out
once real OAuth is wired up. Real Drive API calls are written in full (folder
find-or-create, multipart file creation, PATCH-based writes, the `modifiedTime`
conflict-check pattern) — they're just unexercised until a real Client ID exists.

**Also worth knowing:** the demo dataset in `data/demoData.js` is a small (6-holding,
~2-year) synthetic dataset generated with random walks, not the real bundled 10-year
dataset described in the PRD — that's still M8's job. This version exists purely so
Demo mode has something real to render at every milestone in between.

### M2 — Asset Master seed + basic Transactions/Holdings — [autonomous overnight session]

**Built:** `lib/holdings.js` (computes units/invested/current-value/gain from raw
transactions for price-tracked assets; reads balance-snapshot assets straight from the
latest trend entry, per the PRD's tracking-method split). Real `Transactions.jsx`
(manual entry form + table, read-only in Demo mode) and `Holdings.jsx` (category-filtered
table, liabilities styled distinctly, net-worth sum at the bottom).

**Deviated from plan:** Holdings currently sums values in each asset's own base
currency without cross-currency conversion — the PRD's full `units × price × FX`
model is real work that belongs at M4 alongside XIRR and the FX-decomposition formula,
not bolted on early. The net-worth total shown right now is a same-currency-only
approximation, clearly labeled as such in the UI, not presented as the real number.

**Learned:** Nothing from real use yet — same caveat as M1, this is all exercised
against the small demo dataset and manual test entries, not real data.

### M3 — Price/FX/Refresh — [autonomous overnight session, shipped and real-tested this round]

**Built:** AMFI (via mfapi.in), CoinGecko, and Twelve Data price adapters; the resolved
gap-fill refresh algorithm; a working Asset Trends tab with chart, Refresh, manual entry,
and alerts. Originally shipped untested (same caveat as M1/M2) — **this milestone has
since been exercised heavily against real Drive data and real external APIs**, see below.

### Real-world testing & hardening — [this session, following your live testing]

M0 through M3 went from "builds cleanly, never run for real" to "actually works against
your real Drive account and real market data" through a long sequence of real bugs found
by you and fixed here. Summarizing rather than listing every round individually:

**Deploy pipeline fixes:**
- The zip packaging for every early milestone silently excluded `.github/workflows/`
  (a `zip -x "*.git*"` pattern matched `.github` too) — M0's workflow never actually
  shipped, which is why an old leftover site kept showing instead of ours. Fixed by
  hand-authoring the workflow file directly in the repo.
- `deploy.yml` didn't originally pass GitHub Actions secrets into the build step's
  `env:` block — Vite bakes `VITE_*` vars at build time, so without this, real API
  keys added as repo secrets were invisible to the deployed bundle. Fixed.
- Google Sheets API had to be separately enabled on the Cloud project (Drive API being
  enabled doesn't cover it) — a real setup-step gap, not a code bug.

**Real bugs found in the app logic (not just missing features):**
- `buildInitialSettings()` correctly doesn't duplicate `id` inside each asset's stored
  value (it's already the map key) — but Demo's dataset happened to store it
  redundantly, so code that read `a.id` instead of the map key worked in Demo and
  silently broke in My Data (every dropdown option collapsed to the same empty value).
  Found and fixed in both Transactions and Asset Trends.
- Holdings showed all ~56 seeded assets as zero rows instead of just what you actually
  hold — fixed to skip assets with no transaction/value history.
- No loading state existed for the Demo→My Data switch — a ~20 second Drive round-trip
  looked identical to a broken app. Added an explicit loading state everywhere.
- Alerts accumulated instead of replacing — a second failed attempt for the same asset
  could hide behind a stale first error message. Fixed to replace, not append.
- `refresh.js` checked a field called `amfiSchemeCode` that nothing ever actually set —
  every real write path used `symbol`, the same field every other source uses. This is
  why AMFI never worked even before the search-picker existed. Fixed.
- FX and benchmarks have no transaction to anchor a first-time backfill window from —
  refresh silently only requested a single day, which fails outright if that day
  happened to be non-trading. Fixed to default to a 90-day lookback instead.
- Staleness display only ever checked `trackingMethod === 'auto'` — manually-tracked
  assets (NPS, EPFO, unlisted stocks) always showed a blank dash no matter how stale.
  Fixed to apply to both.
- No validation existed anywhere — negative units, negative prices, and dates decades
  in the future or past were all silently accepted. Added real validation throughout,
  including a rule that only Debt/Loan balances may go negative.

**Real external-service findings, not app bugs:**
- **Twelve Data's free tier excludes Indian market data entirely** (confirmed via their
  own docs) — this blocked nearly every Indian stock/ETF. Resolved by adding a second
  price source: **Google Finance via the Sheets API** (`GOOGLEFINANCE` formulas, reusing
  the same Google OAuth session already used for Drive, with the Sheets scope added).
  All NSE-listed holdings switched to this source by default.
- **CoinGecko's free tier caps historical daily data at 365 days** — a true 10-year
  crypto backfill isn't possible on the free API; older crypto history will need manual
  entry once Paste & Interpret (M5) exists.
- SGB (SGBSEP29VI-GB) could not be resolved on Google Finance despite trying multiple
  symbol formats — thin trading on this instrument means "no data" may be genuinely
  correct, not a fixable bug. Switched to manual tracking, which was always the
  documented fallback plan for this specific asset.

**Real feature additions beyond the original M3 scope, added in response to actual use:**
- **Manage Assets** — a consolidated table (tracking method, source, symbol, liquidity
  tier, honest connection/staleness status) replacing one-asset-at-a-time editing.
  Includes a live AMFI scheme search (queries mfapi.in directly) instead of needing a
  correct numeric code transcribed by hand.
- **Add new asset** and **delete asset**, closing the long-standing gap where the asset
  list was fixed at the original 02b seed and couldn't grow. This is also how F&O went
  from one generic bucket to individually-named positions, per your request.
- Balance-snapshot entries (Cash/Account/Debt) merged into the main Transactions table
  instead of a separate section, with filters, sortable columns, pagination, and inline
  edit added to that tab.

**Deviated from plan:** The Tech Stack doc's original price-source table (AMFI, Twelve
Data, CoinGecko, fixed) is now missing Google Finance as a fourth real source — worth
updating that doc to reflect this, not yet done.

### M4 — XIRR, realized/unrealized P&L, currency model — shipped, pending your confirmation

**Built:** `lib/xirr.js` (Newton-Raphson with bisection fallback), `lib/pnl.js` (FIFO
realized/unrealized P&L), `lib/currency.js` (base→display conversion), integrated into
`holdings.js` and `Holdings.jsx` — real XIRR, real currency-converted values and net
worth total, replacing the earlier "not currency-converted yet, treat as a placeholder"
state.

**Verified before shipping, given this is the highest-stakes correctness milestone:**
XIRR against a textbook case (invest 1000, get 1100 back in a year → 9.97%, correct),
FIFO P&L against a hand-computed lot sequence (exact match), and — new this round —
currency conversion run through the actual `computeHoldings` pipeline with a real
FX-rate scenario, correctly converting both directions.

**Not yet confirmed working against your real data** — you're testing this now.
