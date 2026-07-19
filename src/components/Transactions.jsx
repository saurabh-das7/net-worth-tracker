import { useState, useMemo, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'

export default function Transactions() {
  const { files, updateFile, dataSource } = useApp()
  const assets = files['settings.json']?.assets || {}
  const transactions = files['transactions.json']?.transactions || []

  const priceAssets = useMemo(
    () => Object.values(assets).filter((a) => a.trackingMethod !== 'balance_snapshot'),
    [assets],
  )

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    assetId: priceAssets[0]?.id || '',
    type: 'buy',
    units: '',
    amount: '',
    currency: 'INR',
  })

  const readOnly = dataSource !== 'mydata'

  // priceAssets can change out from under this component - switching Demo <-> My Data
  // swaps the entire asset list. Without this, the dropdown's value can point at an
  // asset that no longer exists in the current list, which renders as an unusable
  // blank <select> even though the underlying state still holds a stale id.
  useEffect(() => {
    const stillValid = priceAssets.some((a) => a.id === form.assetId)
    if (!stillValid && priceAssets.length) {
      setForm((f) => ({ ...f, assetId: priceAssets[0].id }))
    }
  }, [priceAssets])

  function addTransaction(e) {
    e.preventDefault()
    if (readOnly) return
    const t = {
      id: crypto.randomUUID(),
      date: form.date,
      assetId: form.assetId,
      type: form.type,
      units: parseFloat(form.units),
      amount: parseFloat(form.amount),
      currency: form.currency,
    }
    updateFile('transactions.json', (prev) => ({
      transactions: [...(prev?.transactions || []), t],
    }))
    setForm((f) => ({ ...f, units: '', amount: '' }))
  }

  function deleteTransaction(id) {
    if (readOnly) return
    updateFile('transactions.json', (prev) => ({
      transactions: (prev?.transactions || []).filter((t) => t.id !== id),
    }))
  }

  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div>
      <h2>Transactions</h2>
      <p className="hint">
        LLM Paste &amp; Interpret lands at M5 — manual entry only for now.
        {readOnly && ' Switch to My Data to add transactions (Demo is read-only).'}
      </p>

      <form className="txn-form" onSubmit={addTransaction}>
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
        <select
          value={form.assetId}
          onChange={(e) => setForm({ ...form, assetId: e.target.value })}
        >
          {priceAssets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
        <input
          type="number"
          step="any"
          placeholder="Units"
          value={form.units}
          onChange={(e) => setForm({ ...form, units: e.target.value })}
        />
        <input
          type="number"
          step="any"
          placeholder="Amount"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
        <select
          value={form.currency}
          onChange={(e) => setForm({ ...form, currency: e.target.value })}
        >
          <option value="INR">INR</option>
          <option value="USD">USD</option>
        </select>
        <button type="submit" disabled={readOnly}>
          Add
        </button>
      </form>

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
          {sorted.map((t) => (
            <tr key={t.id}>
              <td>{t.date}</td>
              <td>{assets[t.assetId]?.name || t.assetId}</td>
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
          {!sorted.length && (
            <tr>
              <td colSpan={7} className="empty">
                No transactions yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
