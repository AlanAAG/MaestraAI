// background.js - Service worker for MaestraAI extension

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ASSIGNMENT_SCORES_INTERCEPTED') {
    handleAssignmentScores(message.groupId, message.groupSlug, message.data)
  }
})

async function handleAssignmentScores(groupId, groupSlug, data) {
  try {
    // Get settings from storage
    const { ingestToken, apiUrl } = await chrome.storage.sync.get([
      'ingestToken',
      'apiUrl',
    ])

    if (!ingestToken) {
      console.error('[MaestraAI] No ingest token configured')
      return
    }

    const targetUrl = apiUrl || 'https://maestraai.mx'

    // Send to MaestraAI API
    const response = await fetch(`${targetUrl}/api/richmond/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ingestToken}`,
      },
      body: JSON.stringify({
        group_id: groupId,
        data,
      }),
    })

    if (response.ok) {
      const result = await response.json()
      console.log('[MaestraAI] Sync successful:', result)

      // Update last sync time
      const syncTimes = (await chrome.storage.sync.get('syncTimes')).syncTimes || {}
      syncTimes[groupId] = new Date().toISOString()
      await chrome.storage.sync.set({ syncTimes })

      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon128.png',
        title: 'MaestraAI Sync',
        message: `✓ ${groupSlug}: ${result.synced} calificaciones sincronizadas`,
      })
    } else {
      const error = await response.text()
      console.error('[MaestraAI] Sync failed:', response.status, error)
    }
  } catch (error) {
    console.error('[MaestraAI] Sync error:', error)
  }
}
