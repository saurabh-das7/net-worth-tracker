# Net Worth Tracker

**🔗 Live: [saurabh-das7.github.io/net-worth-tracker](https://saurabh-das7.github.io/net-worth-tracker/)**

A privacy-first, multi-asset net worth tracker — transaction-grounded XIRR and P&L
across mutual funds, stocks, crypto, gold, cash, and debt, with your real data stored
only in your own Google Drive, never on a server I run.

This repo documents both the **thinking** (PM docs — problem framing, PRD, tech stack
decisions, risk register) and the **doing** (a working app you can actually use).

---

## What It Does

> **Most net worth trackers ask you to trust a third party with your bank logins. This one doesn't.**

Everything — transactions, holdings, price history, settings — lives in a Google Drive
folder only you can access, using `drive.file` scope (the app can only see files it
created, not your whole Drive). There's no backend server anywhere in this
architecture; it's a static site plus your own Drive.

**Demo | My Data** — a hard switch, not a filter. Anyone visiting the live URL can
explore a bundled sample dataset with zero login. Connecting your own Google account
shows only your own data, isolated by Google's own OAuth — a stranger connecting a
different account gets their own empty folder, never yours.

**Multi-source price tracking** — mutual funds via AMFI, Indian stocks/ETFs via Google
Finance, US stocks/FX via Twelve Data, crypto via CoinGecko — all reconciled through
one forward-fill mechanism so weekend and holiday gaps never show as missing data.

**Manage Assets** — one table to see and fix everything about every holding: tracking
method (auto/manual), data source, symbol, liquidity tier, and an honest
connected/stale/error status — plus add or remove holdings as your portfolio changes.

**Real math, not approximations** — Newton-Raphson XIRR, FIFO-matched realized and
unrealized P&L, and currency-converted totals using the tracked USD/INR rate — every
formula verified against hand-computed test cases before shipping, not just assumed
correct because the build passed.

**Status:** 🔨 Actively building — core loop (transactions → holdings → prices → XIRR)
is real and working against live data; benchmarks, LLM-assisted entry, Simulate, and
the full 10-year historical import are still ahead. Follow along via the
[build log](./docs/07_build_log.md).

---

## Why This Exists

Every spreadsheet I'd built for this eventually broke the same way: balances typed by
hand instead of derived from transactions, no real XIRR (just eyeballed absolute gain),
and no way to tell if a number was current or three months stale. A single-file HTML
version of this same idea worked at first and then became unmaintainable as more asset
classes, price feeds, and tabs got added.

This is the rebuild — transaction-grounded from day one, unit-aware across very
different asset types (a stock and a savings account shouldn't be forced into the same
data model), and honest about staleness instead of silently showing outdated numbers.

Full problem framing: [docs/01_problem_statement.md](./docs/01_problem_statement.md)

---

## How to Run This Locally

**Requirements:** Node 20+, and your own Google OAuth Client ID / Gemini API key /
Twelve Data API key if you want to test against real data (the app runs in a mock mode
without any of these — see below).

```bash
git clone https://github.com/saurabh-das7/net-worth-tracker.git
cd net-worth-tracker
npm install
npm run dev
```

Deployed automatically to GitHub Pages via GitHub Actions on every push to `main` — see
[.github/workflows/deploy.yml](./.github/workflows/deploy.yml).

### Setup required before this runs against real data

Copy `.env.example` to `.env.local` and fill in your own keys for local development —
see [docs/04_tech_stack_decisions.md](./docs/04_tech_stack_decisions.md) for what each
one is for and how to get it. For the deployed site, the same values go in
**Settings → Secrets and variables → Actions** as repository secrets instead, since
Vite bakes them in at build time and the build runs in GitHub Actions, not locally.

Without any of these set, the app runs in **mock mode** — Drive, Google Finance, and
Twelve Data are all simulated, so the full app is explorable and testable before any
real credentials exist.

---

## Repo Structure

```
net-worth-tracker/
├── README.md
├── .github/workflows/deploy.yml      # build + deploy to GitHub Pages
├── .env.example
├── docs/                             # PM documentation — all stages
│   ├── 01_problem_statement.md   ✅
│   ├── 02a_prd.md                ✅
│   ├── 02b_asset_master.md       ✅
│   ├── 03_ux_flow_wireframe.md   ✅
│   ├── 04_tech_stack_decisions.md ✅
│   ├── 05_risk_and_cost.md       ✅
│   ├── 06_roadmap.md             ✅
│   ├── 07_build_log.md           🔨 updated as the build progresses
│   └── 08_launch_and_retro.md    ⏳ checklist ready, not yet run
└── src/
    ├── App.jsx, main.jsx, index.css
    ├── components/                   # Dashboard, Holdings, Transactions,
    │                                 # Asset Trends (+ Manage Assets), Trends,
    │                                 # Simulate, Benchmark, LeftPanel
    ├── context/AppContext.jsx        # global state: data source, currency, sync, alerts
    ├── lib/                          # Drive sync, price adapters, XIRR, FIFO P&L,
    │                                 # currency conversion, refresh algorithm
    └── data/assetMaster.js           # seed data derived from docs/02b
```

---

## The PM Documentation

| Doc | What it covers | Status |
|-----|---------------|--------|
| [01 — Problem Statement](./docs/01_problem_statement.md) | Why this exists, the cost of the problem today | ✅ Done |
| [02a — PRD](./docs/02a_prd.md) | Full feature spec, design principles, tracking-method model | ✅ Done |
| [02b — Asset Master](./docs/02b_asset_master.md) | Every real holding, categorised, with sync method and source | ✅ Done |
| [03 — UX Flow & Wireframe](./docs/03_ux_flow_wireframe.md) | Tab-by-tab layout, user journeys, states | ✅ Done |
| [04 — Tech Stack Decisions](./docs/04_tech_stack_decisions.md) | Architecture, data storage, sync model, API sources | ✅ Done |
| [05 — Risk & Cost Plan](./docs/05_risk_and_cost.md) | Risk register, ₹0/month cost confirmation | ✅ Done |
| [06 — Roadmap](./docs/06_roadmap.md) | Milestone sequencing, M0–M10 | ✅ Done |
| [07 — Build Log](./docs/07_build_log.md) | Running journal — what's actually built, real bugs found and fixed | 🔨 Updated as work happens |
| [08 — Launch Checklist](./docs/08_launch_and_retro.md) | Pre-launch QA, retrospective (once live) | ⏳ Checklist ready |

---

## Who This Is For

**If you track a multi-asset, multi-currency portfolio across India and abroad** — this
handles mutual funds, Indian and US equities, crypto, gold, and cash/debt in one place,
with real XIRR instead of eyeballed returns.

**If you're a PM or TPM building AI-assisted products** — the docs folder is a worked
example of scoping a genuinely complex product (currency math, OAuth, multiple external
data sources) the way a PM would, including the real architecture pivots that showed up
once it met real data (a blocked API, a missing OAuth scope, a silent field-name bug)
and how each was actually resolved, not just planned around in advance.

**If you're evaluating a privacy-first architecture for personal data tools** — the
Drive-as-database, no-backend, OAuth-as-access-control pattern here is directly
transferable to any tool handling data more sensitive than a typical portfolio demo.

---

## About This Project

Built by [Saurabh Das](https://linkedin.com/in/saurabhdas7) — Senior TPM and Designated
PM at Microsoft AI, documenting an AI learning journey in public.

Related tools: [LLM Eval Toolkit](https://github.com/saurabh-das7/llm-eval-toolkit) ·
[llm-issue-categorizer](https://github.com/saurabh-das7/llm-issue-categorizer) ·
[PM & TPM Playbooks](https://github.com/saurabh-das7/pm-tpm-playbooks)
