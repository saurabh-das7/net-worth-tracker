# 04 — Tech Stack Decisions

## Architecture overview

```
Browser (React + Vite, static build on GitHub Pages)
  │
  ├── Local write-ahead buffer (IndexedDB) — every edit lands here first
  │
  ├── Google Drive API (drive.file scope) — the database, owner's own Drive
  │     one app folder → settings.json / transactions.json / asset_trends.json
  │
  ├── Price/FX data sources (client-side fetch, on-demand Refresh only)
  │     AMFI (IN MF NAV) · Twelve Data (stocks/indices/FX) · CoinGecko (crypto)
  │
  └── Gemini API (free tier) — LLM-assisted Paste & Interpret, preview-before-merge
```

No custom backend anywhere in this diagram. Every box is either the browser itself, the
owner's own Drive, or a third-party API called directly from the browser.

## Stack summary

| Layer | Choice | Why |
|---|---|---|
| Framework | React + Vite | Component isolation for a 7-tab app; matches how you already build |
| Hosting | GitHub Pages (static build) | Free, matches existing GitHub portfolio pattern |
| Data store | Google Drive (`drive.file` scope) | Per-account isolation *is* the access control — no custom auth needed |
| Local buffer | IndexedDB | Structured, async, no practical size ceiling like localStorage has |
| Charts | Recharts (standard) + D3 (treemap, step function, Monte Carlo bands) | Recharts covers 80% fast; D3 for the custom pieces Recharts can't do well |
| LLM parsing | Gemini API free tier | Consistent with the rest of the portfolio; verify actual RPD in AI Studio before committing to a specific model, per the lesson from prior builds |
| Excel export | SheetJS (xlsx) | Client-side workbook generation, no server needed |
| Price/FX data | AMFI (free, no key) · Twelve Data (free tier) · CoinGecko (free tier) | Three vendors total, each already free-tier proven in your other projects or public/no-key |

---

## Data storage: Google Drive schema

**Folder:** one app-created folder in the owner's Drive (e.g. `NetWorthTracker`). On
first successful connection, the app checks for this folder; if absent, creates it and
seeds three blank template files. If present (e.g. pre-created by you), it uses the
existing files as-is.

**Files — one JSON file per data type, not per asset:**

| File | Contents |
|---|---|
| `settings.json` | Asset master: category, base currency, **tracking method** (auto price-feed / manual price-feed / balance-snapshot), liquidity tier, connected symbol/code, connection status |
| `transactions.json` | Every transaction: date, holding, type, units, amount, **original currency** |
| `asset_trends.json` | Day-wise values for every tracked asset **and** the USD/INR FX rate **and** the four benchmarks (Nifty 50, Nasdaq, Gold, FD) — all as pinned entries using the same schema, so one forward-fill/backfill/refresh code path handles everything |

**Why single files, not one file per asset:** at ~30–50 assets × 10 years of daily
values, the whole `asset_trends.json` is realistically a few MB — trivial for a browser
to fetch and parse. Per-asset files would need an index/manifest and more Drive API
calls per Sync, for no real benefit at this scale. If file size becomes a real problem
later (unlikely at personal-use volume), splitting by year is the documented escape
hatch — not a v1 concern.

**Auth:** Google Identity Services (GIS), client-side OAuth with PKCE — no client
secret, appropriate for a static SPA. Honest limitation: without a backend to hold a
refresh token securely, the access token is short-lived (~1 hour), so you may see a
silent or one-click re-auth prompt each session rather than a "connected forever"
feeling. This is a real trade-off of staying fully backend-free, not an oversight.

---

## Local write-ahead buffer & sync

**Storage mechanism:** IndexedDB (via a thin wrapper library like `idb`), not
localStorage — structured data, async, no practical size ceiling.

**Flow:** every confirmed change (a merged transaction, a corrected asset value, an
edited setting) writes to IndexedDB immediately. A debounced background process
(a few seconds after the last change, batching rapid edits into one write) pushes the
updated file(s) to Drive. The explicit **Sync** button forces an immediate push, or
retries if the background push failed (offline, expired auth).

**Conflict handling — kept deliberately simple.** Before writing, the app checks the
Drive file's `modifiedTime` against what it last read. If it changed elsewhere (e.g. the
same account used on a second device) since the last local sync, the user is warned and
choose "keep mine / take Drive's" rather than the app silently overwriting one side.
This is not a full merge/CRDT system — appropriate for a single-user tool, not
over-engineered for a use case that doesn't need it.

