# 03 — UX Flow & Wireframe

## Global structure

```
┌───────────────┬───────────────────────────────────────────────────┐
│ Net Worth      │                                                   │
│ Tracker        │                                                   │
│───────────────│                                                   │
│ ▸ Dashboard    │                                                   │
│ ▸ Holdings     │                                                   │
│ ▸ Asset Trends │              [tab content area]                  │
│  🔴 2 alerts    │                                                   │
│ ▸ Transactions │                                                   │
│ ▸ Trends       │                                                   │
│ ▸ Simulate     │                                                   │
│ ▸ Benchmark    │                                                   │
│───────────────│                                                   │
│ [INR | USD]    │                                                   │
│ [Demo|My Data] │                                                   │
│───────────────│                                                   │
│ 🔄 Refresh      │                                                   │
│ ⇅  Sync         │  "last synced 4m ago" / "3 unsynced changes"     │
│───────────────│                                                   │
│ ⚙ Settings      │                                                   │
│ 🌙 Theme        │                                                   │
└───────────────┴───────────────────────────────────────────────────┘
```

Left panel, not a top bar — holds tab navigation, currency toggle, Demo/My Data switch,
Refresh, Sync, Settings, and theme toggle, all in one place.

**Alerts.** A small badge under the Asset Trends nav item shows the count of active
issues — sync errors, unresolved symbol mappings, stale checkpoints. Clicking it jumps
straight to Asset Value Trends, where each affected entry shows its specific issue
inline (see that tab's section below). The Asset Value Trends tab header itself is
also highlighted whenever there's an active alert, so the signal is visible even before
opening the left panel badge.

**Refresh vs. Sync are distinct actions with distinct icons and distinct meaning:**
- **Refresh** pulls new market/FX data from external sources for connected assets.
- **Sync** pushes local changes (new transactions, edited asset values, confirmed merges)
  to the Drive folder, and pulls the latest Drive state if it changed elsewhere. The
  panel shows a small status line under Sync — "last synced Xm ago," or "N unsynced
  changes" if local edits haven't been pushed yet.

**Where else Refresh/Sync need to appear, beyond the left panel:**
- **Refresh, yes, contextually** — a per-holding Refresh in the Holdings tab and a
  per-asset Refresh in Asset Value Trends, for pulling just one thing without waiting on
  a full global pull. This was already in the plan and still holds.
- **Sync, contextually, as a status indicator rather than a duplicate button** — after
  any local edit (a confirmed transaction merge, an asset value correction), show a
  small "unsynced" badge near that specific change. This is written to the local
  write-ahead buffer immediately and pushed to Drive via the debounced auto-sync
  described in the PRD — the badge here just reflects "not yet pushed," not "at risk of
  being lost."

- **Demo | My Data** is a hard switch, not a filter — Demo always shows the bundled
  10-year sample dataset with zero login; My Data shows nothing until Google sign-in
  succeeds, then shows the signed-in account's own Drive data only, from the one
  pre-configured Drive folder the app is set up to use.
- **INR | USD** toggle is global and persists across tabs — every number on screen
  reflows using the per-asset base currency + FX rate model (see PRD).
- A short client-side cooldown on Refresh prevents rapid repeat clicks from burning
  free-tier API quota — button shows a disabled "refreshed Xs ago" state briefly after
  use.
- Stale data (15+ days since last price update) shows as a small warning badge next to
  the affected holding everywhere it appears — Dashboard banner, Holdings row, Asset
  Trends entry — never silently hidden.

---

## Dashboard

This is the tab Saurabh specifically wants to be genuinely modern and interactive, not
a default grid of cards. Layout:

```
┌───────────────────────────┬─────────────────────────────────────┐
│  NET WORTH (hero)         │  XIRR vs BENCHMARK (headline widget) │
│  ₹X,XX,XX,XXX  ▲ X.X%     │  You: XX.X%   Nifty 50: XX.X%        │
│  [sparkline, 90 days]     │  [mini bar comparison]                │
├───────────────────────────┴─────────────────────────────────────┤
│  LIQUIDITY STRIP  [Immediate▓▓▓░][Short▓▓░░][Medium▓░░░][Illiquid▓▓▓]│
│  hover any segment → amount + % + which holdings make it up      │
├───────────────────────────┬─────────────────────────────────────┤
│  ALLOCATION (interactive) │  REALIZED vs UNREALIZED P&L           │
│  donut or treemap, click  │  stacked bar by year, click a year    │
│  a slice → filters every  │  to filter Transactions tab to that   │
│  other widget on the page │  year's realized events               │
├───────────────────────────┴─────────────────────────────────────┤
│  NET WORTH TREND — hoverable line, brushable date range,         │
│  toggle: stacked-by-category / total-only / vs-benchmark-overlay │
├───────────────────────────────────────────────────────────────────┤
│  ⚠ Stale checkpoints (if any): [Fund X — 112 days] [Stock Y — 94d]│
└───────────────────────────────────────────────────────────────────┘
```

**Interaction model:** clicking the allocation donut/treemap slice cross-filters the
trend chart and the P&L widget to that category — this is the "interactive, not static"
behavior Saurabh asked for, rather than seven independent charts. Filters: date range
presets (1M/3M/1Y/3Y/5Y/All/Custom), asset class multi-select, currency (inherits global
toggle). All chart interactions are click/hover — no page navigation required to explore.

---

## Holdings

```
┌─────────────────────────────────────────────────────────────────┐
│  [Category chips: All | MF | Stocks | US Eq | Crypto | Gold...]  │
│  [🔍 search]                                    [Sort: XIRR ▾]   │
├─────────────────────────────────────────────────────────────────┤
│  Name        Category   Units   Value   Invested  Gain  XIRR  🔄 │
│  ...row, expandable — click to reveal a compact inline summary   │
│  (realized+unrealized split, liquidity tier, benchmark XIRR,     │
│  base currency) instead of navigating away                       │
└─────────────────────────────────────────────────────────────────┘
```

No separate price-history modal — that's fully moved to Asset Trends. Expanding a row
here is a quick glance, not a workspace; anything requiring editing history routes to
Asset Trends via a link inside the expanded row.

**Asset settings, per holding** (accessible from the expanded row): base currency
(assigned at setup, editable) and liquidity tier — **LLM-suggested by default** based
on the asset's category, always manually overridable via a simple dropdown.

---

## Asset Value Trends *(new tab)* ⚠ *(header highlights when there's an active alert)*

```
┌─────────────────────────────────────────────────────────────────┐
│  [Asset picker: search held + not-held assets + 💱 USD/INR]      │
│                                                     [🔄 Refresh]  │
├─────────────────────────────────────────────────────────────────┤
│  Selected asset status bar:                                      │
│  Last actual update: 12 Jun 2026   Symbol: NIFTYBEES.NS  [edit]  │
│  ⚠ Sync error: symbol not found — check the code above           │
├─────────────────────────────────────────────────────────────────┤
│  Value trend chart — step function, not interpolated             │
│  (flat segments = forward-filled, dots = actual entries)         │
├─────────────────────────────────────────────────────────────────┤
│  Editable table: Date | Value | Source (live/checkpoint/         │
│  transaction-implied) | [edit] [delete]                          │
│  [+ Add value manually]  [+ Backfill a past date]                │
├─────────────────────────────────────────────────────────────────┤
│  📋 Paste & Interpret (LLM) — paste day-wise price history text  │
│  or upload Excel/CSV/TXT → preview parsed + converted rows →     │
│  confirm → bulk-write. Works for current or retrospective dates. │
└─────────────────────────────────────────────────────────────────┘
```

The asset picker deliberately includes assets **not currently held**, and the **USD/INR
FX rate itself is one of the pickable entries** — it's tracked with the exact same
trend/edit/backfill/paste-interpret machinery as any other asset, rather than being a
separate hidden mechanism. This means FX sync errors and FX last-updated status show up
here too, using the same status bar.

**Status bar, per asset (and for FX):**
- **Last actual update** — the date of the last *real* entry, distinct from whatever
  date is currently on screen due to forward-fill. This is what staleness is computed
  from, never the extrapolated display value.
- **Symbol/code** — the mapped ticker/fund code for connected assets, LLM-suggested at
  creation, editable inline. This is where a "symbol not found" sync error gets fixed —
  correct the code, hit Refresh again.
- **Sync/refresh error**, if any, shown plainly with the specific problem, not a generic
  failure message.
- **Stale badge**, if the last actual update is 15+ days old — shown here in addition
  to Dashboard and Holdings.

**First-connection backfill.** When an asset is newly added or newly connected to a
price source, the app runs a one-time backfill from the asset's first transaction date
to the latest available date. Given ~10 years of history, this can take a moment — shown
as a progress indicator on the status bar, not a silent long wait.

**Forward-fill is visually explicit.** A manually-entered value holds for every later
date until a newer entry supersedes it — and the same applies to Refresh gap-fills
(e.g. weekends between two live-fetched dates). The chart renders this as a step
function (flat line between real data points), not a smoothed interpolation — so it's
always visually clear which parts of the trend are actual entries versus carried-forward
assumptions.

**Retrospective backfill uses the same confirm-before-merge flow as everything else** —
paste text or upload a file for a past date range, review the LLM's parsed-and-converted
preview, confirm, then it merges. Refresh here is scoped to the single selected asset
(vs. the global Refresh in the left panel).

---

## Transactions

```
┌─────────────────────────────────────────────────────────────────┐
│  [Filters: date range | holding | category | type]    [+ Manual] │
├─────────────────────────────────────────────────────────────────┤
│  📋 Paste & Interpret (LLM) — paste statement text/upload file   │
│  → LLM identifies + categorises transactions → editable preview  │
│  table before commit → confirm writes to the transaction log     │
├─────────────────────────────────────────────────────────────────┤
│  Table: Date | Holding | Type | Units | Amount | Ccy | Category  │
│  [edit] — "Ccy" shows the transaction's original currency (INR/  │
│  USD) as entered, never silently converted away                  │
└─────────────────────────────────────────────────────────────────┘
```

The preview-before-commit step is non-negotiable — the LLM parse is a draft, never a
silent write. Realized P&L events (sells) get a visual marker in this table since they
feed the Dashboard's realized P&L widget directly. Preserving original currency per
transaction is what makes the FX-impact-vs-asset-growth split (see Trends) possible.

---

## Trends

Beyond the original stacked-by-category view, additional chart ideas to include:

- **Benchmark overlay** — total net worth trend line with Nifty 50 / Nasdaq / Gold /
  FD lines plotted on the same axis (normalized to the same start value) for a visual
  "did I beat the market" read.
- **Rolling XIRR** — XIRR computed on a trailing window (e.g. trailing 1-year) plotted
  over time, rather than a single point-in-time number — shows whether returns are
  improving or decaying.
- **Contribution vs. growth vs. currency split** — a stacked area separating net worth
  change into three parts: money you put in, underlying asset growth (in the asset's own
  base currency), and currency movement impact (INR/USD). This directly answers "am I
  getting richer, or is the rupee just moving" — a real analytical ask, not a cosmetic
  chart, and it depends on the per-asset base currency + currency-preserving transaction
  model in the PRD. Formula needs validation before this chart ships (see Open Questions
  in the PRD).
- **Category treemap over time** — animated/scrubbable treemap showing how allocation
  shape has shifted year over year.
- **Realized P&L by year** — bar chart, one bar per financial year, drill into the
  underlying sell transactions.

---

## Simulate

This is the tab flagged for genuine innovation. Baseline (already scoped in the PRD):
Monte Carlo range output, auto-detected recurring contributions. Additional ideas for
this tab specifically:

- **Scenario comparison, side by side** — "current trajectory" vs. "+₹10k/month SIP" vs.
  "one-time lump sum" vs. "reallocate 10% equity→debt," each as its own Monte Carlo band
  on the same chart, so trade-offs are visually comparable rather than requiring the user
  to re-run the simulation three times and remember the numbers.
- **Stress test / historical replay** — apply a real historical drawdown (e.g. 2008,
  2020 COVID crash, 2022 correction) to the current portfolio composition and show what
  it would have done — distinct from forward-looking Monte Carlo, this is backward-
  looking risk intuition.
- **Lightweight goal-seek (ephemeral, not persistent)** — "how much extra per month to
  reach ₹X by year Y" as a one-off calculation inside a scenario. This is intentionally
  *not* the deferred persistent Goals feature (no saved targets, no tracked progress
  over time) — just a calculator embedded in an exploratory scenario, gone once you
  leave the tab unless the scenario itself is saved.
- **Save/name a scenario** — lets a comparison persist across sessions without building
  the full goal-tracking feature; a saved scenario is just a snapshot of simulate inputs.

---

## Benchmark

Resolves the earlier open question: **both** a headline widget on the Dashboard *and*
a dedicated tab for full detail — the Dashboard widget is a snapshot (you vs. one
primary benchmark), the tab is where multi-benchmark, multi-level comparison lives.

```
┌─────────────────────────────────────────────────────────────────┐
│  Compare against: [Nifty 50 ✓] [Nasdaq ✓] [Gold ] [FD ] [+ Add]  │
│  Level: [Overall ▾]  (Overall | By Category | By Asset)          │
├─────────────────────────────────────────────────────────────────┤
│  Table: metric rows (XIRR, P&L) × columns (You, Nifty 50, Nasdaq)│
│  Chart: normalized growth lines, same start value, same window   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Liquidity tier mapping (default, per category — user-overridable per holding)

| Tier | Definition | Default categories |
|---|---|---|
| Immediate | Accessible in ~3 days without penalty | Cash & Bank, liquid MFs, listed stocks/ETFs, crypto, gold ETF |
| Short | ~1–4 weeks, may involve minor exit load | Open-ended MFs with exit-load window, physical gold |
| Medium | ~1–6 months | Unlisted stock (limited liquidity events), certain debt instruments |
| Illiquid | Locked or 6+ months | EPF/NPS (retirement lock-in), ELSS (3-year lock), employer stock under vesting/lockup |

Every holding can be manually re-tiered if the default doesn't fit — this is a default
mapping, not a hard rule.

---

## Key user journeys

1. **First-time public visitor** → lands on Demo tab (no login) → explores full feature
   set on 10-year sample data → optionally clicks "My Data" → prompted to sign in with
   Google → own empty state if new, own real data if returning.
2. **Monthly review (Saurabh)** → opens My Data → clicks Refresh all → reviews Dashboard
   for stale flags and liquidity mix → drills into Benchmark tab → checks Trends for
   rolling XIRR direction.
3. **Logging a statement dump** → Transactions tab → paste broker statement text → LLM
   preview → review/edit parsed rows → confirm → Dashboard updates immediately.
4. **Tracking a fund before buying** → Asset Value Trends → search the fund (not held)
   → paste price history or manually add points → trend visible without needing to own
   the asset yet.
5. **Pre-rebalancing exploration** → Simulate → build 2–3 scenarios side by side → save
   the one under consideration → revisit next month to compare against what happened.

---

## States & edge cases

- **Empty state (new My Data user):** friendly zero-data screen per tab with a clear
  path to either Paste & Interpret a first statement or add a holding manually.
- **Loading state:** skeleton loaders on charts/tables during Drive fetch or Refresh —
  never a blank flash.
- **Error state:** Drive auth failure, API refresh failure, or LLM parse failure each
  get a specific, human-readable message and a retry action — never a silent failure.
- **Stale data:** badge everywhere the affected value appears, as described above.
- **Demo mode guardrail:** no write actions are ever attempted against Drive while in
  Demo mode, even if a visitor is also signed into a real Google account elsewhere in
  the browser — Demo and My Data data sources are never allowed to cross.

## Responsive notes

Primary usage is desktop (monthly deep-dive review), but the Dashboard specifically
should be usable on mobile for a quick net-worth check — single-column reflow, charts
remain interactive (tap instead of hover for tooltips). Other tabs (Transactions,
Holdings, Asset Trends) can be desktop-optimized without a dedicated mobile layout
pass in v1.
