export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          teacher_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          teacher_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'api_keys_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          teacher_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          teacher_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          teacher_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'audit_logs_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
          },
        ]
      }
      consent_records: {
        Row: {
          consent_type: string
          granted: boolean
          granted_at: string | null
          id: string
          ip_address: string | null
          teacher_id: string
          user_agent: string | null
        }
        Insert: {
          consent_type: string
          granted: boolean
          granted_at?: string | null
          id?: string
          ip_address?: string | null
          teacher_id: string
          user_agent?: string | null
        }
        Update: {
          consent_type?: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_address?: string | null
          teacher_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'consent_records_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
          },
        ]
      }
      failed_auth_attempts: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          ip_address: string | null
          reason: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
          reason?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
          reason?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      fortnight_packs: {
        Row: {
          created_at: string | null
          error_msg: string | null
          fortnight_id: string
          id: string
          material_ids: string[]
          materials_state: Json | null
          progress: Json | null
          status: string
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_msg?: string | null
          fortnight_id: string
          id?: string
          material_ids?: string[]
          materials_state?: Json | null
          progress?: Json | null
          status?: string
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_msg?: string | null
          fortnight_id?: string
          id?: string
          material_ids?: string[]
          materials_state?: Json | null
          progress?: Json | null
          status?: string
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'fortnight_packs_fortnight_id_fkey'
            columns: ['fortnight_id']
            isOneToOne: false
            referencedRelation: 'fortnights'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fortnight_packs_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
          },
        ]
      }
      fortnights: {
        Row: {
          created_at: string | null
          end_date: string
          grade: string | null
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
          observation_calendar: Json | null
          physical_materials: string[] | null
          plan_document: Json | null
          plan_type: string
          project_name: string | null
          project_notes: string | null
          richmond_activity_pages: string | null
          richmond_book_pages: Json | null
          richmond_lesson_group_ids: string[] | null
          richmond_student_pages: string | null
          richmond_unit: string | null
          richmond_unit_id: string | null
          start_date: string
          status: string | null
          teacher_id: string
          teacher_notes: string | null
          unidades_didacticas: Json | null
          use_system_template: boolean
          vocabulary: string[] | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          grade?: string | null
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
          observation_calendar?: Json | null
          physical_materials?: string[] | null
          plan_document?: Json | null
          plan_type?: string
          project_name?: string | null
          project_notes?: string | null
          richmond_activity_pages?: string | null
          richmond_book_pages?: Json | null
          richmond_lesson_group_ids?: string[] | null
          richmond_student_pages?: string | null
          richmond_unit?: string | null
          richmond_unit_id?: string | null
          start_date: string
          status?: string | null
          teacher_id: string
          teacher_notes?: string | null
          unidades_didacticas?: Json | null
          use_system_template?: boolean
          vocabulary?: string[] | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          grade?: string | null
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
          observation_calendar?: Json | null
          physical_materials?: string[] | null
          plan_document?: Json | null
          plan_type?: string
          project_name?: string | null
          project_notes?: string | null
          richmond_activity_pages?: string | null
          richmond_book_pages?: Json | null
          richmond_lesson_group_ids?: string[] | null
          richmond_student_pages?: string | null
          richmond_unit?: string | null
          richmond_unit_id?: string | null
          start_date?: string
          status?: string | null
          teacher_id?: string
          teacher_notes?: string | null
          unidades_didacticas?: Json | null
          use_system_template?: boolean
          vocabulary?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: 'fortnights_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fortnights_richmond_unit_id_fkey'
            columns: ['richmond_unit_id']
            isOneToOne: false
            referencedRelation: 'richmond_units'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fortnights_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
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
            foreignKeyName: 'group_teachers_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'group_teachers_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
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
          richmond_group_name: string | null
          richmond_group_slug: string | null
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
          richmond_group_name?: string | null
          richmond_group_slug?: string | null
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
          richmond_group_name?: string | null
          richmond_group_slug?: string | null
          school_id?: string
          titular_teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'groups_school_id_fkey'
            columns: ['school_id']
            isOneToOne: false
            referencedRelation: 'schools'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'groups_titular_teacher_id_fkey'
            columns: ['titular_teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
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
          vocabulary: string[] | null
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
          vocabulary?: string[] | null
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
          vocabulary?: string[] | null
          youtube_videos?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'lesson_plans_fortnight_id_fkey'
            columns: ['fortnight_id']
            isOneToOne: false
            referencedRelation: 'fortnights'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lesson_plans_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
          },
        ]
      }
      materials: {
        Row: {
          content: Json
          difficulty_level: string | null
          fortnight_id: string | null
          fortnight_pack_id: string | null
          generated_at: string | null
          id: string
          is_projectable: boolean | null
          lesson_plan_id: string | null
          letter: string | null
          play_token: string | null
          shared_with_parents: boolean
          source_transcript: string | null
          source_type: string | null
          source_url: string | null
          teacher_id: string
          type: string
          video_type: string | null
          vocabulary: Json | null
        }
        Insert: {
          content: Json
          difficulty_level?: string | null
          fortnight_id?: string | null
          fortnight_pack_id?: string | null
          generated_at?: string | null
          id?: string
          is_projectable?: boolean | null
          lesson_plan_id?: string | null
          letter?: string | null
          play_token?: string | null
          shared_with_parents?: boolean
          source_transcript?: string | null
          source_type?: string | null
          source_url?: string | null
          teacher_id: string
          type: string
          video_type?: string | null
          vocabulary?: Json | null
        }
        Update: {
          content?: Json
          difficulty_level?: string | null
          fortnight_id?: string | null
          fortnight_pack_id?: string | null
          generated_at?: string | null
          id?: string
          is_projectable?: boolean | null
          lesson_plan_id?: string | null
          letter?: string | null
          play_token?: string | null
          shared_with_parents?: boolean
          source_transcript?: string | null
          source_type?: string | null
          source_url?: string | null
          teacher_id?: string
          type?: string
          video_type?: string | null
          vocabulary?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'materials_fortnight_id_fkey'
            columns: ['fortnight_id']
            isOneToOne: false
            referencedRelation: 'fortnights'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'materials_fortnight_pack_id_fkey'
            columns: ['fortnight_pack_id']
            isOneToOne: false
            referencedRelation: 'fortnight_packs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'materials_lesson_plan_id_fkey'
            columns: ['lesson_plan_id']
            isOneToOne: false
            referencedRelation: 'lesson_plans'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'materials_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
          },
        ]
      }
      parent_contacts: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          parent_email_encrypted: string
          parent_name_encrypted: string | null
          richmond_student_id: string
          student_first_name_encrypted: string | null
          student_last_name_encrypted: string | null
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          parent_email_encrypted: string
          parent_name_encrypted?: string | null
          richmond_student_id: string
          student_first_name_encrypted?: string | null
          student_last_name_encrypted?: string | null
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          parent_email_encrypted?: string
          parent_name_encrypted?: string | null
          richmond_student_id?: string
          student_first_name_encrypted?: string | null
          student_last_name_encrypted?: string | null
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'parent_contacts_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'parent_contacts_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
          },
        ]
      }
      parent_links: {
        Row: {
          claimed_at: string | null
          created_at: string
          expires_at: string
          id: string
          invite_email_encrypted: string
          invite_token: string
          parent_auth_id: string | null
          revoked_at: string | null
          student_id: string
          teacher_id: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          invite_email_encrypted: string
          invite_token: string
          parent_auth_id?: string | null
          revoked_at?: string | null
          student_id: string
          teacher_id: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invite_email_encrypted?: string
          invite_token?: string
          parent_auth_id?: string | null
          revoked_at?: string | null
          student_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'parent_links_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'parent_links_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
          },
        ]
      }
      plan_corrections: {
        Row: {
          created_at: string | null
          edited: string | null
          fortnight_id: string | null
          id: string
          original: string | null
          section: string
          teacher_id: string
        }
        Insert: {
          created_at?: string | null
          edited?: string | null
          fortnight_id?: string | null
          id?: string
          original?: string | null
          section: string
          teacher_id: string
        }
        Update: {
          created_at?: string | null
          edited?: string | null
          fortnight_id?: string | null
          id?: string
          original?: string | null
          section?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'plan_corrections_fortnight_id_fkey'
            columns: ['fortnight_id']
            isOneToOne: false
            referencedRelation: 'fortnights'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'plan_corrections_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
          },
        ]
      }
      planeacion_embeddings: {
        Row: {
          content: string | null
          created_at: string | null
          embedding: string | null
          fortnight_id: string
          project_name: string | null
          teacher_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          embedding?: string | null
          fortnight_id: string
          project_name?: string | null
          teacher_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          embedding?: string | null
          fortnight_id?: string
          project_name?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'planeacion_embeddings_fortnight_id_fkey'
            columns: ['fortnight_id']
            isOneToOne: true
            referencedRelation: 'fortnights'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'planeacion_embeddings_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
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
            foreignKeyName: 'report_cards_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'report_cards_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
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
            foreignKeyName: 'richmond_assignments_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
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
          revoked_at: string | null
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
          revoked_at?: string | null
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
          revoked_at?: string | null
          session_encrypted?: string
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'richmond_credentials_group_id_fkey'
            columns: ['group_id']
            isOneToOne: true
            referencedRelation: 'groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'richmond_credentials_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
          },
        ]
      }
      richmond_interactive_content: {
        Row: {
          captured_at: string | null
          content_raw: Json
          interactive_uuid: string
          teacher_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          captured_at?: string | null
          content_raw?: Json
          interactive_uuid: string
          teacher_id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          captured_at?: string | null
          content_raw?: Json
          interactive_uuid?: string
          teacher_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'richmond_interactive_content_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
          },
        ]
      }
      richmond_lesson_groups: {
        Row: {
          id: string
          language_models: string[]
          learning_goals: string[]
          lesson_end: number
          lesson_range: string
          lesson_start: number
          sort_order: number
          unit_id: string | null
          vocabulary: string[]
        }
        Insert: {
          id?: string
          language_models?: string[]
          learning_goals?: string[]
          lesson_end: number
          lesson_range: string
          lesson_start: number
          sort_order: number
          unit_id?: string | null
          vocabulary?: string[]
        }
        Update: {
          id?: string
          language_models?: string[]
          learning_goals?: string[]
          lesson_end?: number
          lesson_range?: string
          lesson_start?: number
          sort_order?: number
          unit_id?: string | null
          vocabulary?: string[]
        }
        Relationships: [
          {
            foreignKeyName: 'richmond_lesson_groups_unit_id_fkey'
            columns: ['unit_id']
            isOneToOne: false
            referencedRelation: 'richmond_units'
            referencedColumns: ['id']
          },
        ]
      }
      richmond_scores: {
        Row: {
          assignment_id: string
          done: boolean | null
          first_name_encrypted: string | null
          id: string
          last_name_encrypted: string | null
          progress: string
          richmond_student_id: string | null
          student_id: string | null
          synced_at: string | null
          total_score: number | null
        }
        Insert: {
          assignment_id: string
          done?: boolean | null
          first_name_encrypted?: string | null
          id?: string
          last_name_encrypted?: string | null
          progress: string
          richmond_student_id?: string | null
          student_id?: string | null
          synced_at?: string | null
          total_score?: number | null
        }
        Update: {
          assignment_id?: string
          done?: boolean | null
          first_name_encrypted?: string | null
          id?: string
          last_name_encrypted?: string | null
          progress?: string
          richmond_student_id?: string | null
          student_id?: string | null
          synced_at?: string | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'richmond_scores_assignment_id_fkey'
            columns: ['assignment_id']
            isOneToOne: false
            referencedRelation: 'richmond_assignments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'richmond_scores_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
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
            foreignKeyName: 'richmond_sync_log_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'richmond_sync_log_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
          },
        ]
      }
      richmond_units: {
        Row: {
          book_code: string
          created_at: string | null
          id: string
          unit_number: number
          unit_title: string
        }
        Insert: {
          book_code: string
          created_at?: string | null
          id?: string
          unit_number: number
          unit_title: string
        }
        Update: {
          book_code?: string
          created_at?: string | null
          id?: string
          unit_number?: number
          unit_title?: string
        }
        Relationships: []
      }
      school_announcements: {
        Row: {
          author_teacher_id: string | null
          content: string
          created_at: string | null
          expires_at: string | null
          id: string
          priority: string | null
          published_at: string | null
          school_id: string
          title: string
        }
        Insert: {
          author_teacher_id?: string | null
          content: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          priority?: string | null
          published_at?: string | null
          school_id: string
          title: string
        }
        Update: {
          author_teacher_id?: string | null
          content?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          priority?: string | null
          published_at?: string | null
          school_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: 'school_announcements_author_teacher_id_fkey'
            columns: ['author_teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'school_announcements_school_id_fkey'
            columns: ['school_id']
            isOneToOne: false
            referencedRelation: 'schools'
            referencedColumns: ['id']
          },
        ]
      }
      schools: {
        Row: {
          city: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          plan: string | null
          state: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          plan?: string | null
          state?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          plan?: string | null
          state?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          created_at: string | null
          first_name_encrypted: string
          group_id: string
          has_nee: boolean | null
          id: string
          import_source: string | null
          last_name_encrypted: string
          level: string | null
          nee_notes_encrypted: string | null
          observation_day: string | null
          parent_contact_encrypted: string | null
          richmond_student_id: string | null
          richmond_username: string | null
        }
        Insert: {
          created_at?: string | null
          first_name_encrypted: string
          group_id: string
          has_nee?: boolean | null
          id?: string
          import_source?: string | null
          last_name_encrypted: string
          level?: string | null
          nee_notes_encrypted?: string | null
          observation_day?: string | null
          parent_contact_encrypted?: string | null
          richmond_student_id?: string | null
          richmond_username?: string | null
        }
        Update: {
          created_at?: string | null
          first_name_encrypted?: string
          group_id?: string
          has_nee?: boolean | null
          id?: string
          import_source?: string | null
          last_name_encrypted?: string
          level?: string | null
          nee_notes_encrypted?: string | null
          observation_day?: string | null
          parent_contact_encrypted?: string | null
          richmond_student_id?: string | null
          richmond_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'students_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
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
          share_expires_at: string | null
          share_token: string | null
          source: string | null
          teacher_id: string
          visibility: string | null
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
          share_expires_at?: string | null
          share_token?: string | null
          source?: string | null
          teacher_id: string
          visibility?: string | null
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
          share_expires_at?: string | null
          share_token?: string | null
          source?: string | null
          teacher_id?: string
          visibility?: string | null
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: 'teacher_diary_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
          },
        ]
      }
      teacher_learned_profile: {
        Row: {
          plan_type: string
          preferences: string | null
          profile: Json
          refreshed_at: string | null
          source_count: number | null
          teacher_id: string
        }
        Insert: {
          plan_type?: string
          preferences?: string | null
          profile?: Json
          refreshed_at?: string | null
          source_count?: number | null
          teacher_id: string
        }
        Update: {
          plan_type?: string
          preferences?: string | null
          profile?: Json
          refreshed_at?: string | null
          source_count?: number | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'teacher_learned_profile_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
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
            foreignKeyName: 'teacher_observations_lesson_plan_id_fkey'
            columns: ['lesson_plan_id']
            isOneToOne: false
            referencedRelation: 'lesson_plans'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'teacher_observations_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'teacher_observations_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
          },
        ]
      }
      teacher_plan_templates: {
        Row: {
          created_at: string | null
          id: string
          is_school_official: boolean
          label: string
          plan_type: string
          school_id: string | null
          shared_with_school: boolean
          teacher_id: string
          template: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_school_official?: boolean
          label: string
          plan_type?: string
          school_id?: string | null
          shared_with_school?: boolean
          teacher_id: string
          template: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          is_school_official?: boolean
          label?: string
          plan_type?: string
          school_id?: string | null
          shared_with_school?: boolean
          teacher_id?: string
          template?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'teacher_plan_templates_school_id_fkey'
            columns: ['school_id']
            isOneToOne: false
            referencedRelation: 'schools'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'teacher_plan_templates_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
          },
        ]
      }
      teacher_resources: {
        Row: {
          created_at: string | null
          description: string | null
          downloads_count: number | null
          file_url: string | null
          grade_level: string | null
          id: string
          resource_type: string | null
          school_id: string
          tags: string[] | null
          teacher_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          downloads_count?: number | null
          file_url?: string | null
          grade_level?: string | null
          id?: string
          resource_type?: string | null
          school_id: string
          tags?: string[] | null
          teacher_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          downloads_count?: number | null
          file_url?: string | null
          grade_level?: string | null
          id?: string
          resource_type?: string | null
          school_id?: string
          tags?: string[] | null
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: 'teacher_resources_school_id_fkey'
            columns: ['school_id']
            isOneToOne: false
            referencedRelation: 'schools'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'teacher_resources_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
          },
        ]
      }
      teachers: {
        Row: {
          auth_id: string
          created_at: string | null
          deleted_at: string | null
          design_settings: Json | null
          editorial: string | null
          email: string
          english_period_minutes: number | null
          full_name: string
          grade: string | null
          id: string
          parent_email_template: Json | null
          plan_template: Json | null
          profile_notes: string | null
          richmond_email_encrypted: string | null
          richmond_password_encrypted: string | null
          richmond_vocab_seeded_at: string | null
          role_type: string | null
          school_id: string | null
          subject: string | null
          teaching_style: string | null
        }
        Insert: {
          auth_id: string
          created_at?: string | null
          deleted_at?: string | null
          design_settings?: Json | null
          editorial?: string | null
          email: string
          english_period_minutes?: number | null
          full_name: string
          grade?: string | null
          id?: string
          parent_email_template?: Json | null
          plan_template?: Json | null
          profile_notes?: string | null
          richmond_email_encrypted?: string | null
          richmond_password_encrypted?: string | null
          richmond_vocab_seeded_at?: string | null
          role_type?: string | null
          school_id?: string | null
          subject?: string | null
          teaching_style?: string | null
        }
        Update: {
          auth_id?: string
          created_at?: string | null
          deleted_at?: string | null
          design_settings?: Json | null
          editorial?: string | null
          email?: string
          english_period_minutes?: number | null
          full_name?: string
          grade?: string | null
          id?: string
          parent_email_template?: Json | null
          plan_template?: Json | null
          profile_notes?: string | null
          richmond_email_encrypted?: string | null
          richmond_password_encrypted?: string | null
          richmond_vocab_seeded_at?: string | null
          role_type?: string | null
          school_id?: string | null
          subject?: string | null
          teaching_style?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'teachers_school_id_fkey'
            columns: ['school_id']
            isOneToOne: false
            referencedRelation: 'schools'
            referencedColumns: ['id']
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
            foreignKeyName: 'usage_logs_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
          },
        ]
      }
      vocabulary_items: {
        Row: {
          color: string
          id: string
          image_url: string | null
          letter: string
          pair_index: number | null
          teacher_id: string | null
          word: string
        }
        Insert: {
          color?: string
          id?: string
          image_url?: string | null
          letter: string
          pair_index?: number | null
          teacher_id?: string | null
          word: string
        }
        Update: {
          color?: string
          id?: string
          image_url?: string | null
          letter?: string
          pair_index?: number | null
          teacher_id?: string | null
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: 'vocabulary_items_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          grade: string | null
          id: string
          ref_code: string | null
          referred_by: string | null
        }
        Insert: {
          created_at?: string
          email: string
          grade?: string | null
          id?: string
          ref_code?: string | null
          referred_by?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          grade?: string | null
          id?: string
          ref_code?: string | null
          referred_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'waitlist_referred_by_fkey'
            columns: ['referred_by']
            isOneToOne: false
            referencedRelation: 'waitlist'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_old_audit_logs: { Args: never; Returns: undefined }
      create_school_for_onboarding: {
        Args: { school_name: string; school_state?: string }
        Returns: string
      }
      list_schools_for_onboarding: {
        Args: never
        Returns: {
          id: string
          name: string
          state: string
        }[]
      }
      match_planeaciones: {
        Args: {
          exclude_fortnight: string
          match_count: number
          p_teacher_id: string
          query_embedding: string
        }
        Returns: {
          content: string
          fortnight_id: string
          project_name: string
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
