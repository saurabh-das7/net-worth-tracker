// Price source adapters — one function per vendor, isolated per the Tech Stack doc's
// mitigation for "vendor changes response format: fix one adapter, not the app."
//
// HONEST NOTE on AMFI: AMFI itself (amfiindia.com) only publishes a same-day NAVAll.txt
// file, not a clean historical JSON API. The free historical source used here is
// mfapi.in, a widely-used third-party wrapper around AMFI's own published data (not
// AMFI's own endpoint). This wasn't spelled out this precisely in the Tech Stack doc —
// worth a conscious note there, since "AMFI" and "a wrapper around AMFI data" are a
// real distinction if that site's reliability is ever in question.
//
// Twelve Data needs a real key; CoinGecko and mfapi.in don't. With a dummy Twelve Data
// key (as of this overnight scaffolding pass), Twelve Data calls fall back to a mock
// generator so Refresh is testable end to end before a real key is wired in — same
// pattern as the Drive mock mode in lib/drive.js.

const TWELVE_DATA_KEY = import.meta.env.VITE_TWELVE_DATA_API_KEY || ''
const TWELVE_DATA_MOCK = !TWELVE_DATA_KEY || TWELVE_DATA_KEY === 'DUMMY_TWELVE_DATA_KEY'

export async function searchAmfiSchemes(query) {
  if (!query || query.length < 3) return []
  const res = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`)
  if (!res.ok) throw new Error('AMFI scheme search failed')
  return res.json() // [{ schemeCode, schemeName }]
}

// --- AMFI (via mfapi.in) --------------------------------------------------

export async function fetchAmfiHistory(schemeCode, fromDate) {
  const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}`)
  if (!res.ok) throw new Error(`AMFI/mfapi lookup failed for scheme ${schemeCode}`)
  const json = await res.json()
  // mfapi returns { data: [{ date: 'DD-MM-YYYY', nav: '123.45' }, ...], newest first }
  const out = {}
  for (const row of json.data || []) {
    const [dd, mm, yyyy] = row.date.split('-')
    const iso = `${yyyy}-${mm}-${dd}`
    if (!fromDate || iso >= fromDate) out[iso] = parseFloat(row.nav)
  }
  return out // { 'YYYY-MM-DD': navValue }
}

// --- CoinGecko -------------------------------------------------------------

export async function fetchCoinGeckoHistory(coinId, days, vsCurrency = 'usd') {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=${vsCurrency}&days=${days}&interval=daily`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`CoinGecko lookup failed for ${coinId}`)
  const json = await res.json()
  const out = {}
  for (const [ts, price] of json.prices || []) {
    const iso = new Date(ts).toISOString().slice(0, 10)
    out[iso] = price
  }
  return out
}

// --- Twelve Data (stocks, ETFs, indices-via-ETF-proxy, FX) -----------------

export async function fetchTwelveDataHistory(symbol, fromDate, toDate) {
  if (TWELVE_DATA_MOCK) return mockTwelveDataHistory(symbol, fromDate, toDate)

  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(
    symbol,
  )}&interval=1day&start_date=${fromDate}&end_date=${toDate}&apikey=${TWELVE_DATA_KEY}`
  const res = await fetch(url)
  const json = await res.json()
  if (json.status === 'error') {
    // Symbol-not-found and similar — surfaced as an alert by the caller (refresh.js),
    // not swallowed here.
    throw new Error(json.message || `Twelve Data error for symbol ${symbol}`)
  }
  const out = {}
  for (const row of json.values || []) {
    out[row.datetime] = parseFloat(row.close)
  }
  return out
}

function mockTwelveDataHistory(symbol, fromDate, toDate) {
  // Deterministic-ish mock so repeated Refreshes don't visibly jump around —
  // seeded from the symbol string, not truly random.
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
      // pseudo-random but stable per date+symbol
      const noise = Math.sin(seed + d.getTime() / 86400000) * 0.01
      v = v * (1 + noise)
      out[d.toISOString().slice(0, 10)] = Math.round(v * 100) / 100
    }
    d.setDate(d.getDate() + 1)
  }
  return out
}

export const isTwelveDataMocked = TWELVE_DATA_MOCK
