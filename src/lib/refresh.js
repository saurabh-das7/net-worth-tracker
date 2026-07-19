// Refresh orchestration — implements the algorithm resolved in the Tech Stack doc:
// 1. find last stored date per asset
// 2. request (last stored date + 1) through yesterday
// 3. write only dates the source actually returns
// 4. forward-fill any gap dates up to yesterday from the prior value
// 5. never write today's date
import { fetchAmfiHistory, fetchCoinGeckoHistory, fetchTwelveDataHistory } from './priceSources.js'

function yesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function addDay(dateStr) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function forwardFillGaps(existingSeries, newPoints, fromDate, toDate) {
  // newPoints: { 'YYYY-MM-DD': value } — only dates the source actually returned.
  // Walks fromDate..toDate day by day; where newPoints has a value, use it and
  // remember it as "last known"; where it doesn't, forward-fill from last known.
  const merged = { ...existingSeries }
  let lastKnownDate = Object.keys(existingSeries).filter((d) => d < fromDate).sort().pop()
  let lastKnown = lastKnownDate ? existingSeries[lastKnownDate] : null

  let d = fromDate
  while (d <= toDate) {
    if (newPoints[d] !== undefined) {
      merged[d] = newPoints[d]
      lastKnown = newPoints[d]
    } else if (lastKnown !== null) {
      merged[d] = lastKnown // gap fill — same mechanism for weekends and stale gaps
    }
    d = addDay(d)
  }
  return merged
}

// Refreshes a single asset/FX/benchmark entry. Returns { ok: true } or
// { ok: false, error } — caller (AssetTrends.jsx) turns errors into alerts, per the
// PRD's "sync/refresh error and last-updated visibility" requirement.
export async function refreshOne(assetMasterEntry, existingSeries, firstTxnDate) {
  const target = yesterday()
  const existingDates = Object.keys(existingSeries).sort()
  const lastStored = existingDates[existingDates.length - 1]

  // First-connection backfill: if nothing stored yet, start from the asset's first
  // transaction date instead of "last stored date + 1".
  const fromDate = lastStored ? addDay(lastStored) : firstTxnDate || target

  if (fromDate > target) {
    return { ok: true, series: existingSeries, note: 'already up to date' }
  }

  try {
    let newPoints
    if (assetMasterEntry.source === 'AMFI') {
      if (!assetMasterEntry.amfiSchemeCode) {
        throw new Error('No AMFI scheme code mapped for this fund yet')
      }
      newPoints = await fetchAmfiHistory(assetMasterEntry.amfiSchemeCode, fromDate)
    } else if (assetMasterEntry.source === 'CoinGecko') {
      const days = Math.max(
        1,
        Math.ceil((new Date(target) - new Date(fromDate)) / 86400000) + 1,
      )
      newPoints = await fetchCoinGeckoHistory(assetMasterEntry.symbol, days)
    } else if (assetMasterEntry.source === 'TwelveData') {
      newPoints = await fetchTwelveDataHistory(assetMasterEntry.symbol, fromDate, target)
    } else if (assetMasterEntry.source === 'fixed') {
      // FD reference rate — compounds daily from the assumed annual rate rather than
      // being fetched, per the Tech Stack doc's resolution.
      newPoints = compoundFixedRate(existingSeries, assetMasterEntry.assumedAnnualRate, fromDate, target)
    } else {
      throw new Error(`No refresh source configured for ${assetMasterEntry.name}`)
    }

    const merged = forwardFillGaps(existingSeries, newPoints, fromDate, target)
    return { ok: true, series: merged }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

function compoundFixedRate(existingSeries, annualRate, fromDate, toDate) {
  const dailyRate = Math.pow(1 + annualRate, 1 / 365) - 1
  const dates = Object.keys(existingSeries).sort()
  let value = dates.length ? existingSeries[dates[dates.length - 1]] : 100
  const out = {}
  let d = fromDate
  while (d <= toDate) {
    value = value * (1 + dailyRate)
    out[d] = Math.round(value * 10000) / 10000
    d = addDay(d)
  }
  return out
}
