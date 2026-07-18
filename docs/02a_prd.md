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
- **One-click FX refresh.** Same model — USD/INR rate refreshed on demand via a Refresh
  action, not a background job. Net worth, holdings, and all comparisons are viewable in
  INR or USD via a single toggle, using the most recently refreshed rate.
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
- **Liquidity view:** classify holdings into liquidity tiers (immediate / days / months /
  illiquid) and show net worth split by tier, not just as one flattened number.
- **Enhanced Simulate tab:** projections run as a Monte Carlo range (not a single linear
  line) and automatically continue existing recurring SIPs/contributions detected from
  transaction history, rather than requiring the savings amount to be re-entered by hand.
- **Stale-checkpoint alerts:** flag any manually-priced holding whose last checkpoint is
  90+ days old, surfaced on the Dashboard and Holdings tab.
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
Category filter chips. CSV import/export. **No click-through to a price modal** — value
history management moves to its own tab (see Asset Value Trends, below).

**Asset Value Trends** *(new tab)* — Dedicated space to view any asset's value trend
over time, whether currently held or not (e.g. watch a fund before buying, or keep
history for something already exited). View/correct/add entries. Manually trigger a
refresh for source-connected assets. **LLM-based Paste & Interpret** here specifically
for bulk day-wise value entry from pasted price history/statements.

**Transactions** — Paste & Interpret, now **LLM-based** (see Goals) rather than
heuristic-only — structured + freeform text + file upload, with the LLM identifying,
categorising, and cleanly entering transactions. Manual entry form. Filters (date range,
holding, category, type). Edit/delete per row. CSV import/export. Manual + auto Drive
sync.

**Trends** — Stacked view of net worth by asset class over time, plus benchmark overlay.
*Additional chart types/features to be brainstormed in the UX Flow doc — open item.*

**Simulate** — Flagged as the highest-value area to be genuinely innovative in, per
Saurabh's request. Baseline: savings auto-suggested from detected recurring SIP/
contribution patterns (editable), per-class allocation % and growth % sliders, output as
a Monte Carlo range (10th/50th/90th percentile bands) rather than one deterministic line.
*Specific innovative features beyond this baseline are an open design question for the
UX Flow doc — not settled here.*

**Benchmark** *(new tab or Dashboard module — to decide in UX flow doc)* — XIRR per
asset class and aggregate plotted against Nifty 50 / S&P 500 over matching windows.

## Success metrics

- A real transaction (paste from a broker statement) can be logged and reflected in
  the Dashboard in under 30 seconds.
- XIRR calculated by the app matches an independent Excel XIRR calculation on the same
  cash flows to within 0.1%.
- Zero data loss across Drive sync cycles during a full month of real daily/weekly use.
- Stale-checkpoint banner correctly fires for any holding untouched 90+ days, verified
  against the sample dataset.
- A visitor connecting a different Google account to the public site never sees the
  owner's transaction data — verified as part of the launch checklist.

## Design principles

- **Transaction-based, always.** No feature may allow editing a balance directly instead
  of recording a transaction.
- **Unit-aware.** Investable assets are `units × price`; plain-value assets are not
  force-fit into a unit model.
- **Privacy-first, precisely stated.** No custom backend server ever touches transaction
  data. The only external calls are to Google's own services — Drive for storage and
  access control, Gemini for LLM-assisted parsing — both under the same account-level
  trust boundary the user already accepts by choosing Drive as the data store. No other
  third party ever sees financial data.
- **Zero-friction demo.** Anyone landing on the public URL can explore the full feature
  set via the Demo tab without connecting an account or entering data.
- **Honest about staleness.** The app should never present a number with silently
  outdated inputs — stale data gets flagged, not hidden.
- **Genuinely modern, interactive design.** Not a utilitarian data table with default
  component styling. Charts should be hoverable/drillable/filterable, the dashboard
  should feel intentionally designed — this gets specific attention in the UX Flow doc
  and again during build (frontend design pass).

## Open questions

- Exact liquidity-tier mapping per category (e.g. is a gold bond "months" or "illiquid"?)
  — needs a definitive table before build starts.
- Monte Carlo simulation method and parameter assumptions (return volatility per asset
  class) — needs a decision in the tech stack or UX doc.
- Whether Benchmark comparison is its own tab or a Dashboard module — decide in UX flow.
- Whether to register a custom domain for GitHub Pages or use the default
  `saurabh-das7.github.io` URL.
- How recurring-contribution detection works precisely (pattern matching on amount +
  frequency + holding) — needs a spec before the Simulate tab can be built.
- **Refresh architecture is resolved as user-triggered, not scheduled** — connections to
  price/FX sources are built in, click-to-pull, all client-side. This keeps the static
  hosting + per-user Drive model intact with no server-side piece needed. Remaining
  open item: free-tier API rate limits if Refresh is clicked repeatedly in a short
  window — needs a simple client-side cooldown/cache to avoid burning through the daily
  quota on the price APIs.
- Which specific assets are realistically "automatable" (public price source exists) vs.
  permanently manual-checkpoint (unlisted stock, some debt) — needs a definitive list.
- FD reference rate source — a fixed assumed rate, or tracked against an actual bank's
  published rate?
- Realized P&L computation method — FIFO, average cost, or specific-lot? Needs a decision
  before the Transactions/Holdings math can be finalized.
- How Drive JSON file size and read/write performance hold up at ~10 years of transaction
  volume — needs validation early in the build, not assumed.

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
