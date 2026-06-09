// popup.js - UI logic for extension popup

document.addEventListener('DOMContentLoaded', async () => {
  // Load saved settings
  const { apiKey, apiUrl } = await chrome.storage.sync.get(['apiKey', 'apiUrl'])

  if (apiKey) {
    document.getElementById('apiKey').value = apiKey
  }

  if (apiUrl) {
    document.getElementById('apiUrl').value = apiUrl
  } else {
    document.getElementById('apiUrl').value = 'https://maestraia.com'
  }

  // Test connection on load if API key is configured (URL falls back to default)
  if (apiKey) {
    testConnection(apiKey, apiUrl || 'https://maestraia.com')
  }

  // Save button
  document.getElementById('saveBtn').addEventListener('click', async () => {
    const key = document.getElementById('apiKey').value.trim()
    const url = document.getElementById('apiUrl').value.trim() || 'https://maestraia.com'

    if (!key) {
      showMessage('Por favor ingresa una clave API', 'error')
      return
    }

    await chrome.storage.sync.set({
      apiKey: key,
      apiUrl: url,
    })

    showMessage('✓ Configuración guardada', 'success')

    // Test connection after saving
    setTimeout(() => testConnection(key, url), 500)
  })

  // Test connection button
  document.getElementById('testBtn').addEventListener('click', async () => {
    const key = document.getElementById('apiKey').value.trim()
    const url = document.getElementById('apiUrl').value.trim() || 'https://maestraia.com'

    if (!key) {
      showMessage('Por favor ingresa una clave API primero', 'error')
      return
    }

    await testConnection(key, url)
  })
})

async function testConnection(apiKey, apiUrl) {
  const statusBox = document.getElementById('statusBox')
  const statusDot = document.getElementById('statusDot')
  const statusTitle = document.getElementById('statusTitle')
  const statusDetails = document.getElementById('statusDetails')

  // Show loading state
  statusBox.className = 'status'
  statusDot.className = 'status-dot gray'
  statusTitle.textContent = 'Probando conexión...'
  statusDetails.innerHTML = ''

  try {
    const response = await fetch(`${apiUrl}/api/richmond/groups`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    // Success - show connected state
    statusBox.className = 'status connected'
    statusDot.className = 'status-dot green'
    statusTitle.textContent = `Conectado como ${data.teacherName}`

    const groupNames = data.groups || []
    const groupCount = data.totalGroups || 0

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
          <span class="status-label" style="color: #f59e0b;">⚠ No hay grupos configurados</span>
        </div>
      `
    }

    statusDetails.innerHTML = detailsHTML

    // Notify content script to reload mappings
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'RELOAD_MAPPINGS' })
      }
    })
  } catch (error) {
    // Error - show disconnected state
    statusBox.className = 'status error'
    statusDot.className = 'status-dot red'
    statusTitle.textContent = 'Error de conexión'

    let errorMsg = 'No se pudo conectar al servidor'
    if (error.message.includes('401')) {
      errorMsg = 'Clave API inválida o revocada'
    } else if (error.message.includes('404')) {
      errorMsg = 'Endpoint no encontrado - verifica la URL'
    } else if (error.message.includes('Failed to fetch')) {
      errorMsg = 'No se pudo conectar - verifica la URL'
    }

    statusDetails.innerHTML = `
      <div class="status-item">
        <span class="status-label" style="color: #ef4444;">${errorMsg}</span>
      </div>
    `
  }
}

function showMessage(text, type) {
  const msg = document.getElementById('saveMsg')
  msg.textContent = text
  msg.className = `message ${type}`

  if (type === 'success') {
    setTimeout(() => {
      msg.className = 'message'
    }, 3000)
  }
}
