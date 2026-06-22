// background.js - Service worker for MaestraAI extension
// All fetch() calls live here — the service worker bypasses CORS for host_permissions URLs.
// popup.js and content.js never fetch directly; they send messages to this worker instead.

const PRODUCTION_URL = 'https://www.maestraia.com'

async function getApiUrl() {
  const { apiUrl } = await chrome.storage.sync.get('apiUrl')
  return apiUrl || PRODUCTION_URL
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ASSIGNMENT_SCORES_INTERCEPTED') {
    handleAssignmentScores(message.groupId, message.groupSlug, message.data, sender.tab?.id)
  } else if (message.type === 'FETCH_GROUPS') {
    fetchGroups(message.apiKey, message.apiUrl).then(sendResponse)
    return true
  } else if (message.type === 'MAP_GROUP') {
    mapGroup(message.apiUrl, message.groupId, message.richmondSlug).then(sendResponse)
    return true
  }
})

async function fetchGroups(apiKey, apiUrl) {
  const targetUrl = apiUrl || await getApiUrl()
  try {
    const response = await fetch(`${targetUrl}/api/richmond/groups`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!response.ok) return { ok: false, statusCode: response.status }
    const data = await response.json()
    return { ok: true, data }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

async function mapGroup(apiUrl, groupId, richmondSlug) {
  const { apiKey } = await chrome.storage.sync.get('apiKey')
  const targetUrl = apiUrl || await getApiUrl()
  try {
    const response = await fetch(`${targetUrl}/api/richmond/groups/map`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ group_id: groupId, richmond_slug: richmondSlug }),
    })
    if (!response.ok) return { ok: false, statusCode: response.status }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

function notifyTab(tabId, message) {
  if (!tabId) return
  chrome.tabs.sendMessage(tabId, message, () => {
    void chrome.runtime.lastError // suppress if tab navigated away
  })
}

async function handleAssignmentScores(groupId, groupSlug, data, tabId) {
  try {
    const { apiKey } = await chrome.storage.sync.get('apiKey')
    if (!apiKey) {
      console.error('[MaestraAI] No API key configured')
      return
    }
    const targetUrl = await getApiUrl()

    const response = await fetch(`${targetUrl}/api/richmond/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ group_id: groupId, data }),
    })

    if (response.ok) {
      const result = await response.json()
      chrome.action.setBadgeText({ text: '' })

      const syncTimes = (await chrome.storage.sync.get('syncTimes')).syncTimes || {}
      syncTimes[groupId] = new Date().toISOString()
      await chrome.storage.sync.set({
        syncTimes,
        lastSyncStatus: 'ok',
        lastSyncTime: new Date().toISOString(),
        lastSyncGroup: groupSlug,
      })

      const scoreCount = result.synced ?? 0
      const assignmentCount = Array.isArray(data) ? data.length : 0
      notifyTab(tabId, { type: 'SYNC_STATUS', status: 'ok', count: scoreCount, groupSlug })

      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon128.png',
        title: 'MaestraAI Sync',
        message: `${groupSlug}: ${assignmentCount} actividades, ${scoreCount} alumnos sincronizados`,
      })
    } else {
      const errorText = await response.text().catch(() => response.status.toString())
      console.error('[MaestraAI] Sync failed:', response.status, errorText)

      chrome.action.setBadgeText({ text: '!' })
      chrome.action.setBadgeBackgroundColor({ color: '#ef4444' })
      notifyTab(tabId, { type: 'SYNC_STATUS', status: 'error' })

      await chrome.storage.sync.set({
        lastSyncStatus: 'error',
        lastSyncTime: new Date().toISOString(),
        lastSyncGroup: groupSlug,
        lastSyncError: `HTTP ${response.status}`,
      })
    }
  } catch (error) {
    console.error('[MaestraAI] Sync error:', error)

    chrome.action.setBadgeText({ text: '!' })
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' })
    notifyTab(tabId, { type: 'SYNC_STATUS', status: 'error' })

    await chrome.storage.sync.set({
      lastSyncStatus: 'error',
      lastSyncTime: new Date().toISOString(),
      lastSyncGroup: null,
      lastSyncError: error instanceof Error ? error.message : String(error),
    })
  }
}