---

## Currency & valuation model

**Per-date value in an asset's base currency:**
`value = units × price_per_unit(date)`

**Converted to display currency (only when base ≠ display):**
`display_value = value × fx_rate(base → display, date)`

Both `price_per_unit(date)` and `fx_rate(date)` independently use the forward-fill rule
(last actual entry/fetch holds until superseded) — they are never assumed to be "live,"
always "as of the last available close."

**FX-impact decomposition — resolved formula.** This is standard currency-attribution
methodology from international investing, not something invented ad hoc:

- Let `V0` = value in base currency at investment, `V1` = value in base currency now
- Let `FX0` = FX rate at investment, `FX1` = FX rate now
- **Asset growth effect** = `(V1 − V0) × FX0` — what the asset alone earned, at a
  constant exchange rate
- **Currency effect** = `V1 × (FX1 − FX0)` — what currency movement alone contributed
- **Interaction effect** (small, usually) = `(V1 − V0) × (FX1 − FX0)` — folded into the
  currency bucket by convention, shown separately if it's non-trivial

Summed across holdings for a period, this is what powers the Trends "contribution vs.
growth vs. currency" chart. Worked numeric examples should be built and checked before
that chart ships, as flagged in the PRD.

---

## Price, FX, and benchmark data sources

| Category | Source | Notes |
|---|---|---|
| Indian mutual funds | AMFI daily NAV files | Free, public, no API key — the authoritative source, not a third-party wrapper |
| Indian/US listed stocks | Twelve Data (free tier) | Has historical endpoints needed for backfill; verify actual daily call limits in their dashboard before committing, same lesson as prior builds |
| Crypto | CoinGecko (free tier) | Already proven free-tier in other projects |
| Gold | Proxy via a gold ETF (e.g. GOLDBEES) price | Avoids adding a fourth vendor just for gold — reuses the stock/ETF price path |
| Nifty 50 / Nasdaq benchmarks | Proxy via index ETFs (e.g. NIFTYBEES, a Nasdaq-tracking ETF) | Same reasoning — reuses existing infrastructure instead of a separate index-data API |
| FD reference rate | Fixed assumed annual rate, editable in Settings, compounded daily | No free live API for bank FD rates exists — a transparent assumption is more honest than a fake "live" number |
| USD/INR FX | Twelve Data forex endpoint | Keeps vendor count at three total instead of four |

**Refresh algorithm — resolved:**
1. For each connected asset/FX/benchmark, find the last stored date.
2. Request from (last stored date + 1) through yesterday.
3. Write only the dates the source actually returns.
4. Forward-fill any gap dates up to yesterday from the prior value (same mechanism for
   weekend gaps as for genuinely stale manual entries — one rule, not two).
5. Never write today's date — the product deliberately tracks "yesterday's close," not
   live/intraday.

**First-connection backfill:** when an asset is newly connected, steps 1–4 run from the
asset's first transaction date instead of "last stored date" — this can mean several
years of daily data in one pass, shown with a progress indicator, and may need to be
paginated depending on the API's per-call history limits (needs verifying against
Twelve Data's actual free-tier constraints during build).

**Symbol/code mapping:** LLM-suggested at asset creation, not blocking creation even if
uncertain. If Refresh fails for a specific asset (symbol not found), that surfaces as a
sync error/alert in Asset Value Trends, with the symbol field editable right there —
resolved as "let it surface and fix in place" rather than a heavyweight verification
step at creation time.

---

## LLM-assisted parsing

Gemini API free tier, matching the rest of the portfolio. Given this data is financial
(amounts, dates, and currency matter more here than in a categorisation tool), default
to the standard Flash tier rather than Flash-Lite for parsing accuracy, with Flash-Lite
as a fallback if rate-limited — **verify actual free-tier RPD in AI Studio before
committing**, the same lesson learned building the other two portfolio apps (advertised
limits and real limits have differed before).

Every parse — transaction, asset value, retrospective backfill, regardless of source
(pasted text or uploaded file) — returns a preview for confirmation before merge, per
the PRD's "nothing parsed writes silently" principle. No exceptions in the
implementation either.

---

## Performance strategy for 10-year data volume

- Aggregations (XIRR, P&L, allocation, benchmark comparisons) are computed once and
  memoized (`useMemo`, keyed on a data-version marker), not recomputed on every render.
- XIRR (Newton-Raphson) is cached per holding and only recalculated when that holding's
  transactions or asset trend change — not globally on every data mutation.
