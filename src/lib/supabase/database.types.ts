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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      application_events: {
        Row: {
          clerk_user_id: string
          details: Json
          event_type: string
          id: string
          occurred_at: string
          saved_job_id: string | null
        }
        Insert: {
          clerk_user_id: string
          details?: Json
          event_type: string
          id?: string
          occurred_at?: string
          saved_job_id?: string | null
        }
        Update: {
          clerk_user_id?: string
          details?: Json
          event_type?: string
          id?: string
          occurred_at?: string
          saved_job_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_events_job_owner_fkey"
            columns: ["saved_job_id", "clerk_user_id"]
            isOneToOne: false
            referencedRelation: "saved_jobs"
            referencedColumns: ["id", "clerk_user_id"]
          },
        ]
      }
      course_progress: {
        Row: {
          category: string
          clerk_user_id: string
          course_code: string
          course_name: string
          is_selected: boolean
          match_details: Json
          match_score: number
          updated_at: string
        }
        Insert: {
          category: string
          clerk_user_id: string
          course_code: string
          course_name: string
          is_selected?: boolean
          match_details?: Json
          match_score?: number
          updated_at?: string
        }
        Update: {
          category?: string
          clerk_user_id?: string
          course_code?: string
          course_name?: string
          is_selected?: boolean
          match_details?: Json
          match_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      daily_usage: {
        Row: {
          clerk_user_id: string
          count: number
          feature: string
          updated_at: string
          usage_date: string
        }
        Insert: {
          clerk_user_id: string
          count?: number
          feature: string
          updated_at?: string
          usage_date: string
        }
        Update: {
          clerk_user_id?: string
          count?: number
          feature?: string
          updated_at?: string
          usage_date?: string
        }
        Relationships: []
      }
      legacy_import_state: {
        Row: {
          clerk_user_id: string
          completed_at: string
          dataset: string
          rows_imported: number
        }
        Insert: {
          clerk_user_id: string
          completed_at?: string
          dataset: string
          rows_imported?: number
        }
        Update: {
          clerk_user_id?: string
          completed_at?: string
          dataset?: string
          rows_imported?: number
        }
        Relationships: []
      }
      profile_import_proposals: {
        Row: {
          clerk_user_id: string
          created_at: string
          decided_at: string | null
          decision: string
          id: string
          item_type: string
          profile_id: string
          proposed_data: Json
          source_resume_document_id: string
          target_profile_item_id: string | null
        }
        Insert: {
          clerk_user_id: string
          created_at?: string
          decided_at?: string | null
          decision?: string
          id?: string
          item_type: string
          profile_id: string
          proposed_data: Json
          source_resume_document_id: string
          target_profile_item_id?: string | null
        }
        Update: {
          clerk_user_id?: string
          created_at?: string
          decided_at?: string | null
          decision?: string
          id?: string
          item_type?: string
          profile_id?: string
          proposed_data?: Json
          source_resume_document_id?: string
          target_profile_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_import_proposals_profile_fkey"
            columns: ["profile_id", "clerk_user_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id", "clerk_user_id"]
          },
          {
            foreignKeyName: "profile_import_proposals_source_fkey"
            columns: [
              "source_resume_document_id",
              "profile_id",
              "clerk_user_id",
            ]
            isOneToOne: false
            referencedRelation: "resume_documents"
            referencedColumns: ["id", "profile_id", "clerk_user_id"]
          },
          {
            foreignKeyName: "profile_import_proposals_target_fkey"
            columns: ["target_profile_item_id", "profile_id", "clerk_user_id"]
            isOneToOne: false
            referencedRelation: "profile_items"
            referencedColumns: ["id", "profile_id", "clerk_user_id"]
          },
        ]
      }
      profile_item_sources: {
        Row: {
          clerk_user_id: string
          created_at: string
          id: string
          profile_id: string
          profile_item_id: string
          resume_document_id: string
          source_excerpt: string | null
        }
        Insert: {
          clerk_user_id: string
          created_at?: string
          id?: string
          profile_id: string
          profile_item_id: string
          resume_document_id: string
          source_excerpt?: string | null
        }
        Update: {
          clerk_user_id?: string
          created_at?: string
          id?: string
          profile_id?: string
          profile_item_id?: string
          resume_document_id?: string
          source_excerpt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_item_sources_item_fkey"
            columns: ["profile_item_id", "profile_id", "clerk_user_id"]
            isOneToOne: false
            referencedRelation: "profile_items"
            referencedColumns: ["id", "profile_id", "clerk_user_id"]
          },
          {
            foreignKeyName: "profile_item_sources_resume_fkey"
            columns: ["resume_document_id", "profile_id", "clerk_user_id"]
            isOneToOne: false
            referencedRelation: "resume_documents"
            referencedColumns: ["id", "profile_id", "clerk_user_id"]
          },
        ]
      }
      profile_items: {
        Row: {
          clerk_user_id: string
          content: Json
          created_at: string
          id: string
          identity_key: string
          item_type: string
          profile_id: string
          sort_order: number
          title: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          clerk_user_id: string
          content?: Json
          created_at?: string
          id?: string
          identity_key: string
          item_type: string
          profile_id: string
          sort_order?: number
          title: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          clerk_user_id?: string
          content?: Json
          created_at?: string
          id?: string
          identity_key?: string
          item_type?: string
          profile_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_items_profile_owner_fkey"
            columns: ["profile_id", "clerk_user_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id", "clerk_user_id"]
          },
        ]
      }
      resume_document_items: {
        Row: {
          clerk_user_id: string
          created_at: string
          id: string
          position: number
          profile_id: string
          profile_item_id: string
          resume_document_id: string
          tailored_content: Json | null
        }
        Insert: {
          clerk_user_id: string
          created_at?: string
          id?: string
          position: number
          profile_id: string
          profile_item_id: string
          resume_document_id: string
          tailored_content?: Json | null
        }
        Update: {
          clerk_user_id?: string
          created_at?: string
          id?: string
          position?: number
          profile_id?: string
          profile_item_id?: string
          resume_document_id?: string
          tailored_content?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "resume_document_items_profile_item_fkey"
            columns: ["profile_item_id", "profile_id", "clerk_user_id"]
            isOneToOne: false
            referencedRelation: "profile_items"
            referencedColumns: ["id", "profile_id", "clerk_user_id"]
          },
          {
            foreignKeyName: "resume_document_items_resume_fkey"
            columns: ["resume_document_id", "profile_id", "clerk_user_id"]
            isOneToOne: false
            referencedRelation: "resume_documents"
            referencedColumns: ["id", "profile_id", "clerk_user_id"]
          },
        ]
      }
      resume_documents: {
        Row: {
          clerk_user_id: string
          content_type: string | null
          created_at: string
          file_name: string | null
          id: string
          is_current: boolean
          is_starred: boolean
          profile_id: string
          s3_object_key: string | null
          score: number | null
          source_type: string
          status: string
          structured_content: Json
          target_role: string | null
          updated_at: string
        }
        Insert: {
          clerk_user_id: string
          content_type?: string | null
          created_at?: string
          file_name?: string | null
          id?: string
          is_current?: boolean
          is_starred?: boolean
          profile_id: string
          s3_object_key?: string | null
          score?: number | null
          source_type: string
          status?: string
          structured_content?: Json
          target_role?: string | null
          updated_at?: string
        }
        Update: {
          clerk_user_id?: string
          content_type?: string | null
          created_at?: string
          file_name?: string | null
          id?: string
          is_current?: boolean
          is_starred?: boolean
          profile_id?: string
          s3_object_key?: string | null
          score?: number | null
          source_type?: string
          status?: string
          structured_content?: Json
          target_role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_documents_profile_owner_fkey"
            columns: ["profile_id", "clerk_user_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id", "clerk_user_id"]
          },
        ]
      }
      resume_feedback: {
        Row: {
          clerk_user_id: string
          created_at: string
          feedback_type: string
          id: string
          result: Json
          resume_document_id: string
        }
        Insert: {
          clerk_user_id: string
          created_at?: string
          feedback_type: string
          id?: string
          result: Json
          resume_document_id: string
        }
        Update: {
          clerk_user_id?: string
          created_at?: string
          feedback_type?: string
          id?: string
          result?: Json
          resume_document_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_feedback_resume_owner_fkey"
            columns: ["resume_document_id", "clerk_user_id"]
            isOneToOne: false
            referencedRelation: "resume_documents"
            referencedColumns: ["id", "clerk_user_id"]
          },
        ]
      }
      saved_jobs: {
        Row: {
          applied_at: string | null
          apply_url: string
          clerk_user_id: string
          company: string
          contract_type: string | null
          created_at: string
          external_id: string
          id: string
          job_snapshot: Json
          location: string
          match_score: number
          provider: string
          saved_at: string
          stage: string
          title: string
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          apply_url?: string
          clerk_user_id: string
          company: string
          contract_type?: string | null
          created_at?: string
          external_id: string
          id?: string
          job_snapshot?: Json
          location?: string
          match_score?: number
          provider: string
          saved_at?: string
          stage?: string
          title: string
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          apply_url?: string
          clerk_user_id?: string
          company?: string
          contract_type?: string | null
          created_at?: string
          external_id?: string
          id?: string
          job_snapshot?: Json
          location?: string
          match_score?: number
          provider?: string
          saved_at?: string
          stage?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          basics: Json
          clerk_user_id: string
          created_at: string
          goals: Json
          id: string
          university_id: string | null
          updated_at: string
        }
        Insert: {
          basics?: Json
          clerk_user_id: string
          created_at?: string
          goals?: Json
          id?: string
          university_id?: string | null
          updated_at?: string
        }
        Update: {
          basics?: Json
          clerk_user_id?: string
          created_at?: string
          goals?: Json
          id?: string
          university_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          clerk_user_id: string
          created_at: string
          id: string
          preferences: Json
          updated_at: string
        }
        Insert: {
          clerk_user_id: string
          created_at?: string
          id?: string
          preferences?: Json
          updated_at?: string
        }
        Update: {
          clerk_user_id?: string
          created_at?: string
          id?: string
          preferences?: Json
          updated_at?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          clerk_user_id: string
          created_at: string
          data_sharing: boolean
          id: string
          updated_at: string
        }
        Insert: {
          clerk_user_id: string
          created_at?: string
          data_sharing?: boolean
          id?: string
          updated_at?: string
        }
        Update: {
          clerk_user_id?: string
          created_at?: string
          data_sharing?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_daily_usage: {
        Args: { p_daily_limit: number; p_feature: string }
        Returns: {
          allowed: boolean
          remaining: number
          used: number
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
