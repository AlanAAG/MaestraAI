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

async function showLastSyncStatus() {
  const { lastSyncStatus, lastSyncTime, lastSyncGroup, lastSyncError } =
    await chrome.storage.sync.get(['lastSyncStatus', 'lastSyncTime', 'lastSyncGroup', 'lastSyncError'])

  if (!lastSyncTime) return

  const when = formatRelativeTime(lastSyncTime)
  const statusDetails = document.getElementById('statusDetails')

  if (lastSyncStatus === 'ok') {
    statusDetails.innerHTML = `
      <div class="status-item">
        <span class="status-label">Última sincronización</span>
        <span class="status-value" style="color:#16a34a">${when}</span>
      </div>
      ${lastSyncGroup ? `<div class="status-item"><span class="status-label">Grupo</span><span class="status-value">${lastSyncGroup}</span></div>` : ''}
    `
  } else if (lastSyncStatus === 'error') {
    const statusBox = document.getElementById('statusBox')
    statusBox.className = 'status error'
    statusDetails.innerHTML = `
      <div class="status-item">
        <span class="status-label" style="color:#ef4444">Error al sincronizar (${when})</span>
      </div>
      ${lastSyncError ? `<div class="status-item"><span class="status-label">${lastSyncError}</span></div>` : ''}
    `
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
  statusDetails.innerHTML = ''

  // Route through background service worker — extension popup pages are subject to CORS,
  // but the service worker bypasses it for URLs in host_permissions.
  const result = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'FETCH_GROUPS', apiKey, apiUrl }, resolve)
  })

  if (result?.ok) {
    const data = result.data
    statusBox.className = 'status connected'
    statusDot.className = 'status-dot green'
    statusTitle.textContent = `Conectada como ${data.teacherName}`

    const groupCount = data.totalGroups || 0
    const groupNames = data.groups || []

    let detailsHTML = groupCount > 0
      ? `<div class="status-item"><span class="status-label">Grupos sincronizando</span><span class="status-value">${groupCount}</span></div>`
      : `<div class="status-item"><span class="status-label" style="color:#f59e0b">Sin grupos configurados</span></div>`

    if (groupNames.length > 0) {
      detailsHTML += `<div class="status-item"><span class="status-label">Grupos</span><span class="status-value">${groupNames.join(', ')}</span></div>`
    }

    statusDetails.innerHTML = detailsHTML

    // Reload mappings in the active Richmond tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: 'RELOAD_MAPPINGS' })
    })
  } else {
    statusBox.className = 'status error'
    statusDot.className = 'status-dot red'
    statusTitle.textContent = 'Error de conexión'

    let errorMsg = 'No se pudo conectar al servidor'
    if (result?.statusCode === 401) errorMsg = 'Clave API inválida o revocada'
    else if (result?.statusCode === 404) errorMsg = 'Endpoint no encontrado'

    statusDetails.innerHTML = `<div class="status-item"><span class="status-label" style="color:#ef4444">${errorMsg}</span></div>`
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
