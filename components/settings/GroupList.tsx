// components/settings/GroupList.tsx
// Display teacher's groups with student counts and actions

'use client'
import { Button } from '@/components/ui/button'
import { Edit, Users, Trash2 } from 'lucide-react'

interface Group {
  id: string
  name: string
  grade: string
  academic_year: string
  richmond_group_slug: string | null
  student_count: number
}

interface GroupListProps {
  groups: Group[]
  onEdit: (groupId: string) => void
  onViewStudents: (groupId: string) => void
  onDelete: (groupId: string) => void
}

export function GroupList({ groups, onEdit, onViewStudents, onDelete }: GroupListProps) {
  if (groups.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary">
        <p>No tienes grupos creados</p>
        <p className="text-sm mt-1">Crea tu primer grupo para comenzar</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div
          key={group.id}
          className="p-4 rounded-lg border border-border bg-surface hover:border-primary-light transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-medium text-text-primary">{group.name}</h3>
              <div className="flex gap-4 mt-1 text-sm text-text-secondary">
                <span>{group.grade}</span>
                <span>•</span>
                <span>{group.academic_year}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users size={14} />
                  {group.student_count} estudiantes
                </span>
              </div>
              {group.richmond_group_slug && (
                <div className="mt-2">
                  <span className="inline-block px-2 py-0.5 rounded text-xs bg-primary-light text-primary font-mono">
                    Richmond: {group.richmond_group_slug}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => onViewStudents(group.id)}
                variant="outline"
                size="sm"
                className="min-h-[36px]"
              >
                <Users size={16} className="mr-1" />
                Ver estudiantes
              </Button>
              <Button
                onClick={() => onEdit(group.id)}
                variant="outline"
                size="sm"
                className="min-h-[36px]"
              >
                <Edit size={16} />
              </Button>
              <Button
                onClick={() => onDelete(group.id)}
                variant="outline"
                size="sm"
                className="min-h-[36px] text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
