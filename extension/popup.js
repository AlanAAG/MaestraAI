// popup.js - UI logic for extension popup

const PRODUCTION_URL = 'https://www.maestraia.com'

async function getApiUrl() {
  const { apiUrl } = await chrome.storage.sync.get('apiUrl')
  return apiUrl || PRODUCTION_URL
}

// Read the Richmond course slug from the active tab URL.
// Returns e.g. "grupo-aca6e" or null if not on a course page.
function detectRichmondClass() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url || ''
      const m = url.match(/richmondlp\.com\/courses\/([^/]+)/)
      resolve(m ? m[1] : null)
    })
  })
}

document.addEventListener('DOMContentLoaded', async () => {
  const { apiKey } = await chrome.storage.sync.get('apiKey')
  if (apiKey) document.getElementById('apiKey').value = apiKey

  await showLastSyncStatus()

  if (apiKey) {
    const url = await getApiUrl()
    testConnection(apiKey, url)
  }

  document.getElementById('saveBtn').addEventListener('click', async () => {
    const key = document.getElementById('apiKey').value.trim()
    if (!key) { showMessage('Por favor ingresa una clave API', 'error'); return }
    const url = await getApiUrl()
    await chrome.storage.sync.set({ apiKey: key, apiUrl: url })
    showMessage('Configuración guardada', 'success')
    testConnection(key, url)
  })

  document.getElementById('testBtn').addEventListener('click', async () => {
    const key = document.getElementById('apiKey').value.trim()
    if (!key) { showMessage('Por favor ingresa una clave API primero', 'error'); return }
    const url = await getApiUrl()
    testConnection(key, url)
  })
})

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

// Renders the one-tap group linking UI when teacher is on an unmapped Richmond course.
function buildMappingUI(classCode, unmappedGroups, apiKey, apiUrl, onMapped) {
  const div = document.createElement('div')
  div.className = 'setup-guide'

  const title = document.createElement('p')
  title.className = 'setup-title'
  title.textContent = `Clase detectada: ${classCode}`
  div.appendChild(title)

  const label = document.createElement('p')
  label.className = 'setup-step'
  label.textContent = '¿A qué grupo de MaestraAI corresponde esta clase?'
  div.appendChild(label)

  const select = document.createElement('select')
  select.className = 'group-select'
  const defaultOpt = document.createElement('option')
  defaultOpt.value = ''
  defaultOpt.textContent = 'Selecciona tu grupo...'
  select.appendChild(defaultOpt)
  for (const g of unmappedGroups) {
    const opt = document.createElement('option')
    opt.value = g.id
    opt.textContent = g.name
    select.appendChild(opt)
  }
  div.appendChild(select)

  const btn = document.createElement('button')
  btn.className = 'link-btn'
  btn.textContent = 'Vincular este grupo'
  btn.onclick = async () => {
    const groupId = select.value
    if (!groupId) return
    btn.textContent = 'Vinculando...'
    btn.disabled = true

    const result = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'MAP_GROUP', groupId, richmondSlug: classCode, apiUrl },
        (response) => { void chrome.runtime.lastError; resolve(response) }
      )
    })

    if (result?.ok) {
      onMapped() // re-run testConnection to reflect the new mapping
    } else {
      btn.textContent = 'Error — intenta de nuevo'
      btn.disabled = false
    }
  }
  div.appendChild(btn)

  return div
}

// Shown when teacher is connected but not on any Richmond course page.
function buildNotOnRichmondHint(apiUrl) {
  const div = document.createElement('div')
  div.className = 'setup-guide'

  const hint = document.createElement('p')
  hint.className = 'no-richmond-hint'
  hint.textContent =
    'Navega a tu grupo en richmondlp.com → abre esta extensión → vincula el grupo con un clic.'
  div.appendChild(hint)

  const link = document.createElement('a')
  link.href = 'https://richmondlp.com'
  link.target = '_blank'
  link.className = 'setup-link'
  link.textContent = '→ Ir a Richmond'
  div.appendChild(link)

  return div
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
  statusTitle.textContent = 'Conectando...'
  statusDetails.replaceChildren()

  const result = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'FETCH_GROUPS', apiKey, apiUrl }, (response) => {
      if (chrome.runtime.lastError) resolve({ ok: false, error: 'service_worker_inactive' })
      else resolve(response)
    })
  })

  if (!result?.ok) {
    statusBox.className = 'status error'
    statusDot.className = 'status-dot red'
    statusTitle.textContent = 'Error de conexión'
    let msg = 'No se pudo conectar al servidor'
    if (result?.statusCode === 401) msg = 'Clave API inválida o revocada'
    statusDetails.replaceChildren(statusRow(msg, null, { labelColor: '#ef4444' }))
    return
  }

  const data = result.data
  const mappedGroups = data.mappedGroups ?? Object.keys(data.groupMap ?? {}).length
  const unmappedGroups = data.unmappedGroups ?? []
  const classCode = await detectRichmondClass()
  const currentCourseIsMapped = classCode && data.groupMap && data.groupMap[classCode]

  statusBox.className = 'status connected'
  statusDot.className = 'status-dot green'
  statusTitle.textContent = `✓ ${data.teacherName}`

  const nodes = []

  if (currentCourseIsMapped) {
    // On a mapped course — show sync readiness
    nodes.push(statusRow('Lista para sincronizar', classCode, { valueColor: '#16a34a' }))
    if (mappedGroups > 1) nodes.push(statusRow('Total grupos vinculados', mappedGroups))
  } else if (classCode && unmappedGroups.length > 0) {
    // On Richmond, course not mapped yet → show one-tap picker
    nodes.push(buildMappingUI(classCode, unmappedGroups, apiKey, apiUrl, () => testConnection(apiKey, apiUrl)))
  } else if (mappedGroups > 0 && !classCode) {
    // Has mappings but not on Richmond right now — just show status
    nodes.push(statusRow('Grupos vinculados', mappedGroups, { valueColor: '#16a34a' }))
    nodes.push(statusRow('Navega a Richmond para sincronizar', null))
  } else if (!classCode) {
    // No mappings, not on Richmond
    nodes.push(buildNotOnRichmondHint(apiUrl))
  } else {
    // On Richmond but all groups already mapped (or no groups exist)
    nodes.push(statusRow('Sin grupos en MaestraAI', null, { labelColor: '#f59e0b' }))
    nodes.push(statusRow('Crea un grupo en MaestraAI primero', null))
  }

  statusDetails.replaceChildren(...nodes)

  // Reload mappings in the active Richmond tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return
    chrome.tabs.sendMessage(tabs[0].id, { type: 'RELOAD_MAPPINGS' }, () => { void chrome.runtime.lastError })
  })
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
