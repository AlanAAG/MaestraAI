// popup.js - UI logic for extension popup

const PRODUCTION_URL = 'https://www.maestraia.com'

async function getApiUrl() {
  const { apiUrl } = await chrome.storage.sync.get('apiUrl')
  return apiUrl || PRODUCTION_URL
}

// Inspect the active tab: are we on a Richmond course page, elsewhere on Richmond, or off-site?
// Returns { slug, onRichmond }.
function detectRichmondContext() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url || ''
      const onRichmond = /richmondlp\.com/.test(url)
      const m = url.match(/richmondlp\.com\/courses\/([^/]+)/)
      resolve({ slug: m ? m[1] : null, onRichmond })
    })
  })
}

document.addEventListener('DOMContentLoaded', async () => {
  const { apiKey } = await chrome.storage.sync.get('apiKey')
  if (apiKey) document.getElementById('apiKey').value = apiKey

  if (apiKey) {
    const url = await getApiUrl()
    testConnection(apiKey, url)
  } else {
    // No key yet — surface any prior sync history instead of a blank box.
    await showLastSyncStatus()
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
function buildMappingUI(classCode, unmappedGroups, apiUrl, onMapped) {
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

// Shown when connected but not on a Richmond course page.
// onRichmond=true → they're on Richmond but not inside a group; just guide them to open one.
function buildNotOnRichmondHint(onRichmond) {
  const div = document.createElement('div')
  div.className = 'setup-guide'

  const title = document.createElement('p')
  title.className = 'setup-title'
  title.textContent = onRichmond ? 'Abre un grupo para vincularlo' : 'Ve a Richmond'
  div.appendChild(title)

  const hint = document.createElement('p')
  hint.className = 'no-richmond-hint'
  hint.textContent = onRichmond
    ? 'Haz clic en el nombre de cualquiera de tus grupos en Richmond. Al entrar, vuelve a abrir esta extensión y podrás vincularlo con un clic.'
    : 'Inicia sesión en richmondlp.com, abre un grupo y vuelve a esta extensión para vincularlo.'
  div.appendChild(hint)

  if (!onRichmond) {
    const link = document.createElement('a')
    link.href = 'https://richmondlp.com'
    link.target = '_blank'
    link.className = 'setup-link'
    link.textContent = '→ Ir a Richmond'
    div.appendChild(link)
  }

  return div
}

// Returns a single status row summarizing the most recent sync, or null if none.
async function lastSyncRow() {
  const { lastSyncStatus, lastSyncTime, lastSyncGroup } =
    await chrome.storage.sync.get(['lastSyncStatus', 'lastSyncTime', 'lastSyncGroup'])
  if (!lastSyncTime) return null
  const when = formatRelativeTime(lastSyncTime)
  if (lastSyncStatus === 'ok') {
    return statusRow('Última sincronización', `${lastSyncGroup || ''} ${when}`.trim(), { valueColor: '#16a34a' })
  }
  return statusRow(`Último intento falló (${when})`, null, { labelColor: '#ef4444' })
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
  const { slug: classCode, onRichmond } = await detectRichmondContext()
  const currentCourseIsMapped = classCode && data.groupMap && data.groupMap[classCode]

  statusBox.className = 'status connected'
  statusDot.className = 'status-dot green'
  statusTitle.textContent = data.teacherName ? `✓ ${data.teacherName}` : '✓ Conectada'

  const nodes = []

  if (currentCourseIsMapped) {
    // On a mapped course — ready. Tell them to open Markbook → Scores.
    nodes.push(statusRow('✓ Grupo vinculado', classCode, { valueColor: '#16a34a' }))
    nodes.push(statusRow('Abre Markbook → Scores para sincronizar', null))
  } else if (classCode && unmappedGroups.length > 0) {
    // On an unmapped Richmond course → one-tap picker
    nodes.push(buildMappingUI(classCode, unmappedGroups, apiUrl, () => testConnection(apiKey, apiUrl)))
  } else if (classCode && mappedGroups === 0) {
    // On a Richmond course but teacher has no MaestraAI groups yet
    nodes.push(statusRow('Crea un grupo en MaestraAI primero', null, { labelColor: '#f59e0b' }))
  } else if (classCode) {
    // On a Richmond course, not mapped, but all groups already linked elsewhere
    nodes.push(statusRow('Esta clase no coincide con tus grupos', null, { labelColor: '#f59e0b' }))
    nodes.push(statusRow('Todos tus grupos ya están vinculados a otras clases', null))
  } else {
    // Not inside a course page (Richmond dashboard or off-site)
    if (mappedGroups > 0) nodes.push(statusRow('Grupos vinculados', mappedGroups, { valueColor: '#16a34a' }))
    nodes.push(buildNotOnRichmondHint(onRichmond))
  }

  // Always surface the last sync result if we have one — it's the proof the flow worked.
  const lastRow = await lastSyncRow()
  if (lastRow) nodes.push(lastRow)

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
