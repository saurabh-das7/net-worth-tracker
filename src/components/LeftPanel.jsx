import { useApp } from '../context/AppContext.jsx'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'holdings', label: 'Holdings' },
  { id: 'assetTrends', label: 'Asset Trends' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'trends', label: 'Trends' },
  { id: 'simulate', label: 'Simulate' },
  { id: 'benchmark', label: 'Benchmark' },
]

export default function LeftPanel({ activeTab, onTabChange }) {
  const {
    dataSource,
    setDataSource,
    currency,
    setCurrency,
    theme,
    setTheme,
    signedIn,
    connectMyData,
    disconnectMyData,
    syncStatus,
    syncNow,
    alerts,
    mockMode,
    twelveDataMocked,
  } = useApp()

  const activeAlerts = alerts.length

  return (
    <nav className="left-panel">
      <div className="brand">Net Worth Tracker</div>

      {mockMode && <div className="mock-badge">Mock Drive mode — no real Client ID set</div>}
      {twelveDataMocked && (
        <div className="mock-badge">
          Mock price data — VITE_TWELVE_DATA_API_KEY not seen by the build. Check it's
          a Repository secret (not Environment) with the exact name.
        </div>
      )}

      <ul className="tabs">
        {TABS.map((t) => (
          <li key={t.id}>
            <button
              className={t.id === activeTab ? 'tab active' : 'tab'}
              onClick={() => onTabChange(t.id)}
            >
              {t.label}
              {t.id === 'assetTrends' && activeAlerts > 0 && (
                <span className="alert-badge">{activeAlerts}</span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <div className="panel-section">
        <div className="toggle-row">
          <button
            className={currency === 'INR' ? 'toggle active' : 'toggle'}
            onClick={() => setCurrency('INR')}
          >
            INR
          </button>
          <button
            className={currency === 'USD' ? 'toggle active' : 'toggle'}
            onClick={() => setCurrency('USD')}
          >
            USD
          </button>
        </div>
        <div className="toggle-row">
          <button
            className={dataSource === 'demo' ? 'toggle active' : 'toggle'}
            onClick={() => setDataSource('demo')}
          >
            Demo
          </button>
          <button
            className={dataSource === 'mydata' ? 'toggle active' : 'toggle'}
            onClick={signedIn ? () => setDataSource('mydata') : connectMyData}
          >
            My Data
          </button>
        </div>
        {dataSource === 'mydata' && signedIn && (
          <button className="link-btn" onClick={disconnectMyData}>
            Disconnect
          </button>
        )}
      </div>

      <div className="panel-section">
        <button className="action-btn" disabled title="Refresh wires up at M3">
          🔄 Refresh
        </button>
        <button
          className="action-btn"
          onClick={() => syncNow()}
          disabled={dataSource !== 'mydata'}
        >
          ⇅ Sync
        </button>
        <div className="sync-status">
          {syncStatus.unsynced > 0
            ? `${syncStatus.unsynced} unsynced change(s)`
            : 'All changes synced'}
        </div>
      </div>

      <div className="panel-section">
        <button className="action-btn" disabled title="Settings UI comes with M2 asset master">
          ⚙ Settings
        </button>
        <button
          className="action-btn"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div>
    </nav>
  )
}
