// types/database.ts
// Minimal type stub. Will be replaced by Supabase CLI-generated types after migrations run.
export type Database = {
  public: {
    Tables: {
      schools: {
        Row: { id: string; name: string; city: string; plan: string; created_at: string }
        Insert: { id?: string; name: string; city?: string; plan?: string; created_at?: string }
        Update: { id?: string; name?: string; city?: string; plan?: string; created_at?: string }
      }
      teachers: {
        Row: {
          id: string
          auth_id: string
          school_id: string | null
          full_name: string
          email: string
          role: string
          subject: string | null
          richmond_email_encrypted: string | null
          richmond_password_encrypted: string | null
          created_at: string
        }
        Insert: {
          id?: string
          auth_id: string
          school_id?: string | null
          full_name: string
          email: string
          role?: string
          subject?: string | null
          richmond_email_encrypted?: string | null
          richmond_password_encrypted?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          auth_id?: string
          school_id?: string | null
          full_name?: string
          email?: string
          role?: string
          subject?: string | null
          richmond_email_encrypted?: string | null
          richmond_password_encrypted?: string | null
          created_at?: string
        }
      }
      groups: {
        Row: {
          id: string
          school_id: string
          titular_teacher_id: string
          name: string
          grade: string
          academic_year: string
          richmond_class_code: string | null
          richmond_course_module_uuid: string | null
          fixed_weekly_schedule: unknown | null
          created_at: string
        }
        Insert: {
          id?: string
          school_id: string
          titular_teacher_id: string
          name: string
          grade?: string
          academic_year: string
          richmond_class_code?: string | null
          richmond_course_module_uuid?: string | null
          fixed_weekly_schedule?: unknown | null
          created_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          titular_teacher_id?: string
          name?: string
          grade?: string
          academic_year?: string
          richmond_class_code?: string | null
          richmond_course_module_uuid?: string | null
          fixed_weekly_schedule?: unknown | null
          created_at?: string
        }
      }
      students: {
        Row: {
          id: string
          group_id: string
          first_name_encrypted: string
          last_name_encrypted: string
          richmond_username: string | null
          richmond_student_id: string | null
          level: string
          observation_day: string | null
          has_nee: boolean
          parent_contact_encrypted: string | null
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          first_name_encrypted: string
          last_name_encrypted: string
          richmond_username?: string | null
          richmond_student_id?: string | null
          level?: string
          observation_day?: string | null
          has_nee?: boolean
          parent_contact_encrypted?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          first_name_encrypted?: string
          last_name_encrypted?: string
          richmond_username?: string | null
          richmond_student_id?: string | null
          level?: string
          observation_day?: string | null
          has_nee?: boolean
          parent_contact_encrypted?: string | null
          created_at?: string
        }
      }
      teacher_diary: {
        Row: {
          id: string
          teacher_id: string
          week_start: string
          week_end: string
          q1_functioning: string | null
          q2_challenging: string | null
          q3_group: string | null
          q4_adjust: string | null
          q5_student_obs: string | null
          ai_summary: string | null
          source: string
          created_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          week_start: string
          week_end: string
          q1_functioning?: string | null
          q2_challenging?: string | null
          q3_group?: string | null
          q4_adjust?: string | null
          q5_student_obs?: string | null
          ai_summary?: string | null
          source?: string
          created_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          week_start?: string
          week_end?: string
          q1_functioning?: string | null
          q2_challenging?: string | null
          q3_group?: string | null
          q4_adjust?: string | null
          q5_student_obs?: string | null
          ai_summary?: string | null
          source?: string
          created_at?: string
        }
      }
      vocabulary_items: {
        Row: {
          id: string
          letter: string
          word: string
          color_code: string
          color_hex: string
          pair_index: number
        }
        Insert: {
          id?: string
          letter: string
          word: string
          color_code: string
          color_hex: string
          pair_index: number
        }
        Update: {
          id?: string
          letter?: string
          word?: string
          color_code?: string
          color_hex?: string
          pair_index?: number
        }
      }
    }
  }
}
