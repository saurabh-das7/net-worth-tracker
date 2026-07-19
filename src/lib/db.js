// Local write-ahead buffer (IndexedDB) — see Tech Stack doc "Local write-ahead buffer & sync".
// Every confirmed change lands here first, instantly, before any Drive round-trip.
import { openDB } from 'idb'

const DB_NAME = 'net-worth-tracker'
const DB_VERSION = 1
const STORE = 'files' // one row per data file: settings, transactions, asset_trends

let dbPromise = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'key' })
        }
      },
    })
  }
  return dbPromise
}

// Every write is timestamped and flagged unsynced until a successful Drive push.
export async function bufferWrite(key, data) {
  const db = await getDB()
  await db.put(STORE, {
    key,
    data,
    updatedAt: Date.now(),
    synced: false,
  })
}

export async function bufferRead(key) {
  const db = await getDB()
  const row = await db.get(STORE, key)
  return row ? row.data : null
}

export async function markSynced(key) {
  const db = await getDB()
  const row = await db.get(STORE, key)
  if (row) {
    row.synced = true
    await db.put(STORE, row)
  }
}

export async function getUnsyncedKeys() {
  const db = await getDB()
  const all = await db.getAll(STORE)
  return all.filter((r) => !r.synced).map((r) => r.key)
}

export async function countUnsynced() {
  const keys = await getUnsyncedKeys()
  return keys.length
}
