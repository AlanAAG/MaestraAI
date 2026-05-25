// lib/richmond/client.ts
import { decryptSession } from './crypto'

const RICHMOND_BASE_URL = 'https://richmondlp.com'
const RATE_LIMIT_MS = 2000 // 2 seconds between requests

export class RichmondSessionExpiredError extends Error {
  constructor(message = 'Richmond session expired') {
    super(message)
    this.name = 'RichmondSessionExpiredError'
  }
}

export interface RichmondStudentScore {
  richmond_student_id: string
  first_name: string
  last_name: string
  progress: 'completed' | 'not_started' | 'started'
  total_score: number | null
  done: boolean
}

export interface RichmondAssignment {
  id: string
  title: string
  instructions: string | null
  assigned_at: string
  due_at: string
  total_students: number
  total_submitted: number
  class_avg_score: number | null
  students: RichmondStudentScore[]
}

interface RichmondApiResponse {
  id: string
  title: string
  instructions?: string
  start_date: string
  end_date: string
  total_students: number
  total_submitted: number
  score?: string
  students: Array<{
    id: string
    first_name: string
    last_name: string
    progress: string
    total_score: string | null
    done: boolean
  }>
}

let lastRequestTime = 0

async function rateLimitedFetch(url: string, options: RequestInit): Promise<Response> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - timeSinceLastRequest))
  }
  lastRequestTime = Date.now()
  return fetch(url, options)
}

/**
 * Fetches assignment scores from Richmond API for a given course module.
 * Handles pagination (max 2 pages).
 * Throws RichmondSessionExpiredError on 401 or redirect to /login.
 */
export async function fetchAssignmentScores(
  courseModuleUuid: string,
  encryptedSession: string
): Promise<RichmondAssignment[]> {
  const sessionCookie = await decryptSession(encryptedSession)

  const baseUrl = `${RICHMOND_BASE_URL}/api/course_modules/${courseModuleUuid}/assignment_scores.json`
  const params = new URLSearchParams({
    include: 'students',
    'filter[is_test]': 'false',
  })

  // Fetch page 1
  const page1Url = `${baseUrl}?${params.toString()}`
  const page1Response = await rateLimitedFetch(page1Url, {
    headers: {
      Cookie: `_unity_web_session=${sessionCookie}`,
      Accept: 'application/json',
    },
    redirect: 'manual',
  })

  // Check for session expiration
  if (page1Response.status === 302 || page1Response.status === 401) {
    const location = page1Response.headers.get('location')
    if (location?.includes('/login')) {
      throw new RichmondSessionExpiredError()
    }
    throw new RichmondSessionExpiredError()
  }

  if (!page1Response.ok) {
    throw new Error(`Richmond API error: ${page1Response.status}`)
  }

  const page1Data: RichmondApiResponse[] = await page1Response.json()
  let allData = page1Data

  // Check for page 2 in Link header
  const linkHeader = page1Response.headers.get('link')
  if (linkHeader?.includes('rel="next"')) {
    const page2Url = `${baseUrl}?${params.toString()}&page=2`
    const page2Response = await rateLimitedFetch(page2Url, {
      headers: {
        Cookie: `_unity_web_session=${sessionCookie}`,
        Accept: 'application/json',
      },
      redirect: 'manual',
    })

    if (page2Response.status === 302 || page2Response.status === 401) {
      throw new RichmondSessionExpiredError()
    }

    if (page2Response.ok) {
      const page2Data: RichmondApiResponse[] = await page2Response.json()
      allData = [...allData, ...page2Data]
    }
  }

  // Map to our schema
  return allData.map((item) => ({
    id: item.id,
    title: item.title,
    instructions: item.instructions ?? null,
    assigned_at: item.start_date,
    due_at: item.end_date,
    total_students: item.total_students,
    total_submitted: item.total_submitted,
    class_avg_score: item.score ? parseFloat(item.score) : null,
    students: item.students.map((student) => ({
      richmond_student_id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      progress: student.progress as 'completed' | 'not_started' | 'started',
      total_score: student.total_score ? parseFloat(student.total_score) : null,
      done: student.done,
    })),
  }))
}
