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
      admin_login_events: {
        Row: {
          created_at: string
          id: string
          ip: string | null
          success: boolean
          user_agent: string | null
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip?: string | null
          success: boolean
          user_agent?: string | null
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          ip?: string | null
          success?: boolean
          user_agent?: string | null
          username?: string
        }
        Relationships: []
      }
      admin_remembered_ips: {
        Row: {
          created_at: string
          ip: string
          label: string | null
          last_seen_at: string
          username: string
        }
        Insert: {
          created_at?: string
          ip: string
          label?: string | null
          last_seen_at?: string
          username: string
        }
        Update: {
          created_at?: string
          ip?: string
          label?: string | null
          last_seen_at?: string
          username?: string
        }
        Relationships: []
      }
      admins: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string | null
          id: string
          last_login_at: string | null
          last_name: string | null
          password_hash: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_login_at?: string | null
          last_name?: string | null
          password_hash: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_login_at?: string | null
          last_name?: string | null
          password_hash?: string
          username?: string
        }
        Relationships: []
      }
      site_carousels: {
        Row: {
          created_at: string
          description: string | null
          key: string
          label: string
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          label: string
          position?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          label?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_events: {
        Row: {
          country: string | null
          created_at: string
          cta_id: string | null
          device: string | null
          duration_ms: number | null
          id: string
          path: string | null
          referrer: string | null
          session_id: string
          source: string | null
          type: string
          user_agent: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          cta_id?: string | null
          device?: string | null
          duration_ms?: number | null
          id?: string
          path?: string | null
          referrer?: string | null
          session_id: string
          source?: string | null
          type: string
          user_agent?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          cta_id?: string | null
          device?: string | null
          duration_ms?: number | null
          id?: string
          path?: string | null
          referrer?: string | null
          session_id?: string
          source?: string | null
          type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      site_videos: {
        Row: {
          carousel_key: string
          created_at: string
          format: string
          id: string
          position: number
          source_url: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          carousel_key: string
          created_at?: string
          format?: string
          id?: string
          position?: number
          source_url?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          carousel_key?: string
          created_at?: string
          format?: string
          id?: string
          position?: number
          source_url?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "site_videos_carousel_key_fkey"
            columns: ["carousel_key"]
            isOneToOne: false
            referencedRelation: "site_carousels"
            referencedColumns: ["key"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_admin: {
        Args: { _password: string; _username: string }
        Returns: string
      }
      rename_admin: {
        Args: { _new_username: string; _old_username: string }
        Returns: boolean
      }
      set_admin_password: {
        Args: { _new_password: string; _username: string }
        Returns: boolean
      }
      verify_admin: {
        Args: { _password: string; _username: string }
        Returns: {
          id: string
          username: string
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
