# 05 — Risk & Cost Plan

## The single biggest risk

**Scope.** This is, by a wide margin, the most feature-dense of the three portfolio
projects — 7 tabs, LLM-assisted parsing in two places, Drive sync with a local buffer,
per-asset currency decomposition math, Monte Carlo simulation, multi-benchmark
comparison, and an alerts system, all before v2's analysis layer is even considered.
The PRD deliberately deferred four features (goals, tax, allocation drift, debt
amortization) to keep v1 bounded, but what remains is still large. The mitigation is
entirely in the Roadmap doc (next): build order has to protect the core loop
(transactions → holdings → dashboard → XIRR) first, with everything else — benchmarks,
Simulate innovation, FX decomposition — sequenced after that core is real and usable.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| API keys (Twelve Data, Gemini) visible in the public bundle get abused | Low-Medium | Low | No billing attached to either project — worst case is hitting a free-tier cap, not a charge. Regenerate the key if abused. Documented trade-off, not an oversight (Tech Stack doc). |
| Local IndexedDB buffer cleared before Drive sync completes (e.g. "clear browsing data") | Low | Medium | Debounce window is a few seconds, not minutes. Add a browser "unsaved changes" warning if the tab is closed with pending unsynced edits. |
| Drive write partially fails, corrupting a JSON file | Low | High | Validate JSON client-side before overwrite; write-then-verify rather than blind overwrite. Google Drive also keeps automatic revision history on files it manages — a free, built-in restore path if something does go wrong. |
| XIRR / FX-impact-decomposition math is subtly wrong | Medium | High | Worked numeric examples and cross-checks against independent Excel calculations before either ships — already flagged as a gate in the PRD and Tech Stack docs, not optional polish. |
| LLM misparses a transaction or asset value | Medium | Medium | Confirm-before-merge on every parse, no exceptions. Real behavioral risk: confirm-fatigue, where the preview gets rubber-stamped without real review after the first dozen times — worth being honest with yourself about during actual use, not something the app can fully solve. |
| Free-tier API limits are stricter than advertised (already happened twice in prior builds — gemini-2.5's real RPD vs. documented) | Medium | Medium | Verify actual limits in each provider's dashboard during build, not from marketing copy. Flagged in both the Tech Stack and this doc so it isn't missed a third time. |
| AMFI/Twelve Data/CoinGecko change their response format | Low | Medium | Isolate each API behind a thin adapter function — a format change means fixing one function, not hunting through the app. |
| 10-year historical data migration is tedious/error-prone, especially for the 6 manual-tracked assets | High | Medium | LLM Paste & Interpret substantially reduces this vs. hand-typing, but it's still real effort — budget real time for it in the Roadmap, don't treat it as a rounding error. |
| Google OAuth "Testing mode" refresh tokens expire after 7 days (not just the ~1hr access token) | Medium | Low | Re-consent is a one-click flow, not a lost-access event — annoying, not risky. Worth knowing going in so it isn't mistaken for a bug. Whether moving the app to "In production" status removes this (drive.file is a non-sensitive scope, which may qualify for lighter verification) is worth checking during build — not assumed here. |
| Symbol/ticker mapping wrong or ambiguous for a specific asset (e.g. SGB, ETERNAL's renamed ticker) | Medium | Low | Already designed for — surfaces as a sync error/alert, fixed inline in Asset Value Trends, doesn't block the rest of the app. |

## Cost breakdown — target ₹0/month

| Component | Cost |
|---|---|
| GitHub Pages hosting | Free |
| GitHub Actions CI (public repo) | Free, effectively unlimited minutes |
| Google Drive storage | Free — a few MB of JSON is nowhere near the 15GB free tier |
| Google OAuth | Free |
| Gemini API | Free tier |
| Twelve Data | Free tier |
| CoinGecko | Free tier |
| AMFI | Free, no key required |
| Custom domain *(optional, your call)* | ~$10–15/year — the one line item that isn't ₹0 if chosen |

**Confirmed: ₹0/month at v1, same target as the other two portfolio projects**, with a
custom domain as the sole opt-in exception if you decide it's worth it later.
