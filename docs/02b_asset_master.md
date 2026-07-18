# 02b — Asset Master (Seed Data)

This is the definitive per-asset configuration that seeds `settings.json` on first
build — category, base currency, tracking method, sync source, and default liquidity
tier. "Other Stocks" from the original list is dropped — every stock is tracked
individually instead of via a catch-all bucket.

**Tracking methods:** Auto (price-feed) · Manual (price-feed) · Balance-snapshot (see
PRD Design Principles — no units, a total value per date).

**Two open items before this is fully locked** (flagged inline below, both marked ⚠):
whether Recovery Tokens genuinely has no price source, and confirming SGB tradability
via Twelve Data once we're building.

| Investment | Category | Base Ccy | Tracking | Source / Symbol | Liquidity Tier |
|---|---|---|---|---|---|
| Canara Robeco Equity Tax Saver Fund | ELSS | INR | Auto | AMFI NAV | Illiquid (3-yr lock) |
| Quant Tax Fund | ELSS | INR | Auto | AMFI NAV | Illiquid (3-yr lock) |
| Tata Focussed Equity Fund | Equity Fund | INR | Auto | AMFI NAV | Short |
| Zerodha Nifty LargeMidcap 250 Index Fund | Index Fund | INR | Auto | AMFI NAV | Short |
| LINK – WazirX | Cryptocurrency | INR/USD¹ | Auto | CoinGecko | Immediate |
| XRP – WazirX | Cryptocurrency | INR/USD¹ | Auto | CoinGecko | Immediate |
| Recovery Tokens (516.9623) | Cryptocurrency | INR/USD¹ | Manual ⚠ | No public feed | Illiquid |
| BNB – Binance | Cryptocurrency | USD | Auto | CoinGecko | Immediate |
| USDT – Binance | Cryptocurrency | USD | Auto | CoinGecko | Immediate |
| POL – Binance | Cryptocurrency | USD | Auto | CoinGecko | Immediate |
| SOL – Binance | Cryptocurrency | USD | Auto | CoinGecko | Immediate |
| ETH – Binance | Cryptocurrency | USD | Auto | CoinGecko | Immediate |
| BTC – Binance | Cryptocurrency | USD | Auto | CoinGecko | Immediate |
| XRP – Binance | Cryptocurrency | USD | Auto | CoinGecko | Immediate |
| Cash | Cash | INR | Balance-snapshot | — | Immediate |
| HDFC Savings Account | Account | INR | Balance-snapshot | — | Immediate |
| HDFC Current Account | Account | INR | Balance-snapshot | — | Immediate |
| SBI Savings Account | Account | INR | Balance-snapshot | — | Immediate |
| CBI Savings Account | Account | INR | Balance-snapshot | — | Immediate |
| Federal Bank Savings Account | Account | INR | Balance-snapshot | — | Immediate |
| Niyo DCB Account | Account | INR | Balance-snapshot | — | Immediate |
| Zerodha balance | Account | INR | Balance-snapshot | — | Immediate |
| Fidelity Cash | Account | USD | Balance-snapshot | — | Immediate |
| Vested Cash | Account | USD | Balance-snapshot | — | Immediate |
| HDFC Diners Club Credit Card | Debt | INR | Balance-snapshot | — | *(liability — excluded from liquidity strip)* |
| SBI SimplyCLICK Credit Card | Debt | INR | Balance-snapshot | — | *(liability)* |
| Axis Select Credit Card | Debt | INR | Balance-snapshot | — | *(liability)* |
| Amex Membership Rewards Credit Card | Debt | INR | Balance-snapshot | — | *(liability)* |
| BEL | Stocks | INR | Auto | Twelve Data (NSE: BEL) | Immediate |
| SBIN | Stocks | INR | Auto | Twelve Data (NSE: SBIN) | Immediate |
| HAL | Stocks | INR | Auto | Twelve Data (NSE: HAL) | Immediate |
| HDFC BANK | Stocks | INR | Auto | Twelve Data (NSE: HDFCBANK) | Immediate |
| JIOFIN | Stocks | INR | Auto | Twelve Data (NSE: JIOFIN) | Immediate |
| MAZDOCK | Stocks | INR | Auto | Twelve Data (NSE: MAZDOCK) | Immediate |
| ETERNAL | Stocks | INR | Auto | Twelve Data (NSE: ETERNAL — Zomato's renamed ticker) | Immediate |
| F&O | Derivatives | INR | Manual | No clean free-API fit for options chains | Immediate |
| GOLDBEES | Commodity ETF | INR | Auto | Twelve Data (NSE: GOLDBEES) — also the gold benchmark proxy | Immediate |
| SILVERBEES | Commodity ETF | INR | Auto | Twelve Data (NSE: SILVERBEES) | Immediate |
| SGBSEP29VI-GB | Gold Bond | INR | Auto, expect manual fallback ⚠ | Twelve Data — SGB series are thinly traded, verify coverage during build | Medium |
| NIFTY BeES | Equity ETF | INR | Auto | Twelve Data (NSE: NIFTYBEES) — also the Nifty 50 benchmark proxy | Immediate |
| CBI Education Loan | Loan | INR | Balance-snapshot | — | *(liability)* |
| National Pension Scheme – HDFC | NPS | INR | Manual | No free NPS NAV API found | Illiquid |
| Security Deposit for Flat | Security Deposit | INR | Balance-snapshot | — | Medium |
| Microsoft Stocks (RSU/ESPP, vested only) | RSU/ESPP | USD | Auto | Twelve Data (NASDAQ: MSFT) — tracked separately from US Stocks & ETF; only vested shares counted as held | Immediate |
| Oyo Rooms | Unlisted Stocks | INR | Manual | No public feed — private | Medium |
| ASK Investment Managers | Unlisted Stocks | INR | Manual | No public feed — private | Medium |
| NSE | Unlisted Stocks | INR | Manual | No public feed — private | Medium |
| NOW | US Stocks & ETF | USD | Auto | Twelve Data (NYSE: NOW) | Immediate |
| CRWD | US Stocks & ETF | USD | Auto | Twelve Data (NASDAQ: CRWD) | Immediate |
| AVGO | US Stocks & ETF | USD | Auto | Twelve Data (NASDAQ: AVGO) | Immediate |
| PANW | US Stocks & ETF | USD | Auto | Twelve Data (NASDAQ: PANW) | Immediate |
| QQQ | US Stocks & ETF | USD | Auto | Twelve Data (NASDAQ: QQQ) — also the Nasdaq benchmark proxy | Immediate |
| AXON | US Stocks & ETF | USD | Auto | Twelve Data (NASDAQ: AXON) | Immediate |
| META | US Stocks & ETF | USD | Auto | Twelve Data (NASDAQ: META) | Immediate |
| NVDA | US Stocks & ETF | USD | Auto | Twelve Data (NASDAQ: NVDA) | Immediate |
| EPFO | PF | INR | Manual | No free EPFO balance API found | Illiquid |

¹ Crypto held on WazirX is priced in whichever currency CoinGecko quotes it in;
functionally this just needs a consistent base currency per holding — confirm INR vs
USD preference for the WazirX-held tokens specifically when we get to build.

## Summary by tracking method

- **Auto (price-feed):** 30 assets — the large majority. AMFI covers the 4 mutual
  funds; CoinGecko covers 9 of 10 crypto holdings; Twelve Data covers all listed
  stocks, ETFs, and the RSU/ESPP position.
- **Manual (price-feed):** 6 assets — Recovery Tokens, F&O, NPS, the 3 unlisted
  stocks, and EPFO. All genuinely have no free public price source.
- **Balance-snapshot:** 15 assets — every Cash/Account/Debt/Loan/Security Deposit
  entry. No units, no XIRR, no benchmark comparison — Net Worth and Liquidity view only.
- **Auto, but flagged as uncertain until verified in build:** SGB (thin trading, may
  fall back to manual).

## Open items before this is fully locked

- ⚠ Confirm Recovery Tokens genuinely has no price source, or if there's a specific
  exchange/project reference price worth trying.
- ⚠ Verify SGBSEP29VI-GB's actual coverage on Twelve Data once building — likely to
  need the manual fallback.
- Confirm base currency (INR vs USD) for the two WazirX-held crypto tokens.
