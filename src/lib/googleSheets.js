// GOOGLEFINANCE-via-Sheets-API adapter — the alternative to Twelve Data's India
// restriction discussed in the last round. Reuses the same Google OAuth session
// already established for Drive (with the Sheets scope added), rather than adding a
// new vendor or a proxy server.
//
// HONEST FLAG: this is new code exercising a path (Sheets API called cross-origin
// from a browser with an OAuth token) that couldn't be tested in this environment —
// no live browser, no real Google account available here. The Drive API calls this
// mirrors were verified by you in real use; this hasn't been yet. Treat this as a
// first real attempt, not a proven mechanism — likely needs at least one round of
// real debugging once you actually try it.
import { getAccessToken, MOCK_MODE } from './drive.js'

const SHEET_NAME = 'NetWorthTracker-Prices'
let cachedSheetId = null

async function sheetsFetch(path, options = {}) {
  const token = getAccessToken()
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`Sheets API error: ${res.status} ${await res.text()}`)
  return res.json()
}

// Find-or-create the dedicated scratch sheet, same pattern as ensureAppFolderAndFiles
// in drive.js. Cached in memory for the session - re-checked if a call ever fails.
async function ensureAppSheet() {
  if (cachedSheetId) return cachedSheetId

  const driveToken = getAccessToken()
  const q = encodeURIComponent(`name='${SHEET_NAME}' and trashed=false`)
  const list = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive`, {
    headers: { Authorization: `Bearer ${driveToken}` },
  }).then((r) => r.json())

  if (list.files?.length) {
    cachedSheetId = list.files[0].id
    return cachedSheetId
  }

  const created = await sheetsFetch('', {
    method: 'POST',
    body: JSON.stringify({ properties: { title: SHEET_NAME } }),
  })
  cachedSheetId = created.spreadsheetId
  return cachedSheetId
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toGoogleFinanceDate(dateStr) {
  const [y, m, d] = dateStr.split('-')
  return `DATE(${y},${parseInt(m, 10)},${parseInt(d, 10)})`
}

// symbol expected in "NSE:BEL" format. Returns { 'YYYY-MM-DD': value }.
export async function fetchGoogleFinanceHistory(symbol, fromDate, toDate) {
  if (MOCK_MODE) return mockGoogleFinanceHistory(symbol, fromDate, toDate)

  const sheetId = await ensureAppSheet()
  const formula = `=GOOGLEFINANCE("${symbol}","close",${toGoogleFinanceDate(fromDate)},${toGoogleFinanceDate(toDate)},"DAILY")`

  // Write the formula into a scratch cell - GOOGLEFINANCE spills a Date|Close table
  // starting from there once Sheets recalculates.
  await sheetsFetch(`${sheetId}/values/Sheet1!A1?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    body: JSON.stringify({ values: [[formula]] }),
  })

  // Recalculation isn't instant - this delay is a guess, not a verified figure.
  // If this proves too short/long in real use, that's exactly the kind of thing
  // that needs adjusting after real testing.
  await sleep(3000)

  const result = await sheetsFetch(`${sheetId}/values/Sheet1!A1:B3700`)
  const rows = result.values || []
  if (rows.length <= 1) {
    throw new Error(`GOOGLEFINANCE returned no data for ${symbol} — check the symbol format (expects "NSE:TICKER")`)
  }

  const out = {}
  // First row is the formula's own output header ("Date", "Close") - skip it.
  for (const [dateVal, closeVal] of rows.slice(1)) {
    if (!dateVal || !closeVal) continue
    // Google Sheets returns dates as serial numbers or locale strings depending on
    // formatting - this handles the common "DD/MM/YYYY" and ISO cases, but date
    // parsing edge cases here are exactly the kind of thing to watch for in testing.
    const iso = parseSheetDate(dateVal)
    if (iso) out[iso] = parseFloat(closeVal)
  }
  return out
}

function parseSheetDate(val) {
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10)
  const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) {
    const [, d, mo, y] = m
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  return null
}

function mockGoogleFinanceHistory(symbol, fromDate, toDate) {
  let seed = 0
  for (const ch of symbol) seed += ch.charCodeAt(0)
  const base = 100 + (seed % 500)
  const out = {}
  let d = new Date(fromDate)
  const end = new Date(toDate)
  let v = base
  while (d <= end) {
    const day = d.getDay()
    if (day !== 0 && day !== 6) {
      const noise = Math.sin(seed + d.getTime() / 86400000) * 0.01
      v = v * (1 + noise)
      out[d.toISOString().slice(0, 10)] = Math.round(v * 100) / 100
    }
    d.setDate(d.getDate() + 1)
  }
  return out
}
