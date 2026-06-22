// popup.js - UI logic for extension popup

const PRODUCTION_URL = 'https://www.maestraia.com'

// Resolve the API URL: devs can override via chrome.storage.sync; teachers always
// get the production URL without any UI field to confuse them.
async function getApiUrl() {
  const { apiUrl } = await chrome.storage.sync.get('apiUrl')
  return apiUrl || PRODUCTION_URL
}

document.addEventListener('DOMContentLoaded', async () => {
  const { apiKey } = await chrome.storage.sync.get('apiKey')
  if (apiKey) document.getElementById('apiKey').value = apiKey

  await showLastSyncStatus()

  if (apiKey) {
    const url = await getApiUrl()
    testConnection(apiKey, url)
  }

  // Save button — just saves the key, then tests in the background
  document.getElementById('saveBtn').addEventListener('click', async () => {
    const key = document.getElementById('apiKey').value.trim()

    if (!key) {
      showMessage('Por favor ingresa una clave API', 'error')
      return
    }

    const url = await getApiUrl()
    await chrome.storage.sync.set({ apiKey: key, apiUrl: url })
    showMessage('Configuración guardada', 'success')

    // Test after saving — don't block save on result
    testConnection(key, url)
  })

  // Test connection button
  document.getElementById('testBtn').addEventListener('click', async () => {
    const key = document.getElementById('apiKey').value.trim()
    if (!key) {
      showMessage('Por favor ingresa una clave API primero', 'error')
      return
    }
    const url = await getApiUrl()
    testConnection(key, url)
  })
})

// Build a status row with textContent (never innerHTML) — values come from the API and
// from richmondlp.com URLs, so they are untrusted and must not be parsed as HTML.
function statusRow(label, value, opts = {}) {
  const row = document.createElement('div')
  row.className = 'status-item'
  const l = document.createElement('span')
  l.className = 'status-label'
  l.textContent = label
  if (opts.labelColor) l.style.color = opts.labelColor
  row.appendChild(l)
  if (value != null) {
    const v = document.createElement('span')
    v.className = 'status-value'
    v.textContent = value
    if (opts.valueColor) v.style.color = opts.valueColor
    row.appendChild(v)
  }
  return row
}

async function showLastSyncStatus() {
  const { lastSyncStatus, lastSyncTime, lastSyncGroup, lastSyncError } =
    await chrome.storage.sync.get(['lastSyncStatus', 'lastSyncTime', 'lastSyncGroup', 'lastSyncError'])

  if (!lastSyncTime) return

  const when = formatRelativeTime(lastSyncTime)
  const statusDetails = document.getElementById('statusDetails')

  if (lastSyncStatus === 'ok') {
    const rows = [statusRow('Última sincronización', when, { valueColor: '#16a34a' })]
    if (lastSyncGroup) rows.push(statusRow('Grupo', lastSyncGroup))
    statusDetails.replaceChildren(...rows)
  } else if (lastSyncStatus === 'error') {
    document.getElementById('statusBox').className = 'status error'
    const rows = [statusRow(`Error al sincronizar (${when})`, null, { labelColor: '#ef4444' })]
    if (lastSyncError) rows.push(statusRow(lastSyncError, null))
    statusDetails.replaceChildren(...rows)
  }
}

async function testConnection(apiKey, apiUrl) {
  const statusBox = document.getElementById('statusBox')
  const statusDot = document.getElementById('statusDot')
  const statusTitle = document.getElementById('statusTitle')
  const statusDetails = document.getElementById('statusDetails')

  statusBox.className = 'status'
  statusDot.className = 'status-dot gray'
  statusTitle.textContent = 'Probando conexión...'
  statusDetails.replaceChildren()

  // Route through background service worker — extension popup pages are subject to CORS,
  // but the service worker bypasses it for URLs in host_permissions.
  // Check chrome.runtime.lastError to suppress "Receiving end does not exist" when
  // the MV3 service worker was terminated by Chrome while idle.
  const result = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'FETCH_GROUPS', apiKey, apiUrl }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[MaestraAI] Service worker inactive:', chrome.runtime.lastError.message)
        resolve({ ok: false, error: 'service_worker_inactive' })
      } else {
        resolve(response)
      }
    })
  })

  if (result?.ok) {
    const data = result.data
    statusBox.className = 'status connected'
    statusDot.className = 'status-dot green'
    statusTitle.textContent = `Conectada como ${data.teacherName}`

    const mappedGroups = data.mappedGroups ?? Object.keys(data.groupMap ?? {}).length
    const totalGroups = data.totalGroups || 0
    const groupNames = data.groups || []

    const rows = []
    if (mappedGroups > 0) {
      rows.push(statusRow('Grupos sincronizando', mappedGroups))
      if (groupNames.length > 0) rows.push(statusRow('Grupos', groupNames.join(', ')))
    } else if (totalGroups > 0) {
      rows.push(statusRow('⚠ Sin código Richmond en ningún grupo', null, { labelColor: '#f59e0b' }))
      rows.push(statusRow('Configúralo en MaestraAI → Grupos → editar', null, { labelColor: '#9ca3af' }))
    } else {
      rows.push(statusRow('Sin grupos configurados', null, { labelColor: '#f59e0b' }))
    }
    statusDetails.replaceChildren(...rows)

    // Reload mappings in the active Richmond tab — ignore silently if the tab
    // has no content script (i.e. teacher is not on a Richmond course page).
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return
      chrome.tabs.sendMessage(tabs[0].id, { type: 'RELOAD_MAPPINGS' }, () => {
        void chrome.runtime.lastError // suppress "Receiving end does not exist"
      })
    })
  } else {
    statusBox.className = 'status error'
    statusDot.className = 'status-dot red'
    statusTitle.textContent = 'Error de conexión'

    let errorMsg = 'No se pudo conectar al servidor'
    if (result?.statusCode === 401) errorMsg = 'Clave API inválida o revocada'
    else if (result?.statusCode === 404) errorMsg = 'Endpoint no encontrado'

    statusDetails.replaceChildren(statusRow(errorMsg, null, { labelColor: '#ef4444' }))
  }
}

function formatRelativeTime(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'ahora mismo'
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `hace ${diffHr}h`
  return `hace ${Math.floor(diffHr / 24)} días`
}

function showMessage(text, type) {
  const msg = document.getElementById('saveMsg')
  msg.textContent = text
  msg.className = `message ${type}`
  if (type === 'success') setTimeout(() => { msg.className = 'message' }, 3000)
}
