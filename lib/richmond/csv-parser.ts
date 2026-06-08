import { read, utils } from 'xlsx'
import { distance } from 'fastest-levenshtein'

export type ParsedStudent = {
  name: string
  firstName: string
  lastName: string
  classCode?: string
  matchedStudentId?: string
  matchConfidence?: number
}

export type ParsedAssignment = {
  title: string
  dueDate?: string
  submissions: {
    studentName: string
    rawValue: number | null
    progress: string
  }[]
}

export type ParsedCSVData = {
  assignments: ParsedAssignment[]
  students: ParsedStudent[]
  groupAssignments: Map<string, ParsedAssignment[]>
  detectedClasses: { classCode: string; studentCount: number }[]
}

type CSVRow = Record<string, string | number | null>

/**
 * Parse CSV/XLSX file from Richmond Markbook export
 * Stores raw Richmond data for reference only
 */
export async function parseRichmondCSV(
  file: File | Buffer
): Promise<{ data: ParsedCSVData; error?: string }> {
  try {
    let arrayBuffer: ArrayBuffer

    if (file instanceof File) {
      arrayBuffer = await file.arrayBuffer()
    } else {
      const slice = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)
      arrayBuffer = slice instanceof ArrayBuffer ? slice : new ArrayBuffer(0)
    }

    const workbook = read(arrayBuffer, { type: 'array' })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const rawData = utils.sheet_to_json(worksheet) as CSVRow[]

    if (rawData.length === 0) {
      return { data: emptyData(), error: 'CSV file is empty' }
    }

    // Detect column names (flexible header detection)
    const headers = Object.keys(rawData[0])
    const columnMap = detectColumns(headers)

    if (!columnMap.studentName) {
      return {
        data: emptyData(),
        error:
          'Could not find student name column. Expected headers like "Student", "Name", "Alumno"',
      }
    }

    // Extract data
    const studentClassMap = new Map<string, string>() // name → classCode
    const assignmentMap = new Map<string, ParsedAssignment>()

    // Find all assignment columns (any column that's not student name, group, etc.)
    const assignmentColumns = headers.filter(
      (h) =>
        h !== columnMap.studentName &&
        h !== columnMap.group &&
        !h.toLowerCase().includes('email') &&
        !h.toLowerCase().includes('id')
    )

    for (const row of rawData) {
      const studentName = normalizeStudentName(String(row[columnMap.studentName] || ''))
      if (!studentName) continue

      // Capture class code from the group column if present
      const classCode = columnMap.group
        ? normalizeStudentName(String(row[columnMap.group] || ''))
            .toLowerCase()
            .replace(/\s+/g, '-')
        : undefined
      if (classCode) {
        studentClassMap.set(studentName, classCode)
      } else if (!studentClassMap.has(studentName)) {
        studentClassMap.set(studentName, '')
      }

      // Process each assignment column
      for (const assignmentCol of assignmentColumns) {
        const rawValue = row[assignmentCol]
        let numValue: number | null = null
        let progress = 'not_started'

        if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
          const parsed = Number(rawValue)
          if (!isNaN(parsed)) {
            numValue = parsed
            progress = parsed > 0 ? 'completed' : 'not_started'
          }
        }

        if (!assignmentMap.has(assignmentCol)) {
          assignmentMap.set(assignmentCol, {
            title: assignmentCol,
            submissions: [],
          })
        }

        assignmentMap.get(assignmentCol)!.submissions.push({
          studentName,
          rawValue: numValue,
          progress,
        })
      }
    }

    const students = Array.from(studentClassMap.entries()).map(([name, classCode]) => ({
      ...parseStudentName(name),
      classCode: classCode || undefined,
    }))

    // Aggregate detected classes with student counts
    const classCountMap = new Map<string, number>()
    for (const classCode of Array.from(studentClassMap.values())) {
      if (classCode) {
        classCountMap.set(classCode, (classCountMap.get(classCode) || 0) + 1)
      }
    }
    const detectedClasses = Array.from(classCountMap.entries()).map(
      ([classCode, studentCount]) => ({
        classCode,
        studentCount,
      })
    )

    return {
      data: {
        assignments: Array.from(assignmentMap.values()),
        students,
        groupAssignments: new Map(), // Will be populated after matching
        detectedClasses,
      },
    }
  } catch (error) {
    return {
      data: emptyData(),
      error: error instanceof Error ? error.message : 'Failed to parse CSV',
    }
  }
}

/**
 * Match parsed students to existing students in DB using fuzzy matching
 */
export function matchStudents(
  parsedStudents: ParsedStudent[],
  dbStudents: { id: string; first_name_encrypted: string; last_name_encrypted: string }[]
): ParsedStudent[] {
  return parsedStudents.map((parsed) => {
    let bestMatch: { id: string; confidence: number } | null = null

    for (const db of dbStudents) {
      const dbFullName = `${db.first_name_encrypted} ${db.last_name_encrypted}`.toLowerCase()
      const parsedFullName = parsed.name.toLowerCase()

      // Calculate Levenshtein distance
      const dist = distance(parsedFullName, dbFullName)
      const maxLen = Math.max(parsedFullName.length, dbFullName.length)
      const confidence = maxLen > 0 ? 1 - dist / maxLen : 0

      // Also check first name match
      const firstNameDist = distance(
        parsed.firstName.toLowerCase(),
        db.first_name_encrypted.toLowerCase()
      )
      const firstNameConfidence =
        1 - firstNameDist / Math.max(parsed.firstName.length, db.first_name_encrypted.length)

      // Use best of full name or first name match
      const finalConfidence = Math.max(confidence, firstNameConfidence * 0.8)

      if (finalConfidence > 0.6 && (!bestMatch || finalConfidence > bestMatch.confidence)) {
        bestMatch = { id: db.id, confidence: finalConfidence }
      }
    }

    return {
      ...parsed,
      matchedStudentId: bestMatch?.id,
      matchConfidence: bestMatch?.confidence,
    }
  })
}

/**
 * Detect column names from headers
 */
function detectColumns(headers: string[]): {
  studentName: string | null
  group: string | null
} {
  const lowerHeaders = headers.map((h) => h.toLowerCase())

  const studentNameIndex = lowerHeaders.findIndex(
    (h) =>
      h.includes('student') ||
      h.includes('name') ||
      h.includes('alumno') ||
      h.includes('nombre') ||
      h === 'estudiante'
  )

  const groupIndex = lowerHeaders.findIndex(
    (h) => h.includes('group') || h.includes('grupo') || h.includes('class')
  )

  return {
    studentName: studentNameIndex !== -1 ? headers[studentNameIndex] : null,
    group: groupIndex !== -1 ? headers[groupIndex] : null,
  }
}

/**
 * Normalize student name (trim, remove extra spaces)
 */
function normalizeStudentName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

/**
 * Parse full name into first and last name
 */
function parseStudentName(fullName: string): ParsedStudent {
  const normalized = normalizeStudentName(fullName)
  const parts = normalized.split(' ')

  return {
    name: normalized,
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  }
}

/**
 * Empty data structure
 */
function emptyData(): ParsedCSVData {
  return {
    assignments: [],
    students: [],
    groupAssignments: new Map(),
    detectedClasses: [],
  }
}
