// School branding for white-label surfaces. All getters are best-effort: any error or
// missing school → null → callers fall back to the MaestraIA default header.

export interface SchoolBrand {
  name: string
  logoUrl: string | null
  brandColor: string | null
}

/** One distinct school id → that id; zero or several → null (mixed-school parents get the
 *  neutral default). Pure — unit-tested. */
export function resolveSingleSchool(ids: (string | null | undefined)[]): string | null {
  const distinct = Array.from(new Set(ids.filter((x): x is string => !!x)))
  return distinct.length === 1 ? distinct[0] : null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getBrandBySchoolId(
  service: any,
  schoolId: string
): Promise<SchoolBrand | null> {
  try {
    const { data } = await service
      .from('schools')
      .select('name, logo_url, brand_color')
      .eq('id', schoolId)
      .maybeSingle()
    if (!data) return null
    return { name: data.name, logoUrl: data.logo_url ?? null, brandColor: data.brand_color ?? null }
  } catch {
    return null
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getBrandByTeacherId(
  service: any,
  teacherId: string
): Promise<SchoolBrand | null> {
  try {
    const { data: teacher } = await service
      .from('teachers')
      .select('school_id')
      .eq('id', teacherId)
      .maybeSingle()
    if (!teacher?.school_id) return null
    return getBrandBySchoolId(service, teacher.school_id)
  } catch {
    return null
  }
}

/** The signed-in parent's school brand — only when every linked child resolves to ONE school. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getBrandForParent(
  service: any,
  studentIds: string[]
): Promise<SchoolBrand | null> {
  if (!studentIds.length) return null
  try {
    const { data: students } = await service
      .from('students')
      .select('id, groups(school_id)')
      .in('id', studentIds)
    const schoolId = resolveSingleSchool(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (students ?? []).map((s: any) => s.groups?.school_id)
    )
    return schoolId ? getBrandBySchoolId(service, schoolId) : null
  } catch {
    return null
  }
}
