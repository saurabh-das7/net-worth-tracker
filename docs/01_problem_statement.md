# 01 — Problem Statement

## The problem

My net worth is spread across seven distinct asset classes — Indian mutual funds, direct
equity, US stocks, crypto, gold bonds, retirement accounts (EPF/NPS), and debt — each
living in its own app, statement format, or spreadsheet tab. None of these sources agree
on a single number, and none of them tell me the thing I actually want to know: what is
my time-weighted return, per asset class and in aggregate, and how does that compare to
just holding an index fund.

Manually reconciling this monthly means re-typing balances from five apps into a
spreadsheet, guessing at absolute returns because the spreadsheet doesn't account for
when money went in, and losing the version history every time I rebuild the sheet after
a format change. A prior attempt to solve this with a single self-contained HTML file
worked initially but became unmaintainable as more asset classes, price feeds, and tabs
were added — state bugs multiplied faster than features shipped.

## Who feels this acutely

Me, specifically: an investor with ~9 years of accumulated positions across Indian and
US markets, alternative assets, and debt, who rebalances and reviews performance monthly,
and who wants transaction-level accuracy (XIRR, not eyeballed CAGR) without paying for
a wealth-management subscription or handing portfolio data to a third-party fintech app.

## The cost of the problem today

- **~2–3 hours/month** spent manually reconciling balances across apps and spreadsheets
  before I can even ask "am I on track."
- **No real return number.** Absolute gain without XIRR hides whether a SIP that's been
  running for 6 months is actually outperforming one that's been running for 3 years —
  I've made rebalancing calls without knowing true annualised return.
- **No benchmark context.** A 12% return sounds fine until you learn Nifty 50 did 15%
  over the same window — right now I have no way to see that gap.
- **Liquidity blindness.** During the last market dip I couldn't quickly answer "how much
  can I access in a week without selling at a loss" — net worth was one flattened number,
  not a liquidity-tiered view.
- **Stale prices silently corrupt the picture.** Manually-checkpointed holdings (ELSS
  funds, unlisted stock) drift out of date with no warning, so the dashboard can look
  accurate while quietly being wrong.
- **Nothing updates itself.** Every value in every spreadsheet is only as current as the
  last time I sat down and typed it in — there's no daily trend, just a series of manual
  snapshots taken whenever I remember to.
- **No single-currency truth.** Holdings span INR and USD; without a tracked daily FX
  rate, "what am I actually worth" requires a manual conversion I mostly skip, so I
  usually only look at the two currencies separately rather than one true number.
- **Realized gains are invisible.** Spreadsheets show current unrealized value, but the
  actual booked profit/loss from assets already sold — by year, by asset class — isn't
  tracked anywhere, so I can't see whether past exits were good decisions in hindsight.

## Why now

Portfolio complexity crossed a threshold this year — seven asset classes, two currencies,
and both liquid and illiquid holdings — at which spreadsheets and the earlier single-file
build both stopped scaling. Rebuilding now, while the transaction history is still small
enough to migrate cleanly, is cheaper than doing it after another year of data accumulates
in a format I'll have to reverse-engineer later.
