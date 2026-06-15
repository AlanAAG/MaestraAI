// popup.js - UI logic for extension popup

document.addEventListener('DOMContentLoaded', async () => {
  const { apiKey, apiUrl } = await chrome.storage.sync.get(['apiKey', 'apiUrl'])

  if (apiKey) document.getElementById('apiKey').value = apiKey
  document.getElementById('apiUrl').value = apiUrl || 'https://maestraai.mx'

  // Show last sync status while connection test runs
  await showLastSyncStatus()

  if (apiKey) {
    testConnection(apiKey, apiUrl || 'https://maestraai.mx')
  }

  // Save button
  document.getElementById('saveBtn').addEventListener('click', async () => {
    const key = document.getElementById('apiKey').value.trim()
    const url = document.getElementById('apiUrl').value.trim() || 'https://maestraai.mx'

    if (!key) {
      showMessage('Por favor ingresa una clave API', 'error')
      return
    }

    if (!isValidApiUrl(url)) {
      showMessage('La URL debe comenzar con https:// (o http://localhost para desarrollo)', 'error')
      return
    }

    // Test connection before saving to prevent pointing extension at a wrong server
    const ok = await testConnection(key, url)
    if (!ok) {
      showMessage('No se pudo guardar — verifica la URL y la clave API', 'error')
      return
    }

    await chrome.storage.sync.set({ apiKey: key, apiUrl: url })
    showMessage('Configuración guardada', 'success')
  })

  // Test connection button
  document.getElementById('testBtn').addEventListener('click', async () => {
    const key = document.getElementById('apiKey').value.trim()
    const url = document.getElementById('apiUrl').value.trim() || 'https://maestraai.mx'

    if (!key) {
      showMessage('Por favor ingresa una clave API primero', 'error')
      return
    }

    await testConnection(key, url)
  })
})

function isValidApiUrl(url) {
  return (
    url.startsWith('https://') ||
    url.startsWith('http://localhost') ||
    url.startsWith('http://127.0.0.1')
  )
}

async function showLastSyncStatus() {
  const { lastSyncStatus, lastSyncTime, lastSyncGroup, lastSyncError } =
    await chrome.storage.sync.get(['lastSyncStatus', 'lastSyncTime', 'lastSyncGroup', 'lastSyncError'])

  if (!lastSyncTime) return

  const statusDetails = document.getElementById('statusDetails')
  const when = formatRelativeTime(lastSyncTime)

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

// Returns true if connection succeeds, false otherwise
async function testConnection(apiKey, apiUrl) {
  const statusBox = document.getElementById('statusBox')
  const statusDot = document.getElementById('statusDot')
  const statusTitle = document.getElementById('statusTitle')
  const statusDetails = document.getElementById('statusDetails')

  statusBox.className = 'status'
  statusDot.className = 'status-dot gray'
  statusTitle.textContent = 'Probando conexión...'
  statusDetails.innerHTML = ''

  try {
    const response = await fetch(`${apiUrl}/api/richmond/groups`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const data = await response.json()

    statusBox.className = 'status connected'
    statusDot.className = 'status-dot green'
    statusTitle.textContent = `Conectada como ${data.teacherName}`

    const groupCount = data.totalGroups || 0
    const groupNames = data.groups || []

    let detailsHTML = ''
    if (groupCount > 0) {
      detailsHTML = `
        <div class="status-item">
          <span class="status-label">Grupos sincronizando</span>
          <span class="status-value">${groupCount}</span>
        </div>
      `
      if (groupNames.length > 0) {
        detailsHTML += `
          <div class="status-item">
            <span class="status-label">Grupos</span>
            <span class="status-value">${groupNames.join(', ')}</span>
          </div>
        `
      }
    } else {
      detailsHTML = `
        <div class="status-item">
          <span class="status-label" style="color:#f59e0b">Sin grupos configurados</span>
        </div>
      `
    }

    statusDetails.innerHTML = detailsHTML

    // Reload mappings in the active Richmond tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: 'RELOAD_MAPPINGS' })
    })

    return true
  } catch (error) {
    statusBox.className = 'status error'
    statusDot.className = 'status-dot red'
    statusTitle.textContent = 'Error de conexión'

    let errorMsg = 'No se pudo conectar al servidor'
    if (error.message.includes('401')) errorMsg = 'Clave API inválida o revocada'
    else if (error.message.includes('404')) errorMsg = 'Endpoint no encontrado — verifica la URL'
    else if (error.message.includes('Failed to fetch')) errorMsg = 'No se pudo conectar — verifica la URL'

    statusDetails.innerHTML = `
      <div class="status-item">
        <span class="status-label" style="color:#ef4444">${errorMsg}</span>
      </div>
    `

    return false
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
