// Seed data for settings.json's asset master — derived directly from
// docs/02b_asset_master.md. Categories, tracking method, base currency, and
// liquidity tier are locked per that doc; symbol/code fields are placeholders
// to be confirmed during real M3 build (Twelve Data coverage varies).
//
// trackingMethod: 'auto' | 'manual' | 'balance_snapshot' — see PRD "Unit-aware,
// with three tracking methods per asset."

export const ASSET_MASTER = [
  // --- Mutual funds (Auto via AMFI) ---
  { id: 'canara_robeco_elss', name: 'Canara Robeco Equity Tax Saver Fund', category: 'ELSS', baseCurrency: 'INR', trackingMethod: 'auto', source: 'AMFI', symbol: '', liquidityTier: 'Illiquid' },
  { id: 'quant_tax_fund', name: 'Quant Tax Fund', category: 'ELSS', baseCurrency: 'INR', trackingMethod: 'auto', source: 'AMFI', symbol: '', liquidityTier: 'Illiquid' },
  { id: 'tata_focussed_equity', name: 'Tata Focussed Equity Fund', category: 'Equity Fund', baseCurrency: 'INR', trackingMethod: 'auto', source: 'AMFI', symbol: '', liquidityTier: 'Short' },
  { id: 'zerodha_nifty_lmc250', name: 'Zerodha Nifty LargeMidcap 250 Index Fund', category: 'Index Fund', baseCurrency: 'INR', trackingMethod: 'auto', source: 'AMFI', symbol: '', liquidityTier: 'Short' },

  // --- Crypto (Auto via CoinGecko, except Recovery Tokens) ---
  { id: 'link_wazirx', name: 'LINK - WazirX', category: 'Cryptocurrency', baseCurrency: 'INR', trackingMethod: 'auto', source: 'CoinGecko', symbol: 'chainlink', liquidityTier: 'Immediate' },
  { id: 'xrp_wazirx', name: 'XRP - WazirX', category: 'Cryptocurrency', baseCurrency: 'INR', trackingMethod: 'auto', source: 'CoinGecko', symbol: 'ripple', liquidityTier: 'Immediate' },
  { id: 'recovery_tokens', name: 'Recovery Tokens (516.9623)', category: 'Cryptocurrency', baseCurrency: 'INR', trackingMethod: 'manual', source: null, symbol: '', liquidityTier: 'Illiquid' },
  { id: 'bnb_binance', name: 'BNB - Binance', category: 'Cryptocurrency', baseCurrency: 'USD', trackingMethod: 'auto', source: 'CoinGecko', symbol: 'binancecoin', liquidityTier: 'Immediate' },
  { id: 'usdt_binance', name: 'USDT - Binance', category: 'Cryptocurrency', baseCurrency: 'USD', trackingMethod: 'auto', source: 'CoinGecko', symbol: 'tether', liquidityTier: 'Immediate' },
  { id: 'pol_binance', name: 'POL - Binance', category: 'Cryptocurrency', baseCurrency: 'USD', trackingMethod: 'auto', source: 'CoinGecko', symbol: 'polygon-ecosystem-token', liquidityTier: 'Immediate' },
  { id: 'sol_binance', name: 'SOL - Binance', category: 'Cryptocurrency', baseCurrency: 'USD', trackingMethod: 'auto', source: 'CoinGecko', symbol: 'solana', liquidityTier: 'Immediate' },
  { id: 'eth_binance', name: 'ETH - Binance', category: 'Cryptocurrency', baseCurrency: 'USD', trackingMethod: 'auto', source: 'CoinGecko', symbol: 'ethereum', liquidityTier: 'Immediate' },
  { id: 'btc_binance', name: 'BTC - Binance', category: 'Cryptocurrency', baseCurrency: 'USD', trackingMethod: 'auto', source: 'CoinGecko', symbol: 'bitcoin', liquidityTier: 'Immediate' },
  { id: 'xrp_binance', name: 'XRP - Binance', category: 'Cryptocurrency', baseCurrency: 'USD', trackingMethod: 'auto', source: 'CoinGecko', symbol: 'ripple', liquidityTier: 'Immediate' },

  // --- Cash / Accounts (balance-snapshot) ---
  { id: 'cash', name: 'Cash', category: 'Cash', baseCurrency: 'INR', trackingMethod: 'balance_snapshot', source: null, symbol: '', liquidityTier: 'Immediate' },
  { id: 'hdfc_savings', name: 'HDFC Savings Account', category: 'Account', baseCurrency: 'INR', trackingMethod: 'balance_snapshot', source: null, symbol: '', liquidityTier: 'Immediate' },
  { id: 'hdfc_current', name: 'HDFC Current Account', category: 'Account', baseCurrency: 'INR', trackingMethod: 'balance_snapshot', source: null, symbol: '', liquidityTier: 'Immediate' },
  { id: 'sbi_savings', name: 'SBI Savings Account', category: 'Account', baseCurrency: 'INR', trackingMethod: 'balance_snapshot', source: null, symbol: '', liquidityTier: 'Immediate' },
  { id: 'cbi_savings', name: 'CBI Savings Account', category: 'Account', baseCurrency: 'INR', trackingMethod: 'balance_snapshot', source: null, symbol: '', liquidityTier: 'Immediate' },
  { id: 'federal_savings', name: 'Federal Bank Savings Account', category: 'Account', baseCurrency: 'INR', trackingMethod: 'balance_snapshot', source: null, symbol: '', liquidityTier: 'Immediate' },
  { id: 'niyo_dcb', name: 'Niyo DCB Account', category: 'Account', baseCurrency: 'INR', trackingMethod: 'balance_snapshot', source: null, symbol: '', liquidityTier: 'Immediate' },
  { id: 'zerodha_balance', name: 'Zerodha balance', category: 'Account', baseCurrency: 'INR', trackingMethod: 'balance_snapshot', source: null, symbol: '', liquidityTier: 'Immediate' },
  { id: 'fidelity_cash', name: 'Fidelity Cash', category: 'Account', baseCurrency: 'USD', trackingMethod: 'balance_snapshot', source: null, symbol: '', liquidityTier: 'Immediate' },
  { id: 'vested_cash', name: 'Vested Cash', category: 'Account', baseCurrency: 'USD', trackingMethod: 'balance_snapshot', source: null, symbol: '', liquidityTier: 'Immediate' },

  // --- Debt (balance-snapshot, liability) ---
  { id: 'hdfc_diners', name: 'HDFC Diners Club Credit Card', category: 'Debt', baseCurrency: 'INR', trackingMethod: 'balance_snapshot', source: null, symbol: '', liquidityTier: null, isLiability: true },
  { id: 'sbi_simplyclick', name: 'SBI SimplyCLICK Credit Card', category: 'Debt', baseCurrency: 'INR', trackingMethod: 'balance_snapshot', source: null, symbol: '', liquidityTier: null, isLiability: true },
  { id: 'axis_select', name: 'Axis Select Credit Card', category: 'Debt', baseCurrency: 'INR', trackingMethod: 'balance_snapshot', source: null, symbol: '', liquidityTier: null, isLiability: true },
  { id: 'amex_mr', name: 'Amex Membership Rewards Credit Card', category: 'Debt', baseCurrency: 'INR', trackingMethod: 'balance_snapshot', source: null, symbol: '', liquidityTier: null, isLiability: true },
  { id: 'cbi_edu_loan', name: 'CBI Education Loan', category: 'Loan', baseCurrency: 'INR', trackingMethod: 'balance_snapshot', source: null, symbol: '', liquidityTier: null, isLiability: true },

  // --- Indian stocks (Auto via Twelve Data) ---
  { id: 'bel', name: 'BEL', category: 'Stocks', baseCurrency: 'INR', trackingMethod: 'auto', source: 'GoogleFinance', symbol: 'NSE:BEL', liquidityTier: 'Immediate' },
  { id: 'sbin', name: 'SBIN', category: 'Stocks', baseCurrency: 'INR', trackingMethod: 'auto', source: 'GoogleFinance', symbol: 'NSE:SBIN', liquidityTier: 'Immediate' },
  { id: 'hal', name: 'HAL', category: 'Stocks', baseCurrency: 'INR', trackingMethod: 'auto', source: 'GoogleFinance', symbol: 'NSE:HAL', liquidityTier: 'Immediate' },
  { id: 'hdfcbank', name: 'HDFC BANK', category: 'Stocks', baseCurrency: 'INR', trackingMethod: 'auto', source: 'GoogleFinance', symbol: 'NSE:HDFCBANK', liquidityTier: 'Immediate' },
  { id: 'jiofin', name: 'JIOFIN', category: 'Stocks', baseCurrency: 'INR', trackingMethod: 'auto', source: 'GoogleFinance', symbol: 'NSE:JIOFIN', liquidityTier: 'Immediate' },
  { id: 'mazdock', name: 'MAZDOCK', category: 'Stocks', baseCurrency: 'INR', trackingMethod: 'auto', source: 'GoogleFinance', symbol: 'NSE:MAZDOCK', liquidityTier: 'Immediate' },
  { id: 'eternal', name: 'ETERNAL', category: 'Stocks', baseCurrency: 'INR', trackingMethod: 'auto', source: 'GoogleFinance', symbol: 'NSE:ETERNAL', liquidityTier: 'Immediate' },

  // --- Derivatives (F&O) ---
  // No generic placeholder here anymore - F&O is now a category you add named
  // positions into via Asset Trends > Manage Assets > Add a new asset, since a
  // single bucket didn't reflect that you hold several distinct positions.

  // --- Commodities, gold bond, equity ETF ---
  { id: 'goldbees', name: 'GOLDBEES', category: 'Commodity ETF', baseCurrency: 'INR', trackingMethod: 'auto', source: 'GoogleFinance', symbol: 'NSE:GOLDBEES', liquidityTier: 'Immediate' },
  { id: 'silverbees', name: 'SILVERBEES', category: 'Commodity ETF', baseCurrency: 'INR', trackingMethod: 'auto', source: 'GoogleFinance', symbol: 'NSE:SILVERBEES', liquidityTier: 'Immediate' },
  { id: 'sgb_sep29', name: 'SGBSEP29VI-GB', category: 'Gold Bond', baseCurrency: 'INR', trackingMethod: 'auto', source: 'GoogleFinance', symbol: 'NSE:SGBSEP29VI-GB', liquidityTier: 'Medium' },
  { id: 'niftybees', name: 'NIFTY BeES', category: 'Equity ETF', baseCurrency: 'INR', trackingMethod: 'auto', source: 'GoogleFinance', symbol: 'NSE:NIFTYBEES', liquidityTier: 'Immediate' },

  // --- Retirement, deposits (manual) ---
  { id: 'nps_hdfc', name: 'National Pension Scheme - HDFC', category: 'NPS', baseCurrency: 'INR', trackingMethod: 'manual', source: null, symbol: '', liquidityTier: 'Illiquid' },
  { id: 'flat_deposit', name: 'Security Deposit for Flat', category: 'Security Deposit', baseCurrency: 'INR', trackingMethod: 'balance_snapshot', source: null, symbol: '', liquidityTier: 'Medium' },
  { id: 'epfo', name: 'EPFO', category: 'PF', baseCurrency: 'INR', trackingMethod: 'manual', source: null, symbol: '', liquidityTier: 'Illiquid' },

  // --- RSU/ESPP (separate from US Stocks & ETF, vested only) ---
  { id: 'msft_rsu', name: 'Microsoft Stocks', category: 'RSU/ESPP', baseCurrency: 'USD', trackingMethod: 'auto', source: 'TwelveData', symbol: 'MSFT', liquidityTier: 'Immediate' },

  // --- Unlisted (manual) ---
  { id: 'oyo', name: 'Oyo Rooms', category: 'Unlisted Stocks', baseCurrency: 'INR', trackingMethod: 'manual', source: null, symbol: '', liquidityTier: 'Medium' },
  { id: 'ask_im', name: 'ASK Investment Managers', category: 'Unlisted Stocks', baseCurrency: 'INR', trackingMethod: 'manual', source: null, symbol: '', liquidityTier: 'Medium' },
  { id: 'nse_unlisted', name: 'NSE', category: 'Unlisted Stocks', baseCurrency: 'INR', trackingMethod: 'manual', source: null, symbol: '', liquidityTier: 'Medium' },

  // --- US Stocks & ETF (Auto via Twelve Data) ---
  { id: 'now', name: 'NOW', category: 'US Stocks & ETF', baseCurrency: 'USD', trackingMethod: 'auto', source: 'TwelveData', symbol: 'NOW', liquidityTier: 'Immediate' },
  { id: 'crwd', name: 'CRWD', category: 'US Stocks & ETF', baseCurrency: 'USD', trackingMethod: 'auto', source: 'TwelveData', symbol: 'CRWD', liquidityTier: 'Immediate' },
  { id: 'avgo', name: 'AVGO', category: 'US Stocks & ETF', baseCurrency: 'USD', trackingMethod: 'auto', source: 'TwelveData', symbol: 'AVGO', liquidityTier: 'Immediate' },
  { id: 'panw', name: 'PANW', category: 'US Stocks & ETF', baseCurrency: 'USD', trackingMethod: 'auto', source: 'TwelveData', symbol: 'PANW', liquidityTier: 'Immediate' },
  { id: 'qqq', name: 'QQQ', category: 'US Stocks & ETF', baseCurrency: 'USD', trackingMethod: 'auto', source: 'TwelveData', symbol: 'QQQ', liquidityTier: 'Immediate' },
  { id: 'axon', name: 'AXON', category: 'US Stocks & ETF', baseCurrency: 'USD', trackingMethod: 'auto', source: 'TwelveData', symbol: 'AXON', liquidityTier: 'Immediate' },
  { id: 'meta', name: 'META', category: 'US Stocks & ETF', baseCurrency: 'USD', trackingMethod: 'auto', source: 'TwelveData', symbol: 'META', liquidityTier: 'Immediate' },
  { id: 'nvda', name: 'NVDA', category: 'US Stocks & ETF', baseCurrency: 'USD', trackingMethod: 'auto', source: 'TwelveData', symbol: 'NVDA', liquidityTier: 'Immediate' },
]

