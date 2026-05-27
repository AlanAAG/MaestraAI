// components/settings/StudentRoster.tsx
// Display student roster (display_name only, no PII)

'use client'
import { Users } from 'lucide-react'

interface Student {
  id: string
  display_name: string
  richmond_student_id: string | null
}

interface StudentRosterProps {
  students: Student[]
  groupName: string
}

export function StudentRoster({ students, groupName }: StudentRosterProps) {
  if (students.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary">
        <Users size={48} className="mx-auto mb-3 text-text-disabled" />
        <p>No hay estudiantes en este grupo</p>
        <p className="text-sm mt-1">Los estudiantes se sincronizarán desde Richmond LP</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-text-primary">Estudiantes de {groupName}</h3>
        <span className="text-sm text-text-secondary">{students.length} estudiantes</span>
      </div>

      <div className="grid gap-2">
        {students.map((student, index) => (
          <div
            key={student.id}
            className="p-3 rounded-lg border border-border bg-surface hover:border-primary-light transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-primary font-medium text-sm">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="text-text-primary">{student.display_name}</p>
                {student.richmond_student_id && (
                  <p className="text-xs text-text-disabled font-mono mt-0.5">
                    Richmond ID: {student.richmond_student_id}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
