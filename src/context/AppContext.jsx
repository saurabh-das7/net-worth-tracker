// Global app state — demo/My Data mode, currency toggle, loaded data files, sync
// status, alerts. Context + hooks is sufficient at this app's scale (see Tech Stack
// doc "State management").
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { bufferRead } from '../lib/db.js'
import { commitChange, syncNow, pullFromDrive, onSyncStatusChange } from '../lib/sync.js'
import { signIn, signOut, isSignedIn, ensureAppFolderAndFiles, MOCK_MODE } from '../lib/drive.js'
import { isTwelveDataMocked } from '../lib/priceSources.js'
import { DEMO_DATA } from '../data/demoData.js'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [dataSource, setDataSource] = useState('demo') // 'demo' | 'mydata'
  const [currency, setCurrency] = useState('INR') // 'INR' | 'USD'
  const [theme, setTheme] = useState('dark')
  const [signedIn, setSignedIn] = useState(false)
  const [files, setFiles] = useState({
    'settings.json': { assets: {} },
    'transactions.json': { transactions: [] },
    'asset_trends.json': { trends: {} },
  })
  const [syncStatus, setSyncStatus] = useState({ unsynced: 0, lastAttempt: null })
  const [alerts, setAlerts] = useState([]) // { id, assetId, type, message }
  const [dataLoading, setDataLoading] = useState(false)

  useEffect(() => onSyncStatusChange(setSyncStatus), [])

  // Load either the bundled demo dataset or the real My Data files, per the hard
  // switch described in the UX doc — never mixed.
  useEffect(() => {
    if (dataSource === 'demo') {
      setFiles(DEMO_DATA)
      setDataLoading(false)
      return
    }
    if (dataSource === 'mydata' && signedIn) {
      loadMyData()
    }
  }, [dataSource, signedIn])

  const loadMyData = useCallback(async () => {
    setDataLoading(true)
    try {
      await ensureAppFolderAndFiles()
      const pulled = await pullFromDrive()
      setFiles(pulled)
    } finally {
      setDataLoading(false)
    }
  }, [])

  const connectMyData = useCallback(async () => {
    await signIn()
    setSignedIn(true)
    setDataSource('mydata')
  }, [])

  const disconnectMyData = useCallback(() => {
    signOut()
    setSignedIn(false)
    setDataSource('demo')
  }, [])

  // The single write path every tab uses — Demo mode never calls this (see the
  // guard below), matching the "Demo mode guardrail" in the UX doc states section.
  const updateFile = useCallback(
    async (fileName, updater) => {
      if (dataSource !== 'mydata') {
        console.warn('Refusing to write in demo mode')
        return
      }
      setFiles((prev) => {
        const next = { ...prev, [fileName]: updater(prev[fileName]) }
        commitChange(fileName, next[fileName])
        return next
      })
    },
    [dataSource],
  )

  const addAlert = useCallback((alert) => {
    // Replace any existing alert for this asset rather than appending a duplicate -
    // otherwise a new failure's message can get hidden behind a stale older one when
    // multiple lookups are found for the same asset ("find" returns the first match).
    setAlerts((prev) => [...prev.filter((a) => a.assetId !== alert.assetId), { id: crypto.randomUUID(), ...alert }])
  }, [])

  const dismissAlert = useCallback((id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const value = {
    dataSource,
    setDataSource,
    currency,
    setCurrency,
    theme,
    setTheme,
    signedIn,
    files,
    dataLoading,
    updateFile,
    syncStatus,
    syncNow,
    connectMyData,
    disconnectMyData,
    alerts,
    addAlert,
    dismissAlert,
    mockMode: MOCK_MODE,
    twelveDataMocked: isTwelveDataMocked,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
