import { useState } from 'react'
import { AppProvider } from './context/AppContext.jsx'
import LeftPanel from './components/LeftPanel.jsx'
import Dashboard from './components/Dashboard.jsx'
import Holdings from './components/Holdings.jsx'
import AssetTrends from './components/AssetTrends.jsx'
import Transactions from './components/Transactions.jsx'
import Trends from './components/Trends.jsx'
import Simulate from './components/Simulate.jsx'
import Benchmark from './components/Benchmark.jsx'

const TAB_COMPONENTS = {
  dashboard: Dashboard,
  holdings: Holdings,
  assetTrends: AssetTrends,
  transactions: Transactions,
  trends: Trends,
  simulate: Simulate,
  benchmark: Benchmark,
}

function Shell() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const TabComponent = TAB_COMPONENTS[activeTab]

  return (
    <div className="shell">
      <LeftPanel activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="content">
        <TabComponent />
      </main>
    </div>
  )
}

function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}

export default App