// Benchmarks tracked as pinned pseudo-assets, same schema as everything else —
// see PRD "Per-asset base currency" and Tech Stack "asset_trends.json... four
// benchmarks... all as pinned entries."
export const BENCHMARKS = [
  { id: 'BENCHMARK_NIFTY50', name: 'Nifty 50 (via NIFTYBEES proxy)', baseCurrency: 'INR', source: 'GoogleFinance', symbol: 'NSE:NIFTYBEES' },
  { id: 'BENCHMARK_NASDAQ', name: 'Nasdaq (via QQQ proxy)', baseCurrency: 'USD', source: 'TwelveData', symbol: 'QQQ' },
  { id: 'BENCHMARK_GOLD', name: 'Gold (via GOLDBEES proxy)', baseCurrency: 'INR', source: 'TwelveData', symbol: 'GOLDBEES' },
  { id: 'BENCHMARK_FD', name: 'Fixed Deposit (assumed rate)', baseCurrency: 'INR', source: 'fixed', symbol: null, assumedAnnualRate: 0.07 },
]

export const FX_PSEUDO_ASSET = { id: 'FX_USD_INR', name: 'USD/INR', source: 'TwelveData', symbol: 'USD/INR' }

// Converts the flat ASSET_MASTER array into the { assets: { id: {...} } } map shape
// settings.json actually stores — this is what seeds a brand-new My Data connection,
// so the Transactions/Holdings dropdowns aren't empty on first use.
export function buildInitialSettings() {
  const assets = {}
  for (const a of ASSET_MASTER) {
    const { id, ...rest } = a
    assets[id] = rest
  }
  return { assets }
}
