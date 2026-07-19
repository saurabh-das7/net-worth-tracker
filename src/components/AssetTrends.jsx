import { useState, useMemo, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import { useApp } from '../context/AppContext.jsx'
import { BENCHMARKS, FX_PSEUDO_ASSET } from '../data/assetMaster.js'
import { refreshOne } from '../lib/refresh.js'

const STALE_DAYS = 15

function daysSince(dateStr) {
  if (!dateStr) return Infinity
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

export default function AssetTrends() {
  const { files, updateFile, dataSource, addAlert, alerts, dismissAlert, dataLoading } = useApp()
  const assets = files['settings.json']?.assets || {}
  const trends = files['asset_trends.json']?.trends || {}
  const transactions = files['transactions.json']?.transactions || []

  // Picker includes held assets, the FX pseudo-asset, and the four benchmarks — all
  // using the same trend/edit/backfill machinery, per the PRD.
  //
  // IMPORTANT: use Object.entries (the map KEY) for id, not a.id. Demo's dataset
  // happens to redundantly store `id` inside each asset value too, which is why this
  // worked in Demo but silently broke in My Data - buildInitialSettings() correctly
  // does NOT duplicate id inside the value (it's already the object key), so a.id was
  // undefined there, making every <option value> collapse to the same empty string.
  const pickerOptions = useMemo(() => {
    const heldOptions = Object.entries(assets).map(([id, a]) => ({ id, name: a.name, source: a.source, symbol: a.symbol }))
    const fxOption = { id: FX_PSEUDO_ASSET.id, name: FX_PSEUDO_ASSET.name, source: FX_PSEUDO_ASSET.source, symbol: FX_PSEUDO_ASSET.symbol }
    const benchmarkOptions = BENCHMARKS.map((b) => ({ id: b.id, name: b.name, source: b.source, symbol: b.symbol, assumedAnnualRate: b.assumedAnnualRate }))
    return [...heldOptions, fxOption, ...benchmarkOptions]
  }, [assets])

  const [selectedId, setSelectedId] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [symbolDraft, setSymbolDraft] = useState('')
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10))
  const [manualValue, setManualValue] = useState('')

  // Same lesson as Transactions.jsx: never silently keep a stale selection when the
  // underlying list changes (e.g. Demo <-> My Data switch) - reset and force a
  // deliberate re-pick rather than risk pointing at the wrong asset.
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
  const readOnly = dataSource !== 'mydata'

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
      addAlert({
        assetId: selectedId,
        type: 'sync_error',
        message: `${selected.name}: ${result.error}`,
      })
      return
    }
    updateFile('asset_trends.json', (prev) => ({
      trends: { ...(prev?.trends || {}), [selectedId]: result.series },
    }))
  }

  function handleManualAdd(e) {
    e.preventDefault()
    if (readOnly || !manualValue || !selectedId) return
    updateFile('asset_trends.json', (prev) => {
      const prevSeries = prev?.trends?.[selectedId] || {}
      return {
        trends: {
          ...(prev?.trends || {}),
          [selectedId]: { ...prevSeries, [manualDate]: parseFloat(manualValue) },
        },
      }
    })
    setManualValue('')
  }

  function saveSymbol() {
    if (readOnly || !symbolDraft) return
    if (!assets[selectedId]) {
      // Benchmarks and the FX pseudo-asset aren't stored in settings.assets - their
      // symbols come from static config (assetMaster.js), not per-user settings.
      // Correcting one of those isn't wired up yet - flagged honestly rather than
      // silently writing a bogus entry into settings that nothing would ever read.
      addAlert({
        assetId: selectedId,
        type: 'sync_error',
        message: `${selected?.name}: symbol correction for benchmarks/FX isn't supported yet - only held assets.`,
      })
      return
    }
    updateFile('settings.json', (prev) => ({
      assets: {
        ...prev.assets,
        [selectedId]: { ...prev.assets[selectedId], symbol: symbolDraft },
      },
    }))
    if (alertForAsset) dismissAlert(alertForAsset.id)
    setSymbolDraft('')
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

      <div className="status-bar">
        <span>
          Last actual update: <strong>{lastActualDate || 'never'}</strong>
          {isStale && <span className="stale-badge"> ⚠ stale (15+ days)</span>}
        </span>
        <span>
          Symbol/code: <strong>{selected?.symbol || '(none)'}</strong>
        </span>
        {/* Was checking assets[selectedId]?.source, which only resolves for held
            assets - benchmarks and the FX pseudo-asset aren't in the assets map at
            all, so their TwelveData-sourced entries (Nasdaq/QQQ proxy, USD/INR) never
            showed the symbol-edit field even though they legitimately need it too.
            'selected' is already uniformly resolved across all three types. */}
        {selected?.source === 'TwelveData' ? (
          <span className="edit-symbol">
            <input
              placeholder="correct symbol…"
              value={symbolDraft}
              onChange={(e) => setSymbolDraft(e.target.value)}
              disabled={readOnly}
            />
            <button onClick={saveSymbol} disabled={readOnly}>
              save
            </button>
          </span>
        ) : null}
      </div>

      {alertForAsset && <div className="error-banner">⚠ {alertForAsset.message}</div>}

      <div className="chart-box">
        <div className="chip-row">
          {Object.keys(RANGES).map((r) => (
            <button
              key={r}
              className={r === range ? 'chip active' : 'chip'}
              onClick={() => setRange(r)}
            >
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
          Step line — flat segments are forward-filled (weekend gaps or genuinely stale
          manual entries), dots would be actual entries at higher zoom.
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
        <button type="submit" disabled={readOnly || !selectedId}>
          + Add value manually
        </button>
      </form>

      <p className="hint">
        LLM Paste &amp; Interpret and file upload for bulk/retrospective backfill land
        at M5 — manual single-date entry and Refresh only for now.
      </p>
    </div>
  )
}
