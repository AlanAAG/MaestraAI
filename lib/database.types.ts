export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      fortnights: {
        Row: {
          created_at: string | null
          end_date: string
          group_id: string
          id: string
          letter_week1: string | null
          letter_week2: string | null
          methodology_types: string[] | null
          monthly_value: string | null
          nem_ejes: string[] | null
          number: number
          number_range_week1: string | null
          number_range_week2: string | null
          project_name: string | null
          richmond_activity_pages: string | null
          richmond_student_pages: string | null
          richmond_unit: string | null
          start_date: string
          status: string | null
          teacher_id: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          group_id: string
          id?: string
          letter_week1?: string | null
          letter_week2?: string | null
          methodology_types?: string[] | null
          monthly_value?: string | null
          nem_ejes?: string[] | null
          number: number
          number_range_week1?: string | null
          number_range_week2?: string | null
          project_name?: string | null
          richmond_activity_pages?: string | null
          richmond_student_pages?: string | null
          richmond_unit?: string | null
          start_date: string
          status?: string | null
          teacher_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          group_id?: string
          id?: string
          letter_week1?: string | null
          letter_week2?: string | null
          methodology_types?: string[] | null
          monthly_value?: string | null
          nem_ejes?: string[] | null
          number?: number
          number_range_week1?: string | null
          number_range_week2?: string | null
          project_name?: string | null
          richmond_activity_pages?: string | null
          richmond_student_pages?: string | null
          richmond_unit?: string | null
          start_date?: string
          status?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fortnights_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fortnights_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      group_teachers: {
        Row: {
          day_of_week: string[] | null
          group_id: string
          subject: string
          teacher_id: string
          time_slot: string | null
        }
        Insert: {
          day_of_week?: string[] | null
          group_id: string
          subject: string
          teacher_id: string
          time_slot?: string | null
        }
        Update: {
          day_of_week?: string[] | null
          group_id?: string
          subject?: string
          teacher_id?: string
          time_slot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_teachers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_teachers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          academic_year: string
          created_at: string | null
          fixed_weekly_schedule: Json | null
          grade: string | null
          id: string
          name: string
          richmond_class_code: string | null
          richmond_course_module_uuid: string | null
          school_id: string
          titular_teacher_id: string
        }
        Insert: {
          academic_year: string
          created_at?: string | null
          fixed_weekly_schedule?: Json | null
          grade?: string | null
          id?: string
          name: string
          richmond_class_code?: string | null
          richmond_course_module_uuid?: string | null
          school_id: string
          titular_teacher_id: string
        }
        Update: {
          academic_year?: string
          created_at?: string | null
          fixed_weekly_schedule?: Json | null
          grade?: string | null
          id?: string
          name?: string
          richmond_class_code?: string | null
          richmond_course_module_uuid?: string | null
          school_id?: string
          titular_teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_titular_teacher_id_fkey"
            columns: ["titular_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_plans: {
        Row: {
          approved: boolean | null
          blocks: Json
          created_at: string | null
          date: string | null
          day_number: number
          day_of_week: string | null
          evaluation_rubric: Json | null
          fortnight_id: string
          generated_by: string | null
          id: string
          methodology: string | null
          nee_reminders: string[] | null
          nem_alignment: Json | null
          observation_students: string[] | null
          teacher_id: string
          youtube_videos: Json | null
        }
        Insert: {
          approved?: boolean | null
          blocks: Json
          created_at?: string | null
          date?: string | null
          day_number: number
          day_of_week?: string | null
          evaluation_rubric?: Json | null
          fortnight_id: string
          generated_by?: string | null
          id?: string
          methodology?: string | null
          nee_reminders?: string[] | null
          nem_alignment?: Json | null
          observation_students?: string[] | null
          teacher_id: string
          youtube_videos?: Json | null
        }
        Update: {
          approved?: boolean | null
          blocks?: Json
          created_at?: string | null
          date?: string | null
          day_number?: number
          day_of_week?: string | null
          evaluation_rubric?: Json | null
          fortnight_id?: string
          generated_by?: string | null
          id?: string
          methodology?: string | null
          nee_reminders?: string[] | null
          nem_alignment?: Json | null
          observation_students?: string[] | null
          teacher_id?: string
          youtube_videos?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_plans_fortnight_id_fkey"
            columns: ["fortnight_id"]
            isOneToOne: false
            referencedRelation: "fortnights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_plans_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          content: Json
          fortnight_id: string | null
          generated_at: string | null
          id: string
          is_projectable: boolean | null
          lesson_plan_id: string | null
          letter: string | null
          source_type: string | null
          source_url: string | null
          teacher_id: string
          type: string
          vocabulary: Json | null
        }
        Insert: {
          content: Json
          fortnight_id?: string | null
          generated_at?: string | null
          id?: string
          is_projectable?: boolean | null
          lesson_plan_id?: string | null
          letter?: string | null
          source_type?: string | null
          source_url?: string | null
          teacher_id: string
          type: string
          vocabulary?: Json | null
        }
        Update: {
          content?: Json
          fortnight_id?: string | null
          generated_at?: string | null
          id?: string
          is_projectable?: boolean | null
          lesson_plan_id?: string | null
          letter?: string | null
          source_type?: string | null
          source_url?: string | null
          teacher_id?: string
          type?: string
          vocabulary?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_fortnight_id_fkey"
            columns: ["fortnight_id"]
            isOneToOne: false
            referencedRelation: "fortnights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_lesson_plan_id_fkey"
            columns: ["lesson_plan_id"]
            isOneToOne: false
            referencedRelation: "lesson_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      report_cards: {
        Row: {
          academic_year: string
          approved_at: string | null
          created_at: string | null
          english_specific_obs: string | null
          etica_obs: string | null
          humano_comunitario_obs: string | null
          id: string
          lenguajes_obs: string | null
          nee_progress_obs: string | null
          pdf_storage_path: string | null
          saberes_obs: string | null
          status: string | null
          student_id: string
          teacher_id: string
          trimester: number
        }
        Insert: {
          academic_year: string
          approved_at?: string | null
          created_at?: string | null
          english_specific_obs?: string | null
          etica_obs?: string | null
          humano_comunitario_obs?: string | null
          id?: string
          lenguajes_obs?: string | null
          nee_progress_obs?: string | null
          pdf_storage_path?: string | null
          saberes_obs?: string | null
          status?: string | null
          student_id: string
          teacher_id: string
          trimester: number
        }
        Update: {
          academic_year?: string
          approved_at?: string | null
          created_at?: string | null
          english_specific_obs?: string | null
          etica_obs?: string | null
          humano_comunitario_obs?: string | null
          id?: string
          lenguajes_obs?: string | null
          nee_progress_obs?: string | null
          pdf_storage_path?: string | null
          saberes_obs?: string | null
          status?: string | null
          student_id?: string
          teacher_id?: string
          trimester?: number
        }
        Relationships: [
          {
            foreignKeyName: "report_cards_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      richmond_assignments: {
        Row: {
          assigned_at: string
          class_avg_score: number | null
          due_at: string
          group_id: string
          id: string
          instructions: string | null
          is_test: boolean | null
          richmond_id: string
          synced_at: string | null
          title: string
          total_students: number
          total_submitted: number
        }
        Insert: {
          assigned_at: string
          class_avg_score?: number | null
          due_at: string
          group_id: string
          id?: string
          instructions?: string | null
          is_test?: boolean | null
          richmond_id: string
          synced_at?: string | null
          title: string
          total_students?: number
          total_submitted?: number
        }
        Update: {
          assigned_at?: string
          class_avg_score?: number | null
          due_at?: string
          group_id?: string
          id?: string
          instructions?: string | null
          is_test?: boolean | null
          richmond_id?: string
          synced_at?: string | null
          title?: string
          total_students?: number
          total_submitted?: number
        }
        Relationships: [
          {
            foreignKeyName: "richmond_assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      richmond_credentials: {
        Row: {
          created_at: string | null
          expires_at: string | null
          group_id: string
          id: string
          is_valid: boolean | null
          last_validated: string | null
          session_encrypted: string
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          group_id: string
          id?: string
          is_valid?: boolean | null
          last_validated?: string | null
          session_encrypted: string
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          group_id?: string
          id?: string
          is_valid?: boolean | null
          last_validated?: string | null
          session_encrypted?: string
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "richmond_credentials_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: true
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "richmond_credentials_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      richmond_scores: {
        Row: {
          assignment_id: string
          done: boolean | null
          first_name: string
          id: string
          last_name: string
          progress: string
          richmond_student_id: string | null
          student_id: string | null
          synced_at: string | null
          total_score: number | null
        }
        Insert: {
          assignment_id: string
          done?: boolean | null
          first_name: string
          id?: string
          last_name: string
          progress: string
          richmond_student_id?: string | null
          student_id?: string | null
          synced_at?: string | null
          total_score?: number | null
        }
        Update: {
          assignment_id?: string
          done?: boolean | null
          first_name?: string
          id?: string
          last_name?: string
          progress?: string
          richmond_student_id?: string | null
          student_id?: string | null
          synced_at?: string | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "richmond_scores_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "richmond_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "richmond_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      richmond_sync_log: {
        Row: {
          assignments_synced: number | null
          completed_at: string | null
          error_message: string | null
          group_id: string
          id: string
          scores_synced: number | null
          source: string | null
          started_at: string | null
          status: string
          teacher_id: string
        }
        Insert: {
          assignments_synced?: number | null
          completed_at?: string | null
          error_message?: string | null
          group_id: string
          id?: string
          scores_synced?: number | null
          source?: string | null
          started_at?: string | null
          status?: string
          teacher_id: string
        }
        Update: {
          assignments_synced?: number | null
          completed_at?: string | null
          error_message?: string | null
          group_id?: string
          id?: string
          scores_synced?: number | null
          source?: string | null
          started_at?: string | null
          status?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "richmond_sync_log_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "richmond_sync_log_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          city: string | null
          created_at: string | null
          id: string
          name: string
          plan: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          id?: string
          name: string
          plan?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          id?: string
          name?: string
          plan?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          created_at: string | null
          display_name: string
          first_name_encrypted: string
          group_id: string
          has_nee: boolean | null
          id: string
          last_name_encrypted: string
          level: string | null
          observation_day: string | null
          parent_contact_encrypted: string | null
          richmond_student_id: string | null
          richmond_username: string | null
          special_needs_encrypted: string | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          first_name_encrypted: string
          group_id: string
          has_nee?: boolean | null
          id?: string
          last_name_encrypted: string
          level?: string | null
          observation_day?: string | null
          parent_contact_encrypted?: string | null
          richmond_student_id?: string | null
          richmond_username?: string | null
          special_needs_encrypted?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          first_name_encrypted?: string
          group_id?: string
          has_nee?: boolean | null
          id?: string
          last_name_encrypted?: string
          level?: string | null
          observation_day?: string | null
          parent_contact_encrypted?: string | null
          richmond_student_id?: string | null
          richmond_username?: string | null
          special_needs_encrypted?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_diary: {
        Row: {
          ai_summary: string | null
          created_at: string | null
          id: string
          q1_functioning: string | null
          q2_challenging: string | null
          q3_group: string | null
          q4_adjust: string | null
          q5_student_obs: string | null
          source: string | null
          teacher_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          ai_summary?: string | null
          created_at?: string | null
          id?: string
          q1_functioning?: string | null
          q2_challenging?: string | null
          q3_group?: string | null
          q4_adjust?: string | null
          q5_student_obs?: string | null
          source?: string | null
          teacher_id: string
          week_end: string
          week_start: string
        }
        Update: {
          ai_summary?: string | null
          created_at?: string | null
          id?: string
          q1_functioning?: string | null
          q2_challenging?: string | null
          q3_group?: string | null
          q4_adjust?: string | null
          q5_student_obs?: string | null
          source?: string | null
          teacher_id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_diary_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_observations: {
        Row: {
          created_at: string | null
          id: string
          lesson_plan_id: string | null
          notes_encrypted: string | null
          observed_date: string
          rubric_results: Json | null
          student_id: string
          teacher_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lesson_plan_id?: string | null
          notes_encrypted?: string | null
          observed_date: string
          rubric_results?: Json | null
          student_id: string
          teacher_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lesson_plan_id?: string | null
          notes_encrypted?: string | null
          observed_date?: string
          rubric_results?: Json | null
          student_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_observations_lesson_plan_id_fkey"
            columns: ["lesson_plan_id"]
            isOneToOne: false
            referencedRelation: "lesson_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_observations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_observations_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          auth_id: string
          created_at: string | null
          email: string
          full_name: string
          id: string
          richmond_email_encrypted: string | null
          richmond_password_encrypted: string | null
          role: string | null
          school_id: string | null
          subject: string | null
        }
        Insert: {
          auth_id: string
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          richmond_email_encrypted?: string | null
          richmond_password_encrypted?: string | null
          role?: string | null
          school_id?: string | null
          subject?: string | null
        }
        Update: {
          auth_id?: string
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          richmond_email_encrypted?: string | null
          richmond_password_encrypted?: string | null
          role?: string | null
          school_id?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_logs: {
        Row: {
          count: number | null
          created_at: string | null
          feature: string
          id: string
          period_end: string
          period_start: string
          teacher_id: string
        }
        Insert: {
          count?: number | null
          created_at?: string | null
          feature: string
          id?: string
          period_end: string
          period_start: string
          teacher_id: string
        }
        Update: {
          count?: number | null
          created_at?: string | null
          feature?: string
          id?: string
          period_end?: string
          period_start?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      vocabulary_items: {
        Row: {
          color_code: string
          color_hex: string
          id: string
          letter: string
          pair_index: number
          word: string
        }
        Insert: {
          color_code: string
          color_hex: string
          id?: string
          letter: string
          pair_index: number
          word: string
        }
        Update: {
          color_code?: string
          color_hex?: string
          id?: string
          letter?: string
          pair_index?: number
          word?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
