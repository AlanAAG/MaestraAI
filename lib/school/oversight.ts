// Pure grouping for the director's read-only supervision view.

export interface TeacherSummary<P, M, G> {
  teacherId: string
  planes: P[]
  materiales: M[]
  posts: G[]
}

export function summarizeByTeacher<
  P extends { teacher_id: string },
  M extends { teacher_id: string },
  G extends { teacher_id: string },
>(planes: P[], materiales: M[], posts: G[]): TeacherSummary<P, M, G>[] {
  const byId = new Map<string, TeacherSummary<P, M, G>>()
  const get = (id: string) => {
    let s = byId.get(id)
    if (!s) {
      s = { teacherId: id, planes: [], materiales: [], posts: [] }
      byId.set(id, s)
    }
    return s
  }
  for (const p of planes) get(p.teacher_id).planes.push(p)
  for (const m of materiales) get(m.teacher_id).materiales.push(m)
  for (const g of posts) get(g.teacher_id).posts.push(g)
  return Array.from(byId.values())
}
