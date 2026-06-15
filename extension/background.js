// background.js - Service worker for MaestraAI extension

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ASSIGNMENT_SCORES_INTERCEPTED') {
    handleAssignmentScores(message.groupId, message.groupSlug, message.data)
  }
  if (message.type === 'EBOOK_CONTENT_INTERCEPTED') {
    handleEbookContent(message.uuid, message.title, message.content)
  }
})

async function handleEbookContent(uuid, title, content) {
  try {
    const { apiKey, apiUrl } = await chrome.storage.sync.get(['apiKey', 'apiUrl'])
    if (!apiKey) return
    const targetUrl = apiUrl || 'https://www.maestraia.com'
    const response = await fetch(`${targetUrl}/api/richmond/ebook-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ uuid, title, content }),
    })
    if (response.ok) {
      console.log('[MaestraAI] E-book content synced:', uuid, title)
    } else {
      console.error('[MaestraAI] E-book sync failed:', response.status)
    }
  } catch (error) {
    console.error('[MaestraAI] E-book sync error:', error)
  }
}

async function handleAssignmentScores(groupId, groupSlug, data) {
  try {
    const { apiKey, apiUrl } = await chrome.storage.sync.get(['apiKey', 'apiUrl'])

    if (!apiKey) {
      console.error('[MaestraAI] No API key configured')
      return
    }

    const targetUrl = apiUrl || 'https://www.maestraia.com'

    const response = await fetch(`${targetUrl}/api/richmond/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ group_id: groupId, data }),
    })

    if (response.ok) {
      const result = await response.json()
      console.log('[MaestraAI] Sync successful:', result)

      // Clear error badge
      chrome.action.setBadgeText({ text: '' })

      // Store sync time and status for popup display
      const syncTimes = (await chrome.storage.sync.get('syncTimes')).syncTimes || {}
      syncTimes[groupId] = new Date().toISOString()
      await chrome.storage.sync.set({
        syncTimes,
        lastSyncStatus: 'ok',
        lastSyncTime: new Date().toISOString(),
        lastSyncGroup: groupSlug,
      })

      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon128.png',
        title: 'MaestraAI Sync',
        message: `${groupSlug}: ${result.synced ?? data.length} calificaciones sincronizadas`,
      })
    } else {
      const errorText = await response.text().catch(() => response.status.toString())
      console.error('[MaestraAI] Sync failed:', response.status, errorText)

      // Show error badge so teacher notices the failure
      chrome.action.setBadgeText({ text: '!' })
      chrome.action.setBadgeBackgroundColor({ color: '#ef4444' })

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

    await chrome.storage.sync.set({
      lastSyncStatus: 'error',
      lastSyncTime: new Date().toISOString(),
      lastSyncGroup: null,
      lastSyncError: error instanceof Error ? error.message : String(error),
    })
  }
}
