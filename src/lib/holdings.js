// Computes per-holding units, invested amount, and current value from the raw
// transaction log + asset trend data. See PRD "Unit-aware, with three tracking
// methods per asset" — balance-snapshot assets skip the transaction math entirely
// and read their value straight from the latest trend entry.

function latestValueOnOrBefore(trendSeries, dateStr) {
  if (!trendSeries) return null
  const dates = Object.keys(trendSeries).filter((d) => d <= dateStr).sort()
  if (!dates.length) return null
  return trendSeries[dates[dates.length - 1]]
}

export function computeHoldings(settingsFile, transactionsFile, trendsFile, asOfDate) {
  const today = asOfDate || new Date().toISOString().slice(0, 10)
  const assets = settingsFile?.assets || {}
  const transactions = transactionsFile?.transactions || []
  const trends = trendsFile?.trends || {}

  const holdings = []

  for (const [assetId, asset] of Object.entries(assets)) {
    if (asset.trackingMethod === 'balance_snapshot') {
      const value = latestValueOnOrBefore(trends[assetId], today)
      if (value === null) continue // no balance entry recorded yet - don't show a zero row
      holdings.push({
        assetId,
        name: asset.name,
        category: asset.category,
        baseCurrency: asset.baseCurrency,
        trackingMethod: asset.trackingMethod,
        isLiability: !!asset.isLiability,
        units: null,
        currentValue: value,
        invested: null, // no meaningful "invested" figure for a balance-snapshot asset
        unrealizedGain: null,
        liquidityTier: asset.liquidityTier,
      })
      continue
    }

    // Auto / manual price-feed: units accumulate from buy/sell transactions.
    const assetTxns = transactions
      .filter((t) => t.assetId === assetId)
      .sort((a, b) => a.date.localeCompare(b.date))

    if (!assetTxns.length) continue // never transacted in - don't show a zero row

    let units = 0
    let invested = 0
    for (const t of assetTxns) {
      if (t.type === 'buy') {
        units += t.units
        invested += t.amount
      } else if (t.type === 'sell') {
        // Simple average-cost reduction for the running "invested" figure here —
        // the real FIFO realized-P&L accounting lives in lib/pnl.js (M4), this is
        // just for the Holdings tab's invested/unrealized display.
        const avgCost = units > 0 ? invested / units : 0
        invested -= avgCost * t.units
        units -= t.units
      }
    }

    const price = latestValueOnOrBefore(trends[assetId], today) || 0
    const currentValue = units * price

    holdings.push({
      assetId,
      name: asset.name,
      category: asset.category,
      baseCurrency: asset.baseCurrency,
      trackingMethod: asset.trackingMethod,
      isLiability: false,
      units,
      currentValue,
      invested,
      unrealizedGain: currentValue - invested,
      liquidityTier: asset.liquidityTier,
    })
  }

  return holdings
}

export function totalNetWorth(holdings) {
  return holdings.reduce((sum, h) => {
    const v = h.isLiability ? -Math.abs(h.currentValue) : h.currentValue
    return sum + v
  }, 0)
}
