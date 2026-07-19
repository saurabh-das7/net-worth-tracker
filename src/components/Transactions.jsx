import { useState, useMemo, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'

const EMPTY = '' // placeholder value for "nothing selected yet"

export default function Transactions() {
  const { files, updateFile, dataSource, dataLoading } = useApp()
  const assets = files['settings.json']?.assets || {}
  const transactions = files['transactions.json']?.transactions || []
  const trends = files['asset_trends.json']?.trends || {}

  // Every asset is selectable here now - price-tracked ones get the full buy/sell
  // form, balance-snapshot ones (Cash/Account/Debt/Loan/Security Deposit) get a
  // simpler date+amount form instead. This pulls forward the piece of Asset Trends
  // (M3) needed to record a bank/card balance, since waiting for that tab to exist
  // just to enter "HDFC Savings = 150000" was a real gap.
  const allAssets = useMemo(
    () => Object.entries(assets).map(([id, a]) => ({ id, ...a })).sort((a, b) => a.name.localeCompare(b.name)),
    [assets],
  )

  const [assetId, setAssetId] = useState(EMPTY)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [type, setType] = useState('buy')
  const [units, setUnits] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [error, setError] = useState(null)
  const [confirmation, setConfirmation] = useState(null)

  // If the currently-selected asset disappears from the list (e.g. switching data
  // source), fall back to nothing-selected rather than silently pointing at a stale
  // or wrong asset - forces a deliberate re-selection instead of guessing.
  useEffect(() => {
    if (assetId && !allAssets.some((a) => a.id === assetId)) {
      setAssetId(EMPTY)
    }
  }, [allAssets, assetId])

  const selected = allAssets.find((a) => a.id === assetId)
  const isBalanceSnapshot = selected?.trackingMethod === 'balance_snapshot'
  const readOnly = dataSource !== 'mydata'

  function resetFeedback() {
    setError(null)
    setConfirmation(null)
  }

  function validate() {
    if (!assetId) return 'Select a holding first.'
    if (!date) return 'Date is required.'
    const amt = parseFloat(amount)
    if (amount === '' || Number.isNaN(amt)) return 'Amount is required and must be a number.'
    if (!isBalanceSnapshot) {
      const u = parseFloat(units)
      if (units === '' || Number.isNaN(u)) return 'Units is required and must be a number for this holding type.'
      if (u <= 0) return 'Units must be greater than zero.'
    }
    return null
  }

  function handleSubmit(e) {
    e.preventDefault()
    resetFeedback()
    if (readOnly) return

    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }

    if (isBalanceSnapshot) {
      updateFile('asset_trends.json', (prev) => {
        const prevTrends = prev?.trends || {}
        const prevSeries = prevTrends[assetId] || {}
        return { trends: { ...prevTrends, [assetId]: { ...prevSeries, [date]: parseFloat(amount) } } }
      })
      setConfirmation(`Recorded ${selected.name} balance of ${amount} on ${date}.`)
    } else {
      const t = {
        id: crypto.randomUUID(),
        date,
        assetId,
        type,
        units: parseFloat(units),
        amount: parseFloat(amount),
        currency,
      }
      updateFile('transactions.json', (prev) => ({
        transactions: [...(prev?.transactions || []), t],
      }))
      setConfirmation(`Added ${type} of ${selected.name} — ${units} units for ${amount} ${currency}.`)
    }
    setUnits('')
    setAmount('')
  }

  function deleteTransaction(id) {
    if (readOnly) return
    updateFile('transactions.json', (prev) => ({
      transactions: (prev?.transactions || []).filter((t) => t.id !== id),
    }))
  }

  const sortedTxns = [...transactions].sort((a, b) => b.date.localeCompare(a.date))

  // Recent balance-snapshot entries, flattened across all balance-type assets, for
  // visible confirmation that an HDFC/Debt entry actually got recorded - these live
  // in asset_trends.json, a different file from buy/sell transactions, so they don't
  // belong in the same table below.
  const recentBalanceEntries = useMemo(() => {
    const rows = []
    for (const a of allAssets) {
      if (a.trackingMethod !== 'balance_snapshot') continue
      const series = trends[a.id] || {}
      for (const [d, v] of Object.entries(series)) {
        rows.push({ assetName: a.name, date: d, value: v })
      }
    }
    return rows.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)
  }, [allAssets, trends])

  if (dataLoading) {
    return (
      <div>
        <h2>Transactions</h2>
        <p className="hint">Loading your data from Drive…</p>
      </div>
    )
  }

  return (
    <div>
      <h2>Transactions</h2>
      <p className="hint">
        LLM Paste &amp; Interpret lands at M5 — manual entry only for now.
        {readOnly && ' Switch to My Data to add entries (Demo is read-only).'}
      </p>

      <form className="txn-form" onSubmit={handleSubmit}>
        <select
          value={assetId}
          onChange={(e) => {
            setAssetId(e.target.value)
            resetFeedback()
          }}
        >
          <option value={EMPTY} disabled>
            — Select a holding —
          </option>
          {allAssets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.trackingMethod === 'balance_snapshot' ? `${a.name} (balance)` : a.name}
            </option>
          ))}
        </select>

        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        {!isBalanceSnapshot && (
          <>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
            <input
              type="number"
              step="any"
              placeholder="Units"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
            />
          </>
        )}

        <input
          type="number"
          step="any"
          placeholder={isBalanceSnapshot ? 'Balance amount' : 'Amount'}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        {!isBalanceSnapshot && (
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="INR">INR</option>
            <option value="USD">USD</option>
          </select>
        )}

        <button type="submit" disabled={readOnly || !assetId}>
          Add
        </button>
      </form>

      {error && <div className="error-banner">⚠ {error}</div>}
      {confirmation && <div className="confirm-banner">✓ {confirmation}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Holding</th>
            <th>Type</th>
            <th>Units</th>
            <th>Amount</th>
            <th>Ccy</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sortedTxns.map((t) => (
            <tr key={t.id}>
              <td>{t.date}</td>
              <td>{assets[t.assetId]?.name || `(unknown: ${t.assetId})`}</td>
              <td>{t.type}</td>
              <td>{t.units}</td>
              <td>{t.amount}</td>
              <td>{t.currency}</td>
              <td>
                {!readOnly && (
                  <button className="link-btn" onClick={() => deleteTransaction(t.id)}>
                    delete
                  </button>
                )}
              </td>
            </tr>
          ))}
          {!sortedTxns.length && (
            <tr>
              <td colSpan={7} className="empty">
                No buy/sell transactions yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {recentBalanceEntries.length > 0 && (
        <>
          <h3 className="sub-heading">Recent balance updates</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Holding</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {recentBalanceEntries.map((r, i) => (
                <tr key={i}>
                  <td>{r.date}</td>
                  <td>{r.assetName}</td>
                  <td>{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
