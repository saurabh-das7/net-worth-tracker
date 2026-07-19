import { useState, useMemo, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { validateDate } from '../lib/dateValidation.js'

const EMPTY = ''
const PAGE_SIZE = 20
const ALL = 'All'

export default function Transactions() {
  const { files, updateFile, dataSource, dataLoading } = useApp()
  const assets = files['settings.json']?.assets || {}
  const transactions = files['transactions.json']?.transactions || []
  const trends = files['asset_trends.json']?.trends || {}
  const readOnly = dataSource !== 'mydata'

  const allAssets = useMemo(
    () => Object.entries(assets).map(([id, a]) => ({ id, ...a })).sort((a, b) => a.name.localeCompare(b.name)),
    [assets],
  )

  // --- Add form -------------------------------------------------------------
  const [assetId, setAssetId] = useState(EMPTY)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [type, setType] = useState('buy')
  const [units, setUnits] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [error, setError] = useState(null)
  const [confirmation, setConfirmation] = useState(null)

  useEffect(() => {
    if (assetId && !allAssets.some((a) => a.id === assetId)) setAssetId(EMPTY)
  }, [allAssets, assetId])

  const selected = allAssets.find((a) => a.id === assetId)
  const isBalanceSnapshot = selected?.trackingMethod === 'balance_snapshot'

  function resetFeedback() {
    setError(null)
    setConfirmation(null)
  }

  function validate() {
    if (!assetId) return 'Select a holding first.'
    const dateProblem = validateDate(date)
    if (dateProblem) return dateProblem
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
      const t = { id: crypto.randomUUID(), date, assetId, type, units: parseFloat(units), amount: parseFloat(amount), currency }
      updateFile('transactions.json', (prev) => ({ transactions: [...(prev?.transactions || []), t] }))
      setConfirmation(`Added ${type} of ${selected.name} — ${units} units for ${amount} ${currency}.`)
    }
    setUnits('')
    setAmount('')
    setSortField('date')
    setSortDir('desc')
    setPage(1)
  }

  // --- Combined rows: buy/sell transactions + balance-snapshot updates ------
  // Merged into one table per request, tagged by rowType since edit/delete behave
  // differently (transactions live in transactions.json, balance updates are dated
  // entries inside asset_trends.json for that asset).
  const combinedRows = useMemo(() => {
    const txnRows = transactions.map((t) => ({
      rowId: t.id,
      rowType: 'transaction',
      date: t.date,
      assetId: t.assetId,
      holding: assets[t.assetId]?.name || `(unknown: ${t.assetId})`,
      category: assets[t.assetId]?.category || '—',
      type: t.type,
      units: t.units,
      amount: t.amount,
      currency: t.currency,
    }))
    const balanceRows = []
    for (const a of allAssets) {
      if (a.trackingMethod !== 'balance_snapshot') continue
      const series = trends[a.id] || {}
      for (const [d, v] of Object.entries(series)) {
        balanceRows.push({
          rowId: `${a.id}__${d}`,
          rowType: 'balance',
          date: d,
          assetId: a.id,
          holding: a.name,
          category: a.category,
          type: 'balance',
          units: null,
          amount: v,
          currency: a.baseCurrency,
        })
      }
    }
    return [...txnRows, ...balanceRows]
  }, [transactions, allAssets, assets, trends])

  // --- Filters ---------------------------------------------------------------
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [holdingFilter, setHoldingFilter] = useState(ALL)
  const [categoryFilter, setCategoryFilter] = useState(ALL)
  const [typeFilter, setTypeFilter] = useState(ALL)
  const [currencyFilter, setCurrencyFilter] = useState(ALL)

  const categories = useMemo(() => [ALL, ...new Set(allAssets.map((a) => a.category))], [allAssets])

  const filteredRows = useMemo(() => {
    return combinedRows.filter((r) => {
      if (dateFrom && r.date < dateFrom) return false
      if (dateTo && r.date > dateTo) return false
      if (holdingFilter !== ALL && r.assetId !== holdingFilter) return false
      if (categoryFilter !== ALL && r.category !== categoryFilter) return false
      if (typeFilter !== ALL && r.type !== typeFilter) return false
      if (currencyFilter !== ALL && r.currency !== currencyFilter) return false
      return true
    })
  }, [combinedRows, dateFrom, dateTo, holdingFilter, categoryFilter, typeFilter, currencyFilter])

  // --- Sort --------------------------------------------------------------
  const [sortField, setSortField] = useState('date')
  const [sortDir, setSortDir] = useState('desc')

  function toggleSort(field) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
    setPage(1)
  }

  const sortedRows = useMemo(() => {
    const rows = [...filteredRows]
    rows.sort((a, b) => {
      let av = a[sortField]
      let bv = b[sortField]
      if (av === null || av === undefined) av = -Infinity
      if (bv === null || bv === undefined) bv = -Infinity
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return rows
  }, [filteredRows, sortField, sortDir])

  // --- Pagination --------------------------------------------------------
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE))
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [totalPages, page])
  const pageRows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // --- Edit ----------------------------------------------------------------
  const [editingRowId, setEditingRowId] = useState(null)
  const [editDraft, setEditDraft] = useState({})
  const [editError, setEditError] = useState(null)

  function startEdit(row) {
    setEditingRowId(row.rowId)
    setEditDraft({ date: row.date, type: row.type, units: row.units ?? '', amount: row.amount, currency: row.currency })
    setEditError(null)
  }

  function cancelEdit() {
    setEditingRowId(null)
    setEditError(null)
  }

  function saveEdit(row) {
    const dateProblem = validateDate(editDraft.date)
    if (dateProblem) {
      setEditError(dateProblem)
      return
    }
    const amt = parseFloat(editDraft.amount)
    if (editDraft.amount === '' || Number.isNaN(amt)) {
      setEditError('Amount is required and must be a number.')
      return
    }

    if (row.rowType === 'balance') {
      updateFile('asset_trends.json', (prev) => {
        const prevTrends = prev?.trends || {}
        const series = { ...(prevTrends[row.assetId] || {}) }
        delete series[row.date] // date may have changed
        series[editDraft.date] = amt
        return { trends: { ...prevTrends, [row.assetId]: series } }
      })
    } else {
      const u = parseFloat(editDraft.units)
      if (editDraft.units === '' || Number.isNaN(u) || u <= 0) {
        setEditError('Units is required and must be a positive number.')
        return
      }
      updateFile('transactions.json', (prev) => ({
        transactions: (prev?.transactions || []).map((t) =>
          t.id === row.rowId
            ? { ...t, date: editDraft.date, type: editDraft.type, units: u, amount: amt, currency: editDraft.currency }
            : t,
        ),
      }))
    }
    setEditingRowId(null)
  }

  function deleteRow(row) {
    if (readOnly) return
    if (row.rowType === 'balance') {
      updateFile('asset_trends.json', (prev) => {
        const prevTrends = prev?.trends || {}
        const series = { ...(prevTrends[row.assetId] || {}) }
        delete series[row.date]
        return { trends: { ...prevTrends, [row.assetId]: series } }
      })
    } else {
      updateFile('transactions.json', (prev) => ({
        transactions: (prev?.transactions || []).filter((t) => t.id !== row.rowId),
      }))
    }
  }

  if (dataLoading) {
    return (
      <div>
        <h2>Transactions</h2>
        <p className="hint">Loading your data from Drive…</p>
      </div>
    )
  }

  const sortArrow = (field) => (sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '')

  return (
    <div>
      <h2>Transactions</h2>
      <p className="hint">
        LLM Paste &amp; Interpret lands at M5 — manual entry only for now.
        {readOnly && ' Switch to My Data to add entries (Demo is read-only).'}
      </p>

      <form className="txn-form" onSubmit={handleSubmit}>
        <select value={assetId} onChange={(e) => { setAssetId(e.target.value); resetFeedback() }}>
          <option value={EMPTY} disabled>— Select a holding —</option>
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
            <input type="number" step="any" placeholder="Units" value={units} onChange={(e) => setUnits(e.target.value)} />
          </>
        )}

        <input
          type="number"
          step="any"
          placeholder={isBalanceSnapshot ? `Balance amount (${selected.baseCurrency})` : 'Amount'}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        {!isBalanceSnapshot && (
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="INR">INR</option>
            <option value="USD">USD</option>
          </select>
        )}

        <button type="submit" disabled={readOnly || !assetId}>Add</button>
      </form>

      {error && <div className="error-banner">⚠ {error}</div>}
      {confirmation && <div className="confirm-banner">✓ {confirmation}</div>}

      <div className="filter-row">
        <label>From <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} /></label>
        <label>To <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} /></label>
        <select value={holdingFilter} onChange={(e) => { setHoldingFilter(e.target.value); setPage(1) }}>
          <option value={ALL}>All holdings</option>
          {allAssets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}>
          {categories.map((c) => <option key={c} value={c}>{c === ALL ? 'All categories' : c}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}>
          <option value={ALL}>All types</option>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
          <option value="balance">Balance</option>
        </select>
        <select value={currencyFilter} onChange={(e) => { setCurrencyFilter(e.target.value); setPage(1) }}>
          <option value={ALL}>All currencies</option>
          <option value="INR">INR</option>
          <option value="USD">USD</option>
        </select>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th className="sortable" onClick={() => toggleSort('date')}>Date{sortArrow('date')}</th>
            <th className="sortable" onClick={() => toggleSort('holding')}>Holding{sortArrow('holding')}</th>
            <th className="sortable" onClick={() => toggleSort('category')}>Category{sortArrow('category')}</th>
            <th className="sortable" onClick={() => toggleSort('type')}>Type{sortArrow('type')}</th>
            <th className="sortable" onClick={() => toggleSort('units')}>Units{sortArrow('units')}</th>
            <th className="sortable" onClick={() => toggleSort('amount')}>Amount{sortArrow('amount')}</th>
            <th className="sortable" onClick={() => toggleSort('currency')}>Ccy{sortArrow('currency')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((r) => {
            const isEditing = editingRowId === r.rowId
            if (isEditing) {
              return (
                <tr key={r.rowId}>
                  <td><input type="date" value={editDraft.date} onChange={(e) => setEditDraft({ ...editDraft, date: e.target.value })} /></td>
                  <td>{r.holding}</td>
                  <td>{r.category}</td>
                  <td>
                    {r.rowType === 'balance' ? 'balance' : (
                      <select value={editDraft.type} onChange={(e) => setEditDraft({ ...editDraft, type: e.target.value })}>
                        <option value="buy">buy</option>
                        <option value="sell">sell</option>
                      </select>
                    )}
                  </td>
                  <td>
                    {r.rowType === 'balance' ? '—' : (
                      <input type="number" step="any" value={editDraft.units} onChange={(e) => setEditDraft({ ...editDraft, units: e.target.value })} />
                    )}
                  </td>
                  <td><input type="number" step="any" value={editDraft.amount} onChange={(e) => setEditDraft({ ...editDraft, amount: e.target.value })} /></td>
                  <td>{r.currency}</td>
                  <td className="row-actions">
                    <button className="link-btn" onClick={() => saveEdit(r)}>save</button>
                    <button className="link-btn" onClick={cancelEdit}>cancel</button>
                  </td>
                </tr>
              )
            }
            return (
              <tr key={r.rowId}>
                <td>{r.date}</td>
                <td>{r.holding}</td>
                <td>{r.category}</td>
                <td>{r.type}</td>
                <td>{r.units === null ? '—' : r.units}</td>
                <td>{r.amount}</td>
                <td>{r.currency}</td>
                <td className="row-actions">
                  {!readOnly && (
                    <>
                      <button className="link-btn" onClick={() => startEdit(r)}>edit</button>
                      <button className="link-btn" onClick={() => deleteRow(r)}>delete</button>
                    </>
                  )}
                </td>
              </tr>
            )
          })}
          {!pageRows.length && (
            <tr><td colSpan={8} className="empty">No entries match the current filters.</td></tr>
          )}
        </tbody>
      </table>
      {editError && <div className="error-banner">⚠ {editError}</div>}

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span>Page {page} of {totalPages} ({sortedRows.length} entries)</span>
          <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  )
}
