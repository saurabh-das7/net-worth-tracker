# Net Worth Tracker

Full PM documentation lives in [`docs/`](./docs) — start with `01_problem_statement.md`
if you're new to this project. Roadmap and current milestone status: `docs/06_roadmap.md`
and `docs/07_build_log.md`.

**Status: M0 — build/deploy pipeline scaffolded, no real features yet.**

## Local development

```bash
npm install
npm run dev
```

## Setup required before this runs against real data

Copy `.env.example` to `.env.local` and fill in your own Google OAuth Client ID,
Gemini API key, and Twelve Data API key — see `docs/04_tech_stack_decisions.md` for
what each is for and the setup checklist for how to get them.