- Charts render from precomputed rollups (e.g. monthly/yearly aggregates for the Trends
  view), not by replaying the full daily transaction log on every paint.

## Realized P&L computation method — resolved

**FIFO (first-in-first-out)** for cost-basis matching on sells. This isn't an arbitrary
pick — it's also how Indian capital gains tax law computes cost basis for equity/MF by
default, so choosing it now means the deferred Tax Awareness feature won't need to redo
this logic later.

## Monte Carlo method — resolved (v1 baseline)

Parametric: for each simulated path, draw annual returns per asset class from a normal
distribution using editable mean/volatility assumptions per category (e.g. Equity
~12%/18%, Debt ~7%/3%, defaults editable in Settings). Run ~1,000 paths over the horizon,
report 10th/50th/90th percentile bands per year. Simpler to build and reason about than
historical bootstrap sampling — upgrading to bootstrap-from-real-history is a reasonable
v1.1 enhancement, not a v1 requirement.

## Excel export

SheetJS (`xlsx`), client-side, no server round-trip — generates the transactions,
holdings, FX/asset trend, and master workbooks directly from in-memory data.

## Deployment

GitHub Actions workflow: on push to `main`, `npm run build`, deploy `dist/` to the
`gh-pages` branch (or GitHub Pages' native Actions deployment). Standard, free,
consistent with a static-only site — no server-side pipeline needed anywhere.

---

## Items this doc resolves (cross-reference to PRD open questions)

| PRD open question | Resolution |
|---|---|
| Drive file/folder schema | Single JSON per data type — see Data Storage section |
| Realized P&L method | FIFO |
| Monte Carlo method | Parametric normal-distribution, 1,000 paths, v1 baseline |
| FD reference rate source | Fixed, editable, daily-compounded assumption |
| Symbol/code mapping confidence | Non-blocking at creation, surfaces as alert on failure |
| 10-year Drive performance | Single-file-per-type is small enough at this scale; year-split is the documented fallback if needed |
| FX-impact decomposition formula | Standard growth/currency/interaction attribution formula given above |

## Still genuinely open

- Custom domain for GitHub Pages, or the default `saurabh-das7.github.io` URL — low
  stakes, your call whenever.
- Exact Twelve Data free-tier call/history limits — needs verifying in their dashboard
  once we're actually building, not assumed from marketing copy.
- Monte Carlo default mean/volatility assumptions per asset class — needs real numbers,
  not placeholders, before the Simulate tab ships.

---

## API & auth setup checklist — what to hardcode, what to gate, and when

This is the full list of accounts/keys the build needs. None of this needs to happen
now — it's an early **Roadmap milestone**, done once, before any real feature code —
captured here so nothing gets forgotten between now and then.

| Item | Cost | Safe to hardcode in the public bundle? | Setup step |
|---|---|---|---|
| Google Cloud project + Drive API enabled | Free | — | Create project, enable Drive API |
| Google OAuth Client ID | Free | **Yes** — it identifies the app, not a secret; the actual gate is your own Google login + consent | Create OAuth credentials, add the GitHub Pages URL as an authorized origin |
| OAuth consent screen — **Testing mode** | Free | — | Add your own email as a test user. Testing mode supports up to 100 test users with **zero verification process** — since only you will ever use My Data, this fully avoids Google's app-verification review |
| Gemini API key (AI Studio) | Free tier | No secret protection possible in a pure static app — accepted trade-off, see below | Generate in AI Studio, confirm no billing is attached to the project so the ceiling is "hits free-tier limit," not "surprise charge" |
| Twelve Data API key | Free tier | Same trade-off as Gemini | Sign up, generate key, verify actual daily/history limits in their dashboard |
| CoinGecko, AMFI | Free, no key needed | N/A | Nothing to set up |

**On hardcoding API keys with no backend to hide them:** this is a real, honest trade-off
of the fully static/no-server architecture — Twelve Data and Gemini keys will be visible
in browser network requests to anyone who inspects them. For a personal project this is
an acceptable risk: worst case for Twelve Data is someone burns the free daily quota
(regenerate the key); worst case for Gemini, with no billing attached, is hitting the
free-tier cap, not an unexpected charge. The alternative — a small proxy server just to
hide two keys — reintroduces the backend this whole architecture was built to avoid, and
isn't worth it at this scale. The Google OAuth Client ID has no such trade-off — it was
never a secret to begin with.
