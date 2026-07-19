// Google Drive integration — drive.file scope, per-account isolation is the access
// control (see PRD "My Data works only for the owner" and Tech Stack "Data storage").
//
// MOCK MODE: no real VITE_GOOGLE_OAUTH_CLIENT_ID is configured yet (dummy value as of
// M1 scaffolding — real setup happens once you plug in your actual Client ID from the
// account setup steps). In mock mode, "Drive" is simulated with localStorage under a
// clearly-separate key, so the whole app is testable end to end before real OAuth is
// wired in. Swap MOCK_MODE off once a real Client ID is in .env.local.
import { buildInitialSettings } from '../data/assetMaster.js'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || ''
export const MOCK_MODE = !CLIENT_ID || CLIENT_ID === 'DUMMY_CLIENT_ID'

const APP_FOLDER_NAME = 'NetWorthTracker'
const FILE_NAMES = ['settings.json', 'transactions.json', 'asset_trends.json']

const MOCK_KEY_PREFIX = 'mock_drive__'

let tokenClient = null
let accessToken = null

// --- Auth ---------------------------------------------------------------

export async function signIn() {
  if (MOCK_MODE) {
    localStorage.setItem('mock_drive__signed_in', 'true')
    return { mock: true, email: 'mock-user@example.com' }
  }

  // Real flow: Google Identity Services token client (PKCE, no client secret).
  // Loaded lazily so mock mode never needs the GIS script at all.
  await loadGisScript()
  return new Promise((resolve, reject) => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (resp) => {
        if (resp.error) return reject(resp)
        accessToken = resp.access_token
        resolve({ mock: false })
      },
    })
    tokenClient.requestAccessToken()
  })
}

export function isSignedIn() {
  if (MOCK_MODE) return localStorage.getItem('mock_drive__signed_in') === 'true'
  return !!accessToken
}

export function signOut() {
  if (MOCK_MODE) {
    localStorage.removeItem('mock_drive__signed_in')
    return
  }
  if (accessToken && window.google) {
    window.google.accounts.oauth2.revoke(accessToken)
  }
  accessToken = null
}

function loadGisScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

// --- Folder / file setup -------------------------------------------------
// First connection: find or create the app folder, then find-or-create each of the
// three files, seeding blank defaults. See Tech Stack "Data storage: Google Drive
// schema" and PRD "My Data works only for the owner."

export async function ensureAppFolderAndFiles() {
  if (MOCK_MODE) {
    for (const name of FILE_NAMES) {
      const key = MOCK_KEY_PREFIX + name
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(blankDefaultFor(name)))
      }
    }
    return { mock: true }
  }

  // Real Drive API calls — written for the actual flow, exercised for real once a
  // live Client ID + consent is in place.
  const folderId = await findOrCreateFolder(APP_FOLDER_NAME)
  for (const name of FILE_NAMES) {
    await findOrCreateFile(folderId, name, blankDefaultFor(name))
  }
  return { mock: false, folderId }
}

function blankDefaultFor(fileName) {
  if (fileName === 'settings.json') return buildInitialSettings()
  if (fileName === 'transactions.json') return { transactions: [] }
  if (fileName === 'asset_trends.json') return { trends: {} }
  return {}
}

async function driveFetch(path, options = {}) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`Drive API error: ${res.status} ${await res.text()}`)
  return res.json()
}

async function findOrCreateFolder(name) {
  const q = encodeURIComponent(
    `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  )
  const list = await driveFetch(`files?q=${q}&spaces=drive`)
  if (list.files?.length) return list.files[0].id

  const created = await driveFetch('files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder' }),
  })
  return created.id
}

async function findOrCreateFile(folderId, name, blankDefault) {
  const q = encodeURIComponent(`name='${name}' and '${folderId}' in parents and trashed=false`)
  const list = await driveFetch(`files?q=${q}&spaces=drive`)
  if (list.files?.length) return list.files[0].id

  // Multipart create with initial blank content.
  const metadata = { name, parents: [folderId], mimeType: 'application/json' }
  const boundary = 'nwt-boundary'
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
    `${JSON.stringify(blankDefault)}\r\n--${boundary}--`

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  )
  const created = await res.json()
  return created.id
}

// --- Read / write ----------------------------------------------------------

export async function readFile(fileName) {
  if (MOCK_MODE) {
    const raw = localStorage.getItem(MOCK_KEY_PREFIX + fileName)
    return raw ? JSON.parse(raw) : blankDefaultFor(fileName)
  }
  const q = encodeURIComponent(`name='${fileName}' and trashed=false`)
  const list = await driveFetch(`files?q=${q}&spaces=drive`)
  if (!list.files?.length) return blankDefaultFor(fileName)
  const fileId = list.files[0].id
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  return res.json()
}

// Conflict check: compare modifiedTime against what was last read, per Tech Stack
// doc's "kept deliberately simple" conflict policy. Returns true if it's safe to write.
export async function writeFile(fileName, data) {
  if (MOCK_MODE) {
    localStorage.setItem(MOCK_KEY_PREFIX + fileName, JSON.stringify(data))
    return { ok: true }
  }
  const q = encodeURIComponent(`name='${fileName}' and trashed=false`)
  const list = await driveFetch(`files?q=${q}&spaces=drive`)
  if (!list.files?.length) throw new Error(`${fileName} not found — run ensureAppFolderAndFiles first`)
  const fileId = list.files[0].id

  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    },
  )
  if (!res.ok) throw new Error(`Drive write failed: ${res.status}`)
  return { ok: true }
}
