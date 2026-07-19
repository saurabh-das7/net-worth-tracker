// Bundled Demo dataset — a small but real synthetic dataset so Demo mode is
// testable from M1 onward. This gets expanded into the full 10-year, richer
// dataset at M8 (see docs/06_roadmap.md M8) — this is a working placeholder,
// not the final version, flagged here and in the build log.
import { ASSET_MASTER, BENCHMARKS, FX_PSEUDO_ASSET } from './assetMaster.js'

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

// A handful of representative holdings across tracking methods, ~2 years of
// synthetic history — enough to exercise every chart/calc without needing the
// real 10-year import yet.
const demoAssetIds = ['niftybees', 'goldbees', 'hdfcbank', 'btc_binance', 'hdfc_savings', 'hdfc_diners']

const settings = { assets: {} }
for (const id of demoAssetIds) {
  const master = ASSET_MASTER.find((a) => a.id === id)
  settings.assets[id] = { ...master }
}

const transactions = [
  { id: 't1', date: daysAgo(700), assetId: 'niftybees', type: 'buy', units: 50, amount: 12500, currency: 'INR' },
  { id: 't2', date: daysAgo(650), assetId: 'niftybees', type: 'buy', units: 30, amount: 8100, currency: 'INR' },
  { id: 't3', date: daysAgo(500), assetId: 'goldbees', type: 'buy', units: 100, amount: 6200, currency: 'INR' },
  { id: 't4', date: daysAgo(400), assetId: 'hdfcbank', type: 'buy', units: 20, amount: 32000, currency: 'INR' },
  { id: 't5', date: daysAgo(300), assetId: 'btc_binance', type: 'buy', units: 0.02, amount: 900, currency: 'USD' },
  { id: 't6', date: daysAgo(100), assetId: 'niftybees', type: 'sell', units: 10, amount: 2900, currency: 'INR' },
]

function trendSeries(startVal, days, volatility) {
  const series = {}
  let v = startVal
  for (let i = days; i >= 0; i--) {
    v = v * (1 + (Math.random() - 0.48) * volatility)
    series[daysAgo(i)] = Math.round(v * 100) / 100
  }
  return series
}

const trends = {
  niftybees: trendSeries(250, 700, 0.015),
  goldbees: trendSeries(58, 500, 0.012),
  hdfcbank: trendSeries(1550, 400, 0.02),
  btc_binance: trendSeries(43000, 300, 0.04),
  hdfc_savings: trendSeries(150000, 700, 0.001),
  hdfc_diners: trendSeries(-15000, 700, 0.02),
  [FX_PSEUDO_ASSET.id]: trendSeries(83.2, 700, 0.003),
  BENCHMARK_NIFTY50: trendSeries(250, 700, 0.015),
  BENCHMARK_NASDAQ: trendSeries(420, 700, 0.018),
  BENCHMARK_GOLD: trendSeries(58, 700, 0.012),
  BENCHMARK_FD: trendSeries(100, 700, 0.0002),
}

export const DEMO_DATA = {
  'settings.json': settings,
  'transactions.json': { transactions },
  'asset_trends.json': { trends },
}
