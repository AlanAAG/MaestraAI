// content.js - Intercepts Richmond API calls for assignment scores and e-book content

let GROUP_UUID_MAP = {}
let isInitialized = false
// Payloads that arrive before group mappings are loaded are queued here and
// replayed once loadGroupMappings() resolves.
const pendingPayloads = []

async function loadGroupMappings() {
  try {
    const { apiKey, apiUrl } = await chrome.storage.sync.get(['apiKey', 'apiUrl'])

    if (!apiKey || !apiUrl) {
      console.warn('[MaestraAI] API key or URL not configured')
      return
    }

    const response = await fetch(`${apiUrl}/api/richmond/groups`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!response.ok) {
      console.error('[MaestraAI] Failed to fetch groups:', response.status)
      return
    }

    const data = await response.json()
    GROUP_UUID_MAP = data.groupMap || {}
    isInitialized = true

    console.log('[MaestraAI] Connected as:', data.teacherName, '—', data.totalGroups, 'groups')

    // Drain any payloads that arrived before mappings were ready
    if (pendingPayloads.length > 0) {
      console.log('[MaestraAI] Draining', pendingPayloads.length, 'queued payload(s)')
      pendingPayloads.splice(0).forEach(({ groupSlug, data: scoreData }) => {
        sendAssignmentScores(groupSlug, scoreData)
      })
    }
  } catch (error) {
    console.error('[MaestraAI] Failed to load group mappings:', error)
  }
}

function sendAssignmentScores(groupSlug, data) {
  const groupId = GROUP_UUID_MAP[groupSlug]
  if (!groupId) {
    console.warn('[MaestraAI] No mapping for slug:', groupSlug, 'Known:', Object.keys(GROUP_UUID_MAP))
    return
  }
  if (!Array.isArray(data)) return
  console.log('[MaestraAI] Sending', data.length, 'assignments for', groupSlug)
  chrome.runtime.sendMessage({ type: 'ASSIGNMENT_SCORES_INTERCEPTED', groupId, groupSlug, data })
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && (changes.apiKey || changes.apiUrl)) {
    console.log('[MaestraAI] Config changed, reloading group mappings...')
    isInitialized = false
    loadGroupMappings()
  }
})

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'RELOAD_MAPPINGS') {
    isInitialized = false
    loadGroupMappings()
  }
})

loadGroupMappings()

// Override XMLHttpRequest to intercept Richmond API responses
const OriginalXHR = window.XMLHttpRequest
const CustomXHR = function () {
  const xhr = new OriginalXHR()
  const originalOpen = xhr.open

  xhr.open = function (method, url, ...args) {
    const urlStr = String(url)

    // --- Assignment scores ---
    if (urlStr.includes('/api/course_modules/') && urlStr.includes('/assignment_scores.json')) {
      const originalOnLoad = xhr.onload
      xhr.onload = function () {
        if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText)
            // Extract group slug from the current page URL — broaden to capture any slug format
            const slugMatch = window.location.pathname.match(/\/courses\/([^/]+)\//)
            const groupSlug = slugMatch ? slugMatch[1] : null
            if (!groupSlug) return

            if (!isInitialized) {
              pendingPayloads.push({ groupSlug, data })
              console.log('[MaestraAI] Queued assignment payload (groups not loaded yet)')
            } else {
              sendAssignmentScores(groupSlug, data)
            }
          } catch (error) {
            console.error('[MaestraAI] Failed to parse assignment scores:', error)
          }
        }
        if (originalOnLoad) originalOnLoad.apply(this, arguments)
      }
    }

    // --- E-book interactive content ---
    if (urlStr.includes('/api/interactives/')) {
      const originalOnLoad = xhr.onload
      xhr.onload = function () {
        if (xhr.status === 200) {
          try {
            const content = JSON.parse(xhr.responseText)
            const uuidMatch = urlStr.match(/\/api\/interactives\/([^/?#]+)/)
            const uuid = uuidMatch ? uuidMatch[1] : null
            if (!uuid) return
            const title =
              content.title || content.name || content.unit_name ||
              content.lessonName || content.lesson_title || content.unitTitle || null
            console.log('[MaestraAI] Captured e-book content — UUID:', uuid, 'Title:', title)
            chrome.runtime.sendMessage({
              type: 'EBOOK_CONTENT_INTERCEPTED',
              uuid,
              title: title ? String(title) : null,
              content,
            })
          } catch (error) {
            console.error('[MaestraAI] Failed to parse interactive content:', error)
          }
        }
        if (originalOnLoad) originalOnLoad.apply(this, arguments)
      }
    }

    return originalOpen.apply(this, [method, url, ...args])
  }

  return xhr
}

window.XMLHttpRequest = CustomXHR

console.log('[MaestraAI] Content script loaded — waiting for group mappings...')
