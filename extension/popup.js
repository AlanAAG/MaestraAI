// popup.js - UI logic for extension popup

const GROUP_NAMES = {
  '91000000-0000-0000-0000-000000000001': 'Grupo A',
  '92000000-0000-0000-0000-000000000002': 'Grupo B',
}

document.addEventListener('DOMContentLoaded', async () => {
  // Load saved settings
  const { ingestToken, apiUrl, syncTimes } = await chrome.storage.sync.get([
    'ingestToken',
    'apiUrl',
    'syncTimes',
  ])

  if (ingestToken) {
    document.getElementById('ingestToken').value = ingestToken
  }

  if (apiUrl) {
    document.getElementById('apiUrl').value = apiUrl
  }

  // Update status
  updateStatus(syncTimes || {})

  // Save button
  document.getElementById('saveBtn').addEventListener('click', async () => {
    const token = document.getElementById('ingestToken').value
    const url = document.getElementById('apiUrl').value || 'https://maestraai.mx'

    await chrome.storage.sync.set({
      ingestToken: token,
      apiUrl: url,
    })

    const savedMsg = document.getElementById('savedMsg')
    savedMsg.style.display = 'block'
    setTimeout(() => {
      savedMsg.style.display = 'none'
    }, 2000)
  })
})

function updateStatus(syncTimes) {
  const groupAId = '91000000-0000-0000-0000-000000000001'
  const groupBId = '92000000-0000-0000-0000-000000000002'

  const groupAStatus = document.getElementById('groupAStatus')
  const groupBStatus = document.getElementById('groupBStatus')

  if (syncTimes[groupAId]) {
    const time = new Date(syncTimes[groupAId])
    groupAStatus.textContent = `✓ ${formatTime(time)}`
    groupAStatus.className = 'status-value success'
  }

  if (syncTimes[groupBId]) {
    const time = new Date(syncTimes[groupBId])
    groupBStatus.textContent = `✓ ${formatTime(time)}`
    groupBStatus.className = 'status-value success'
  }
}

function formatTime(date) {
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return 'Hace un momento'
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours}h`
  return date.toLocaleDateString('es-MX')
}
