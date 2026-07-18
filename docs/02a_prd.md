# 02a — Product Requirements Document

## Product overview

A transaction-grounded, multi-asset net worth tracker that computes true time-weighted
returns (XIRR) per holding and in aggregate, benchmarks those returns against market
indices, and gives a liquidity-aware view of net worth — with all personal data stored
in the user's own Google Drive, never on a third-party server.

## Primary user

An individual investor holding positions across 5+ asset classes (Indian mutual funds,
direct equity, US equity, crypto, gold, retirement accounts, debt) who reviews and
rebalances monthly, wants transaction-level return accuracy rather than eyeballed
absolute gain, and will not put portfolio data into a third-party fintech app.

## Goals — what v1 accomplishes

- Track every asset class from the original Ledger spec (IN Mutual Funds, IN Stocks, US
  Equity, Crypto, IN ETF & Gold, Retirement, Unlisted, Cash & Bank, Debt) via a
  transaction log — buys, sells, SIPs, deposits, withdrawals, dividends, payments.
- Compute accurate XIRR per holding and in aggregate using real cash-flow timing.
- Provide a public site with two modes: a **Demo tab** (bundled 10-year sample dataset,
  no login, explorable by anyone) and a **My Data tab** (real data, visible only after
  the owner signs in with their own Google account — Drive OAuth scoped to app-created
  files only, which means a stranger visiting the public URL and connecting their own
  Google account gets their own empty folder and can never see the owner's data).
- **Benchmark comparison:** show XIRR and profit/loss (per asset class, per category, and
  aggregate) against a configurable set of benchmarks — Nifty 50, Nasdaq, Gold, a Fixed
  Deposit reference rate, and room to add others — over matching windows, so returns have
  real market context rather than a single fixed comparison.
- **One-click refresh, not a background job.** For asset classes with a public price
  source (listed MFs, listed stocks, crypto, gold, index benchmarks), the connections to
  those price sources are built into the app — a Refresh action (per-holding or global)
  pulls the current value live, client-side, at the moment it's clicked. This is a
  user-triggered pull, not an automatic scheduled push, which keeps the architecture pure
  static-hosting + client-side (no server, no shared cache, no per-user background job
  problem). Assets with no public feed (unlisted stock, some debt instruments) remain on
  manual checkpointing, same as before. Daily granularity is still the goal — we're not
  chasing live/intraday — Refresh just means "pull today's latest on demand" rather than
  "always current automatically."
- **Refresh gap-filling — resolved.** Refresh only ever writes dates the price source
  actually returned data for. If the source returns, say, the 26th and then the 29th
  (skipping the weekend), the gap dates (27th, 28th) are forward-filled from the 26th's
  value — using the exact same forward-fill mechanism as manual entries, not a separate
  holiday-calendar system. One rule handles both cases.
- **First-connection backfill.** When an asset is newly added or newly connected to a
  price source, the app backfills its full daily value history from the date of its
  first transaction through to the latest available date — not just starting from
  "today." This is a one-time, potentially longer-running action (see UX doc for the
  progress-indicator treatment).
- **Symbol/code mapping for connected assets.** Each automated asset needs a mapped
  ticker/fund code for its price source. This is LLM-suggested at asset creation and
  always manually correctable. If Refresh fails for a specific asset (symbol not found,
  API mismatch), that's a sync error surfaced on the asset (see below), not a silent
  failure.
- **One-click FX refresh.** Same model — USD/INR rate refreshed on demand via a Refresh
  action, not a background job. Net worth, holdings, and all comparisons are viewable in
  INR or USD via a single toggle, using the most recently refreshed rate.
- **Per-asset base currency + currency-preserving transactions.** Every asset has a
  designated base/main currency (the currency its price-per-unit is naturally quoted
  in). Value = units × price-per-unit-in-base-currency × FX-rate-to-display-currency
  (when base ≠ display currency). Every transaction preserves the currency it actually
  occurred in (INR or USD) rather than converting at entry — this is what makes it
  possible to later separate "did this asset go up" from "did the rupee move," instead
  of collapsing both into one blended number. This is a genuinely non-trivial piece of
  the valuation model, not a display-layer toggle — full computation logic goes in the
  Tech Stack doc.
- **Sync, distinct from Refresh.** Two separate actions: **Refresh** pulls new market/FX
  data from external sources; **Sync** writes local changes (new transactions, edited
  asset values, confirmed merges) to the connected Drive folder and pulls the latest
  Drive state if it changed elsewhere. Conflated today in casual conversation, but they
  need to be two distinct buttons and two distinct code paths.
- **Sync architecture — recommendation.** Every confirmed change writes immediately to
  local browser storage first (a write-ahead buffer) — this is the answer to "where do
  unsynced changes live in the interim": not lost, not only in memory, safely on-device
  even if the tab closes. From there, a debounced background sync pushes to Drive a few
  seconds after the last change (batching rapid edits into one Drive write rather than
  one write per keystroke), plus the explicit Sync button for an immediate push or a
  manual retry if background sync failed (offline, auth expired). This gets the safety
  of local persistence, the convenience of not having to remember to click Sync, and a
  manual override — full detail (storage mechanism, debounce interval, conflict
  handling) belongs in the Tech Stack doc.
- **Sync/refresh error and last-updated visibility.** For the FX rate and every asset,
  the app surfaces: any sync or refresh error (e.g. "symbol not found"), and the last
  date actually updated. For manually-updated assets specifically, "last updated" must
  reflect the **last real entry**, not a forward-filled date — staleness is always
  computed from the last actual entry, never from the extrapolated value on screen.
  This all surfaces in the Asset Value Trends tab (FX rate included, since it's tracked
  there as a pinned entry) — see UX doc.
- **Alerts system.** Any active issue (sync error, unresolved symbol mapping, a
  stale-checkpoint) counts as an alert. Active alerts show as a badge in the left panel
  and as a highlighted indicator on the Asset Value Trends tab header, so an issue is
  never silently sitting unnoticed.
- **Retrospective backfill.** FX rates and asset values can be corrected or backfilled
  for past dates, via LLM-parsed free text or an Excel/CSV/TXT upload — same
  confirm-before-merge flow as transaction parsing (see Design Principles).
- **Realized vs. unrealized P&L.** Alongside XIRR, track actual booked profit/loss from
  sold positions, broken out by year, asset, and category — not just current unrealized
  gain on what's still held.
- **10-year data volume as a first-class constraint.** With ~10 years of transaction
  history being imported at launch, XIRR/P&L computation at asset, category, and overall
  level must stay fast — this rules out naive full-recompute-on-every-render approaches.
  See Open Questions and the Tech Stack doc.
- **Bulk Excel export.** Downloadable workbooks for: transactions, holdings, FX rate
  history, net worth trends (by asset/category/overall), asset value trends, and a
  master workbook combining all of the above.
- **Liquidity view:** classify holdings into liquidity tiers (Immediate / Short / Medium
  / Illiquid — see UX Flow doc for the default per-category mapping) and show net worth
  split by tier, not just as one flattened number.
- **Enhanced Simulate tab:** projections run as a Monte Carlo range (not a single linear
  line) and automatically continue existing recurring SIPs/contributions detected from
  transaction history, rather than requiring the savings amount to be re-entered by hand.
- **Stale-checkpoint alerts:** flag any manually-priced holding whose **last actual
  entry** (not its forward-filled display value) is 15+ days old, surfaced on the
  Dashboard, Holdings tab, and Asset Value Trends tab.
- Retain the core UX of the original spec: Paste & Interpret bulk entry, price hierarchy
  (live feed → manual checkpoint → transaction-implied), FY bar chart, trend line with
  range/granularity/asset-class filters, currency toggle, dark mode.
- **LLM-based Paste & Interpret**, using the Gemini free tier (consistent with the rest
  of the portfolio), for two jobs: (1) correctly identifying, categorising, and cleanly
  entering transactions from pasted broker/bank statement text, and (2) bulk-entering
  day-wise asset values from pasted price history. **This reverses the earlier
  heuristic-only decision** — documenting the trade-off plainly: pasted text will be
  sent to Google's Gemini API. The mitigating factor is that Google is already the
  trust boundary for this product (Drive stores the data), so this doesn't introduce a
  new third party, but it is a real change from "no external service ever sees raw
  financial data" to "Google's services do." Worth a conscious sign-off, not a silent
  scope change.

## Non-goals (v1) — and why

- **Goal-based tracking (FIRE number, target corpus, custom goals).** Genuinely valuable,
  but it's a distinct feature surface (target-setting UI, progress tracking) that
  deserves its own design pass rather than being squeezed into v1. Candidate for v1.1.
- **Tax awareness (LTCG/STCG estimation, holding-period tracking).** High value but needs
  per-asset-class tax rule logic that's easy to get subtly wrong — building it rushed
  risks giving bad tax guidance, which is worse than not having the feature. Deferred
  until it can get a dedicated review pass.
- **Allocation drift / rebalancing alerts.** Needs a target-allocation model first, which
  doesn't exist yet — sequencing issue more than a scope cut. Revisit after v1 ships.
- **Debt amortization schedule (principal/interest split, payoff timeline).** Debt is
  tracked as a balance in v1, which is sufficient for the net worth number; the
  amortization view is a nice-to-have layered on top later.
- **Expense/budget tracking.** This is a net worth and investment-return tool, not a
  budgeting app — deliberately out of scope, not just deferred.
- **Custom password/auth system.** Google Drive OAuth (scoped to app-created files) is
  the protection mechanism for My Data — building a parallel password system would be
  redundant and a worse security model than what Google already provides for free.

## Feature specification (by tab)

**Dashboard** — Net worth headline (total, invested, gain, XIRR, benchmark XIRR),
realized + unrealized P&L, liquidity tier strip, stale-checkpoint banner, INR/USD toggle.
*Full chart/filter/interactivity spec is intentionally not finalized here — Saurabh has
asked for this to be genuinely modern and interactive, not a default dashboard layout, so
it gets a dedicated deep-dive in the UX Flow doc rather than being guessed at in the PRD.*

**Holdings** — One row per holding: name, category, units, current value, invested,
realized + unrealized gain, XIRR, benchmark XIRR, liquidity tier, staleness indicator.
**For balance-snapshot assets** (Cash, Accounts, Debt, Loans, Security Deposits): units,
XIRR, and benchmark XIRR columns show as not applicable — these rows contribute to Net
Worth and Liquidity view only, not to Returns metrics. **Liquidity tiers apply to
assets, not liabilities** — Debt/Loan balances net into total Net Worth but sit outside
the liquidity-tier strip entirely. Category filter chips. CSV import/export. **No
click-through to a price modal** — value history management moves to its own tab (see
Asset Value Trends, below). Each holding has a **base currency** (assigned at setup,
editable) and a **liquidity tier** — LLM-suggested by default from the asset's
category, always manually overridable.

**Asset Value Trends** *(new tab)* — Dedicated space to view any asset's value trend
over time, whether currently held or not (e.g. watch a fund before buying, or keep
history for something already exited). **The USD/INR FX rate itself is tracked here too**
as a pinned entry, using the same trend/edit/backfill machinery as any other asset,
rather than being a separate hidden concept. View/correct/add entries. Manually trigger
a refresh for source-connected assets. **Forward-fill valuation:** a manually-entered
value holds for every subsequent date until a newer entry supersedes it — visualized as
a step function on the trend chart, not interpolated, so it's visually obvious which
segments are real data points vs. carried-forward assumptions. **LLM-based Paste &
Interpret** for bulk day-wise value entry from pasted price history/statements, plus
**file upload (Excel/CSV/TXT)** for the same purpose — both retrospective and current.
This is also home to the **status bar** per asset/FX (last actual update date, mapped
symbol/code, sync errors) and the **alerts** surfacing described in Goals — full layout
in the UX Flow doc.

**Transactions** — Paste & Interpret, now **LLM-based** (see Goals) rather than
heuristic-only — structured + freeform text + file upload, with the LLM identifying,
categorising, and cleanly entering transactions. **Original transaction currency (INR
or USD) is stored and displayed**, not converted away at entry — this is what preserves
the ability to separate asset performance from currency movement later. Manual entry
form. Filters (date range, holding, category, type). Edit/delete per row. CSV
import/export. Writes go through the local write-ahead buffer + debounced auto-sync
described in Goals, plus the manual Sync button.

**Trends** — Stacked view of net worth by asset class over time, plus benchmark overlay.
*Developed further in the UX Flow doc: rolling XIRR, contribution/growth/currency split,
category treemap over time, realized P&L by year.*

**Simulate** — Flagged as the highest-value area to be genuinely innovative in, per
Saurabh's request. Baseline: savings auto-suggested from detected recurring SIP/
contribution patterns (editable), per-class allocation % and growth % sliders, output as
a Monte Carlo range (10th/50th/90th percentile bands) rather than one deterministic line.
*Developed further in the UX Flow doc: side-by-side scenario comparison, historical
stress-test replay, ephemeral goal-seek calculation (distinct from the deferred
persistent Goals feature), and named/saved scenarios.*

**Benchmark** — Resolved (see UX Flow doc): lives as **both** a snapshot widget on the
Dashboard (you vs. one primary benchmark) and a dedicated tab for full detail — XIRR and
P&L at overall/category/asset level against a configurable set of benchmarks (Nifty 50,
Nasdaq, Gold, FD reference rate, extensible), matching the Goals section above.

## Success metrics

- A real transaction (paste from a broker statement) can be logged and reflected in
  the Dashboard in under 30 seconds.
- XIRR calculated by the app matches an independent Excel XIRR calculation on the same
  cash flows to within 0.1%.
- Zero data loss across Drive sync cycles during a full month of real daily/weekly use.
- Stale-checkpoint banner correctly fires for any holding untouched 15+ days, verified
  against the sample dataset.
- A visitor connecting a different Google account to the public site never sees the
  owner's transaction data — verified as part of the launch checklist.

## Design principles

- **Transaction-based, always — for investable assets.** No feature may allow editing
  a balance directly instead of recording a transaction, for anything on the Auto or
  Manual price-feed tracking methods. Balance-snapshot assets (see Unit-aware, below)
  are the deliberate, documented exception — there's no "transaction" concept for a
  savings account balance, only a periodic total-value entry.
- **Unit-aware, with three tracking methods per asset.** (1) **Auto price-feed** —
  `units × auto-fetched price` for anything with a public price source. (2) **Manual
  price-feed** — `units × manually-entered price`, same Asset Value Trends mechanism,
  no live source. (3) **Balance-snapshot** — for Cash, Bank Accounts, Credit Card debt,
  Loans, and Security Deposits: no buy/sell transactions at all, just a total value
  entered per date. This reuses the exact same Asset Value Trends mechanism as price
  tracking (units implicitly = 1, the entered "price" *is* the balance) — not a special
  case, a degenerate case of the same model. **XIRR and benchmark comparison apply only
  to the first two tracking methods** — a savings account balance doesn't have a
  meaningful "return." Balance-snapshot assets still count fully toward Net Worth and
  the Liquidity view.
- **Privacy-first, precisely stated.** No custom backend server ever touches transaction
  data. The only external calls are to Google's own services — Drive for storage and
  access control, Gemini for LLM-assisted parsing — both under the same account-level
  trust boundary the user already accepts by choosing Drive as the data store. No other
  third party ever sees financial data.
- **Zero-friction demo.** Anyone landing on the public URL can explore the full feature
  set via the Demo tab without connecting an account or entering data.
- **Honest about staleness.** The app should never present a number with silently
  outdated inputs — stale data gets flagged, not hidden.
- **Nothing parsed writes silently.** Every LLM-parsed or file-uploaded input —
  transactions, asset values, FX rates, regardless of source — always shows a preview
  of the interpreted/converted data for explicit user confirmation before it's merged
  into the dataset. No exceptions.
- **My Data works only for the owner.** The app connects to one specific, pre-configured
  folder in the owner's own Google Drive. Files in that folder are either pre-seeded
  blank on first setup or created automatically on first successful connection; every
  subsequent Sync updates those same files. Exact file/schema layout is a Tech Stack
  decision, not a PRD-level one.
- **Genuinely modern, interactive design.** Not a utilitarian data table with default
  component styling. Charts should be hoverable/drillable/filterable, the dashboard
  should feel intentionally designed — this gets specific attention in the UX Flow doc
  and again during build (frontend design pass).

## Open questions

- Monte Carlo simulation method and parameter assumptions (return volatility per asset
  class) — needs a decision in the tech stack or UX doc.
- Whether to register a custom domain for GitHub Pages or use the default
  `saurabh-das7.github.io` URL.
- How recurring-contribution detection works precisely (pattern matching on amount +
  frequency + holding) — needs a spec before the Simulate tab can be built.
- Which specific assets are realistically "automatable" (public price source exists) vs.
  permanently manual-checkpoint (unlisted stock, some debt) — needs a definitive list.
- FD reference rate source — a fixed assumed rate, or tracked against an actual bank's
  published rate?
- Realized P&L computation method — FIFO, average cost, or specific-lot? Needs a decision
  before the Transactions/Holdings math can be finalized.
- How Drive JSON file size and read/write performance hold up at ~10 years of transaction
  volume — needs validation early in the build, not assumed.
- **Symbol/code mapping confidence.** When the LLM suggests a ticker/fund code at asset
  creation and it's ambiguous or wrong, how much upfront verification should be expected
  vs. just letting it surface later as a sync error to fix? Leaning toward the latter
  (don't block asset creation on a confidence check), but worth a real decision in the
  Tech Stack doc.
- **FX-impact decomposition formula.** Splitting net worth change into contribution vs.
  asset-price growth vs. currency movement is analytically real but needs a precise,
  validated formula — easy to get subtly wrong (e.g. compounding order matters). Needs
  worked examples before the Trends chart can be trusted.
- Exact Drive file/folder schema — one file vs. several (transactions, asset trends, FX
  rates, settings) — and what "pre-seeded blank" vs. "created on first connection" looks
  like in practice.

## Resolved during discussion (kept for reference, not open)

- **Refresh date-range logic.** Gap dates between two live-fetched dates (e.g. a
  weekend) are forward-filled from the prior value — the same mechanism as manual
  entries, not a separate holiday-calendar system. See Goals.
- **Auto-sync vs. manual Sync.** Local write-ahead buffer + debounced background sync +
  manual override button. See Goals. Revisit if it doesn't feel right in practice.

## Future vision — v2 (explicitly out of scope for v1)

Captured here for direction, not commitment. Once v1 is live and in regular use, a
deeper analysis/monitoring layer is the natural next step:

- **Movement alerts** — flag when a holding or the overall portfolio moves significantly
  in a day/week.
- **News correlation** — attempt to connect a flagged movement to relevant market news.
- **Relative-strength alerts** — flag when a specific stock/fund moves against its
  broader market or sector, not just in absolute terms.
- **Reallocation and investment-opportunity surfacing** — analysis-driven suggestions,
  building on the allocation-drift and goal-tracking features deferred from v1.

This entire area needs its own problem statement and PRD once scoped — not an extension
of the v1 docs.
