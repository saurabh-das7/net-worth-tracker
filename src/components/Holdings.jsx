import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { computeHoldings, totalNetWorth } from '../lib/holdings.js'

const CATEGORY_ALL = 'All'

export default function Holdings() {
  const { files, currency } = useApp()
  const [categoryFilter, setCategoryFilter] = useState(CATEGORY_ALL)

  const holdings = useMemo(
    () =>
      computeHoldings(
        files['settings.json'],
        files['transactions.json'],
        files['asset_trends.json'],
      ),
    [files],
  )

  const categories = useMemo(
    () => [CATEGORY_ALL, ...new Set(holdings.map((h) => h.category))],
    [holdings],
  )

  const filtered =
    categoryFilter === CATEGORY_ALL
      ? holdings
      : holdings.filter((h) => h.category === categoryFilter)

  const netWorth = totalNetWorth(holdings)

  return (
    <div>
      <h2>Holdings</h2>
      <p className="hint">
        Values shown in each asset's base currency for now — cross-currency conversion
        and FX-aware totals land at M4.
      </p>

      <div className="chip-row">
        {categories.map((c) => (
          <button
            key={c}
            className={c === categoryFilter ? 'chip active' : 'chip'}
            onClick={() => setCategoryFilter(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Units</th>
            <th>Value</th>
            <th>Invested</th>
            <th>Gain</th>
            <th>Liquidity</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((h) => (
            <tr key={h.assetId} className={h.isLiability ? 'liability-row' : ''}>
              <td>{h.name}</td>
              <td>{h.category}</td>
              <td>{h.units === null ? '—' : h.units.toFixed(4)}</td>
              <td>
                {h.baseCurrency} {h.currentValue.toLocaleString()}
              </td>
              <td>{h.invested === null ? '—' : h.invested.toLocaleString()}</td>
              <td>{h.unrealizedGain === null ? '—' : h.unrealizedGain.toLocaleString()}</td>
              <td>{h.isLiability ? '—' : h.liquidityTier}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="net-worth-strip">
        Approx. net worth (unconverted base-currency sum, {currency} display pending M4):{' '}
        <strong>{netWorth.toLocaleString()}</strong>
      </div>
    </div>
  )
}
