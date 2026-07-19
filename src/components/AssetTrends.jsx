import { useState, useMemo, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import { useApp } from '../context/AppContext.jsx'
import { BENCHMARKS, FX_PSEUDO_ASSET } from '../data/assetMaster.js'
import { refreshOne } from '../lib/refresh.js'
import { validateDate } from '../lib/dateValidation.js'

const STALE_DAYS = 15
const LIQUIDITY_TIERS = ['Immediate', 'Short', 'Medium', 'Illiquid']
const SOURCES = [
  { value: 'AMFI', label: 'AMFI (mutual funds)' },
  { value: 'TwelveData', label: 'Twelve Data (US stocks/ETFs/FX/crypto)' },
  { value: 'GoogleFinance', label: 'Google Finance (NSE stocks/ETFs, via Sheets)' },
  { value: 'CoinGecko', label: 'CoinGecko (crypto)' },
  { value: 'fixed', label: 'Fixed rate (compounds an assumed annual %, e.g. a real FD)' },
]

function daysSince(dateStr) {
  if (!dateStr) return Infinity
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

export default function AssetTrends() {
  const { files, updateFile, dataSource, addAlert, alerts, dismissAlert, dataLoading } = useApp()
  const assets = files['settings.json']?.assets || {}
  const trends = files['asset_trends.json']?.trends || {}
  const transactions = files['transactions.json']?.transactions || []
  const readOnly = dataSource !== 'mydata'

  // Picker scope: price-tracked assets only (auto or manual price-feed), plus FX and
  // benchmarks. Balance-snapshot assets (Cash/Account/Debt/Loan/Security Deposit) are
  // deliberately excluded here now - they're entered directly in Transactions, which
  // is the single place for them, per the last round's fix. Showing them here too
  // would just be confusing duplicate entry points for the same data.
  const pickerOptions = useMemo(() => {
    const heldOptions = Object.entries(assets)
      .filter(([, a]) => a.trackingMethod !== 'balance_snapshot')
      .map(([id, a]) => ({ id, name: a.name, source: a.source, symbol: a.symbol }))
    const fxOption = { id: FX_PSEUDO_ASSET.id, name: FX_PSEUDO_ASSET.name, source: FX_PSEUDO_ASSET.source, symbol: FX_PSEUDO_ASSET.symbol }
    const benchmarkOptions = BENCHMARKS.map((b) => ({ id: b.id, name: b.name, source: b.source, symbol: b.symbol, assumedAnnualRate: b.assumedAnnualRate }))
    return [...heldOptions, fxOption, ...benchmarkOptions]
  }, [assets])

  const [selectedId, setSelectedId] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10))
  const [manualValue, setManualValue] = useState('')
  const [manualError, setManualError] = useState(null)
  const [showManage, setShowManage] = useState(false)

  useEffect(() => {
    if (selectedId && !pickerOptions.some((o) => o.id === selectedId)) {
      setSelectedId('')
    }
  }, [pickerOptions, selectedId])

  const selected = pickerOptions.find((o) => o.id === selectedId)
  const series = trends[selectedId] || {}
  const fullChartData = Object.entries(series)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }))

  const [range, setRange] = useState('1Y')
  const RANGES = { '3M': 90, '1Y': 365, '3Y': 1095, '5Y': 1825, All: Infinity }
  const chartData = useMemo(() => {
    const days = RANGES[range]
    if (days === Infinity) return fullChartData
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    return fullChartData.filter((d) => d.date >= cutoffStr)
  }, [fullChartData, range])

  const lastActualDate = fullChartData.length ? fullChartData[fullChartData.length - 1].date : null
  const isStale = daysSince(lastActualDate) >= STALE_DAYS
  const alertForAsset = alerts.find((a) => a.assetId === selectedId)

  if (dataLoading) {
    return (
      <div>
        <h2>Asset Value Trends</h2>
        <p className="hint">Loading your data from Drive…</p>
      </div>
    )
  }

  async function handleRefresh() {
    if (readOnly || !selected) return
    setRefreshing(true)
    const firstTxn = transactions
      .filter((t) => t.assetId === selectedId)
      .map((t) => t.date)
      .sort()[0]

    const result = await refreshOne(selected, series, firstTxn)
    setRefreshing(false)

    if (!result.ok) {
      addAlert({ assetId: selectedId, type: 'sync_error', message: `${selected.name}: ${result.error}` })
      return
    }
    updateFile('asset_trends.json', (prev) => ({
      trends: { ...(prev?.trends || {}), [selectedId]: result.series },
    }))
    const existingAlert = alerts.find((a) => a.assetId === selectedId)
    if (existingAlert) dismissAlert(existingAlert.id)
  }

  function handleManualAdd(e) {
    e.preventDefault()
    setManualError(null)
    if (readOnly || !selectedId) return
    const dateProblem = validateDate(manualDate)
    if (dateProblem) {
      setManualError(dateProblem)
      return
    }
    if (manualValue === '' || Number.isNaN(parseFloat(manualValue))) {
      setManualError('Value is required and must be a number.')
      return
    }
    if (parseFloat(manualValue) <= 0) {
      setManualError('Value must be greater than zero — a price or rate can\'t be negative.')
      return
    }
    updateFile('asset_trends.json', (prev) => {
      const prevSeries = prev?.trends?.[selectedId] || {}
      return {
        trends: { ...(prev?.trends || {}), [selectedId]: { ...prevSeries, [manualDate]: parseFloat(manualValue) } },
      }
    })
    setManualValue('')
  }

  return (
    <div>
      <h2>{alerts.length > 0 && '⚠ '}Asset Value Trends</h2>

      <div className="picker-row">
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          <option value="" disabled>
            — Select an asset, FX rate, or benchmark —
          </option>
          {pickerOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <button onClick={handleRefresh} disabled={readOnly || refreshing || !selectedId}>
          {refreshing ? 'Refreshing…' : '🔄 Refresh'}
        </button>
      </div>

      {selectedId && (
        <>
          <div className="status-bar">
            <span>
              Last actual update: <strong>{lastActualDate || 'never'}</strong>
              {isStale && <span className="stale-badge"> ⚠ stale (15+ days)</span>}
            </span>
            <span>
              Symbol/code: <strong>{selected?.symbol || '(none)'}</strong> — edit this and
              all other asset settings in Manage Assets below.
            </span>
          </div>

          {alertForAsset && <div className="error-banner">⚠ {alertForAsset.message}</div>}

          <div className="chart-box">
            <div className="chip-row">
              {Object.keys(RANGES).map((r) => (
                <button key={r} className={r === range ? 'chip active' : 'chip'} onClick={() => setRange(r)}>
                  {r}
                </button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} minTickGap={40} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937' }} />
                <Line type="stepAfter" dataKey="value" stroke="#10b981" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            <p className="hint">
              Step line — flat segments are forward-filled, dots would be actual entries
              at higher zoom.
            </p>
          </div>

          <form className="txn-form" onSubmit={handleManualAdd}>
            <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
            <input
              type="number"
              step="any"
              placeholder="Value"
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
            />
            <button type="submit" disabled={readOnly}>
              + Add value manually
            </button>
          </form>
          {manualError && <div className="error-banner">⚠ {manualError}</div>}
        </>
      )}

      <p className="hint">
        LLM Paste &amp; Interpret and file upload for bulk/retrospective backfill land
        at M5 — manual single-date entry and Refresh only for now.
      </p>

      <button className="link-btn manage-toggle" onClick={() => setShowManage((s) => !s)}>
        {showManage ? '▾' : '▸'} Manage Assets {alerts.length > 0 && `(${alerts.length} alert${alerts.length > 1 ? 's' : ''})`}
      </button>

      {showManage && <ManageAssetsTable readOnly={readOnly} />}
    </div>
  )
}

// Consolidated per-asset settings: tracking method, source, symbol, liquidity tier,
// and status (from the alerts list) - one place instead of scattered across tabs.
// Saving an auto-tracked row actually test-fetches a small window to confirm the
// symbol+source combination works before clearing any existing alert.
function ManageAssetsTable({ readOnly }) {
  const { files, updateFile, alerts, addAlert, dismissAlert } = useApp()
  const assets = files['settings.json']?.assets || {}
  const trends = files['asset_trends.json']?.trends || {}

  const [search, setSearch] = useState('')
  const [drafts, setDrafts] = useState({}) // assetId -> partial edits pending save
  const [testing, setTesting] = useState(null) // assetId currently being test-fetched

  const rows = useMemo(() => {
    return Object.entries(assets)
      .filter(([, a]) => a.trackingMethod !== 'balance_snapshot')
      .map(([id, a]) => ({ id, ...a }))
      .filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [assets, search])

  function getDraft(id) {
    return drafts[id] || {}
  }

  function updateDraft(id, field, value) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  function effectiveValue(row, field) {
    const draft = getDraft(row.id)
    return field in draft ? draft[field] : row[field]
  }

  // Staleness applies to ANY price-tracked asset, manual or auto - manual ones (NPS,
  // EPFO, unlisted stocks) are exactly the most likely to go stale, and the previous
  // version only ever checked staleness when trackingMethod === 'auto', leaving every
  // manual asset permanently showing a blank "—" no matter how old its last entry was.
  function statusFor(row, trackingMethod) {
    if (testing === row.id) return { label: 'testing…', cls: 'stale-badge' }
    const alert = alerts.find((a) => a.assetId === row.id)
    if (alert) return { label: '⚠ error', cls: 'stale-badge', title: alert.message }

    const series = trends[row.id]
    if (!series || !Object.keys(series).length) {
      return trackingMethod === 'auto'
        ? { label: 'not yet connected', cls: 'stale-badge' }
        : { label: 'no entries yet', cls: 'stale-badge' }
    }
    const dates = Object.keys(series).sort()
    const lastDate = dates[dates.length - 1]
    const stale = Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000) >= STALE_DAYS
    if (stale) return { label: `⚠ stale (since ${lastDate})`, cls: 'stale-badge' }
    return trackingMethod === 'auto'
      ? { label: 'connected', cls: 'status-ok' }
      : { label: `up to date (${lastDate})`, cls: 'status-ok' }
  }

  function deleteAsset(row) {
    if (readOnly) return
    if (!window.confirm(`Delete "${row.name}"? This removes it from settings but keeps any existing transactions/values orphaned (they just won't show anywhere) - not a full data wipe.`)) return
    updateFile('settings.json', (prev) => {
      const next = { ...prev.assets }
      delete next[row.id]
      return { assets: next }
    })
    const existingAlert = alerts.find((a) => a.assetId === row.id)
    if (existingAlert) dismissAlert(existingAlert.id)
  }

  async function saveRow(row) {
    const trackingMethod = effectiveValue(row, 'trackingMethod')
    const source = effectiveValue(row, 'source')
    const symbol = effectiveValue(row, 'symbol')
    const liquidityTier = effectiveValue(row, 'liquidityTier')
    const assumedAnnualRate = effectiveValue(row, 'assumedAnnualRate')

    updateFile('settings.json', (prev) => ({
      assets: {
        ...prev.assets,
        [row.id]: { ...prev.assets[row.id], trackingMethod, source, symbol, liquidityTier, assumedAnnualRate },
      },
    }))

    const existingAlert = alerts.find((a) => a.assetId === row.id)

    if (trackingMethod === 'manual') {
      if (existingAlert) dismissAlert(existingAlert.id)
      setDrafts((prev) => ({ ...prev, [row.id]: undefined }))
      return
    }

    setTesting(row.id)
    const result = await refreshOne({ ...row, trackingMethod, source, symbol, assumedAnnualRate }, trends[row.id] || {}, undefined)
    setTesting(null)

    if (result.ok) {
      updateFile('asset_trends.json', (prev) => ({
        trends: { ...(prev?.trends || {}), [row.id]: result.series },
      }))
      if (existingAlert) dismissAlert(existingAlert.id)
    } else {
      addAlert({ assetId: row.id, type: 'sync_error', message: `${row.name}: ${result.error}` })
    }
    setDrafts((prev) => ({ ...prev, [row.id]: undefined }))
  }

  return (
    <div className="manage-table-wrap">
      <input
        className="manage-search"
        placeholder="Search assets…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <table className="data-table manage-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Tracking</th>
            <th>Source</th>
            <th>Symbol / rate</th>
            <th>Liquidity</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const dirty = !!drafts[row.id]
            const trackingMethod = effectiveValue(row, 'trackingMethod')
            const source = effectiveValue(row, 'source')
            const status = statusFor(row, trackingMethod)
            return (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.category}</td>
                <td>
                  <select
                    value={trackingMethod}
                    disabled={readOnly}
                    onChange={(e) => updateDraft(row.id, 'trackingMethod', e.target.value)}
                  >
                    <option value="manual">Manual</option>
                    <option value="auto">Auto</option>
                  </select>
                </td>
                <td>
                  {trackingMethod === 'auto' ? (
                    <select
                      value={source || ''}
                      disabled={readOnly}
                      onChange={(e) => updateDraft(row.id, 'source', e.target.value)}
                    >
                      <option value="" disabled>— pick —</option>
                      {SOURCES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  ) : '—'}
                </td>
                <td>
                  {trackingMethod === 'auto' && source === 'fixed' ? (
                    <input
                      className="manage-symbol-input"
                      type="number"
                      step="any"
                      placeholder="annual % e.g. 0.07"
                      value={effectiveValue(row, 'assumedAnnualRate') ?? ''}
                      disabled={readOnly}
                      onChange={(e) => updateDraft(row.id, 'assumedAnnualRate', parseFloat(e.target.value))}
                    />
                  ) : trackingMethod === 'auto' ? (
                    <input
                      className="manage-symbol-input"
                      value={effectiveValue(row, 'symbol') || ''}
                      disabled={readOnly}
                      onChange={(e) => updateDraft(row.id, 'symbol', e.target.value)}
                    />
                  ) : '—'}
                </td>
                <td>
                  <select
                    value={effectiveValue(row, 'liquidityTier') || ''}
                    disabled={readOnly}
                    onChange={(e) => updateDraft(row.id, 'liquidityTier', e.target.value)}
                  >
                    {LIQUIDITY_TIERS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <span className={status.cls} title={status.title}>{status.label}</span>
                </td>
                <td>
                  <button
                    className="link-btn"
                    disabled={readOnly || !dirty || testing === row.id}
                    onClick={() => saveRow(row)}
                  >
                    save
                  </button>
                  <button className="link-btn" disabled={readOnly} onClick={() => deleteAsset(row)}>
                    delete
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <AddAssetForm readOnly={readOnly} existingCategories={[...new Set(rows.map((r) => r.category))]} />
    </div>
  )
}

// New asset creation - addresses two things at once: the F&O request (named
// individual positions instead of one generic bucket) and the standing gap where
// the dropdown couldn't grow beyond the original 02b seed list. Only Manual and
// Balance-snapshot are offered here - Auto requires a working source+symbol, which
// is more naturally set up via this same table's row editor right after creation.
function AddAssetForm({ readOnly, existingCategories }) {
  const { updateFile } = useApp()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [baseCurrency, setBaseCurrency] = useState('INR')
  const [trackingMethod, setTrackingMethod] = useState('manual')
  const [liquidityTier, setLiquidityTier] = useState('Medium')
  const [error, setError] = useState(null)
  const [confirmation, setConfirmation] = useState(null)

  function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '_' + Math.random().toString(36).slice(2, 6)
  }

  function handleAdd(e) {
    e.preventDefault()
    setError(null)
    setConfirmation(null)
    if (readOnly) return
    const finalCategory = category === '__new__' ? newCategory.trim() : category
    if (!name.trim()) return setError('Name is required.')
    if (!finalCategory) return setError('Category is required.')

    const id = slugify(name)
    updateFile('settings.json', (prev) => ({
      assets: {
        ...prev.assets,
        [id]: {
          name: name.trim(),
          category: finalCategory,
          baseCurrency,
          trackingMethod,
          source: null,
          symbol: '',
          liquidityTier: trackingMethod === 'balance_snapshot' ? null : liquidityTier,
          isLiability: finalCategory === 'Debt' || finalCategory === 'Loan',
        },
      },
    }))
    setConfirmation(`Added "${name.trim()}" — it'll now show up in every dropdown.`)
    setName('')
  }

  return (
    <div className="add-asset-box">
      <h4>Add a new asset</h4>
      <form className="txn-form" onSubmit={handleAdd}>
        <input placeholder="Name (e.g. NIFTY 24000 CE Jan)" value={name} onChange={(e) => setName(e.target.value)} disabled={readOnly} />
        <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={readOnly}>
          <option value="">— category —</option>
          {existingCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          <option value="__new__">+ New category…</option>
        </select>
        {category === '__new__' && (
          <input placeholder="New category name" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} disabled={readOnly} />
        )}
        <select value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value)} disabled={readOnly}>
          <option value="INR">INR</option>
          <option value="USD">USD</option>
        </select>
        <select value={trackingMethod} onChange={(e) => setTrackingMethod(e.target.value)} disabled={readOnly}>
          <option value="manual">Manual (price-tracked)</option>
          <option value="balance_snapshot">Balance-snapshot (no units)</option>
        </select>
        {trackingMethod !== 'balance_snapshot' && (
          <select value={liquidityTier} onChange={(e) => setLiquidityTier(e.target.value)} disabled={readOnly}>
            {LIQUIDITY_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <button type="submit" disabled={readOnly}>+ Add asset</button>
      </form>
      {error && <div className="error-banner">⚠ {error}</div>}
      {confirmation && <div className="confirm-banner">✓ {confirmation}</div>}
      <p className="hint">
        Auto-tracking a new asset: add it here as Manual first, then switch it to
        Auto and fill in source/symbol in the row above once it exists.
      </p>
    </div>
  )
}
