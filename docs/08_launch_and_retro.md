# 08 — Launch & Retrospective

## Pre-launch QA checklist

Not yet run — this is the checklist to work through at the end of M8, before calling
v1 "launched." Grouped by what each item is actually verifying.

**Privacy & isolation**
- [ ] A visitor connecting a *different* Google account to the public site sees only
      their own empty folder — never the owner's data (the core promise of the whole
      architecture — this one is non-negotiable).
- [ ] Demo mode never attempts a write against Drive, even if the browser also has a
      real Google session active elsewhere.
- [ ] No API key or credential is doing anything beyond what's documented as an
      accepted trade-off in the Tech Stack doc.

**Correctness**
- [ ] XIRR matches an independent Excel calculation on the same cash flows to within
      0.1%, across several real holdings — not just the sample dataset.
- [ ] FX-impact decomposition (growth/currency/interaction) checked against hand-worked
      examples, not just "the chart renders."
- [ ] Realized P&L (FIFO) spot-checked against a manually reconstructed sell.
- [ ] Refresh gap-filling correctly forward-fills weekend/holiday gaps without
      overwriting real data.
- [ ] Stale-checkpoint alerts fire at exactly 15+ days since the *last actual entry*,
      not the forward-filled display date.

**Resilience**
- [ ] Closing the tab mid-edit doesn't lose data — the IndexedDB write-ahead buffer
      actually holds it until the next sync.
- [ ] A simulated Drive write failure surfaces as a visible error/alert, not a silent
      failure.
- [ ] A simulated Twelve Data/Gemini rate-limit hit surfaces clearly, with the app
      remaining usable for everything not blocked by that specific failure.

**Experience**
- [ ] A first-time visitor can explore the full Demo tab with zero clicks beyond
      landing on the page.
- [ ] Every LLM parse — transaction or asset value, current or retrospective — shows a
      preview and requires explicit confirmation before merging.
- [ ] Dashboard cross-filtering (click a slice, other widgets filter) works as designed,
      not just as a static chart.

## Post-launch retrospective

Not yet written — fills in after a few real weeks of monthly-review usage, same
structure as the other two projects' retros: what worked, what didn't, what the next
version should fix.
