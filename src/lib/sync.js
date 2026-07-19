// Sync orchestration — local write-ahead buffer + debounced auto-sync + manual
// override, per Tech Stack doc "Local write-ahead buffer & sync".
import { bufferWrite, bufferRead, markSynced, countUnsynced } from './db.js'
import { readFile, writeFile } from './drive.js'

const DEBOUNCE_MS = 4000
const FILES = ['settings.json', 'transactions.json', 'asset_trends.json']

let debounceTimer = null
let listeners = []

export function onSyncStatusChange(fn) {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter((l) => l !== fn)
  }
}

async function notify() {
  const unsynced = await countUnsynced()
  listeners.forEach((fn) => fn({ unsynced, lastAttempt: Date.now() }))
}

// Call this after any confirmed local change (transaction merged, asset value
// corrected, setting edited). Writes to the local buffer immediately, then
// schedules a debounced push — batches rapid edits into one Drive write.
export async function commitChange(fileName, data) {
  await bufferWrite(fileName, data)
  await notify()
  scheduleSync()
}

function scheduleSync() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    syncNow().catch((err) => console.error('Background sync failed:', err))
  }, DEBOUNCE_MS)
}

// Manual "Sync" button and the debounced background trigger both call this.
export async function syncNow() {
  const results = {}
  for (const fileName of FILES) {
    const local = await bufferRead(fileName)
    if (local === null) continue // nothing local yet for this file
    try {
      await writeFile(fileName, local)
      await markSynced(fileName)
      results[fileName] = 'synced'
    } catch (err) {
      results[fileName] = `error: ${err.message}`
    }
  }
  await notify()
  return results
}

// Pull latest from Drive into the local buffer — used on app load and after
// reconnecting. Does not overwrite local unsynced changes (last-write-wins is
// handled at write time in drive.js's conflict check, not here).
export async function pullFromDrive() {
  const out = {}
  for (const fileName of FILES) {
    const data = await readFile(fileName)
    await bufferWrite(fileName, data)
    await markSynced(fileName)
    out[fileName] = data
  }
  return out
}
