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
      admin_activity: {
        Row: {
          actor_username: string | null
          created_at: string
          id: string
          kind: string
          message: string
        }
        Insert: {
          actor_username?: string | null
          created_at?: string
          id?: string
          kind: string
          message: string
        }
        Update: {
          actor_username?: string | null
          created_at?: string
          id?: string
          kind?: string
          message?: string
        }
        Relationships: []
      }
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
      clients: {
        Row: {
          budget: number | null
          created_at: string
          date_debut: string | null
          date_fin: string | null
          email: string | null
          entreprise: string | null
          id: string
          lien_drive: string | null
          nom_complet: string
          notes: string | null
          reseaux_sociaux: string | null
          statut: Database["public"]["Enums"]["client_status"]
          telephone: string | null
          type_projet: string | null
          updated_at: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          date_debut?: string | null
          date_fin?: string | null
          email?: string | null
          entreprise?: string | null
          id?: string
          lien_drive?: string | null
          nom_complet: string
          notes?: string | null
          reseaux_sociaux?: string | null
          statut?: Database["public"]["Enums"]["client_status"]
          telephone?: string | null
          type_projet?: string | null
          updated_at?: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          date_debut?: string | null
          date_fin?: string | null
          email?: string | null
          entreprise?: string | null
          id?: string
          lien_drive?: string | null
          nom_complet?: string
          notes?: string | null
          reseaux_sociaux?: string | null
          statut?: Database["public"]["Enums"]["client_status"]
          telephone?: string | null
          type_projet?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      comment_reactions: {
        Row: {
          author_id: string
          author_name: string
          author_type: string
          comment_id: string
          created_at: string
          emoji: string
          id: string
        }
        Insert: {
          author_id: string
          author_name?: string
          author_type: string
          comment_id: string
          created_at?: string
          emoji: string
          id?: string
        }
        Update: {
          author_id?: string
          author_name?: string
          author_type?: string
          comment_id?: string
          created_at?: string
          emoji?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "video_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      editor_accounts: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          last_login_at: string | null
          password_hash: string
          status: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id?: string
          last_login_at?: string | null
          password_hash: string
          status?: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          last_login_at?: string | null
          password_hash?: string
          status?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          project_id: string | null
          read: boolean
          recipient_id: string | null
          recipient_type: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          project_id?: string | null
          read?: boolean
          recipient_id?: string | null
          recipient_type: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          project_id?: string | null
          read?: boolean
          recipient_id?: string | null
          recipient_type?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_comment_reactions: {
        Row: {
          author_id: string
          author_name: string
          author_type: string
          comment_id: string
          created_at: string
          emoji: string
          id: string
        }
        Insert: {
          author_id: string
          author_name?: string
          author_type: string
          comment_id: string
          created_at?: string
          emoji: string
          id?: string
        }
        Update: {
          author_id?: string
          author_name?: string
          author_type?: string
          comment_id?: string
          created_at?: string
          emoji?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "project_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      project_comments: {
        Row: {
          audio_duration: number | null
          audio_url: string | null
          author_id: string | null
          author_name: string
          author_type: string
          content: string
          created_at: string
          id: string
          image_url: string | null
          project_id: string
          read_at: string | null
          read_by_admin: boolean
          read_by_editor: boolean
        }
        Insert: {
          audio_duration?: number | null
          audio_url?: string | null
          author_id?: string | null
          author_name?: string
          author_type: string
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          project_id: string
          read_at?: string | null
          read_by_admin?: boolean
          read_by_editor?: boolean
        }
        Update: {
          audio_duration?: number | null
          audio_url?: string | null
          author_id?: string | null
          author_name?: string
          author_type?: string
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          project_id?: string
          read_at?: string | null
          read_by_admin?: boolean
          read_by_editor?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "project_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          created_at: string
          file_name: string
          file_url: string
          id: string
          project_id: string
          uploaded_by: string | null
          version_number: number
        }
        Insert: {
          created_at?: string
          file_name?: string
          file_url: string
          id?: string
          project_id: string
          uploaded_by?: string | null
          version_number?: number
        }
        Update: {
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          project_id?: string
          uploaded_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "editor_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      project_status_history: {
        Row: {
          changed_at: string
          id: string
          project_id: string
          status: Database["public"]["Enums"]["project_status"]
        }
        Insert: {
          changed_at?: string
          id?: string
          project_id: string
          status: Database["public"]["Enums"]["project_status"]
        }
        Update: {
          changed_at?: string
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["project_status"]
        }
        Relationships: [
          {
            foreignKeyName: "project_status_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_typing_indicators: {
        Row: {
          author_id: string
          author_name: string
          author_type: string
          id: string
          is_recording_audio: boolean
          project_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          author_name?: string
          author_type: string
          id?: string
          is_recording_audio?: boolean
          project_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_name?: string
          author_type?: string
          id?: string
          is_recording_audio?: boolean
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_typing_indicators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_videos: {
        Row: {
          created_at: string
          id: string
          project_id: string
          script: string | null
          status: string
          title: string | null
          updated_at: string
          video_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          script?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          video_number: number
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          script?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          video_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_videos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          amount_invoiced_ht: number
          archived_at: string | null
          brief: string | null
          client_id: string | null
          created_at: string
          deadline: string | null
          delivery_link: string | null
          editor_id: string | null
          editor_name: string | null
          editor_quantity: number | null
          editor_rate: number | null
          editor_rate_type: Database["public"]["Enums"]["editor_rate_type"]
          editor_total_cost: number
          format: Database["public"]["Enums"]["project_format"]
          gross_profit: number
          id: string
          net_profit: number
          revision_link: string | null
          rushs_links: string[]
          rushs_received: boolean
          social_charges: number
          status: Database["public"]["Enums"]["project_status"]
          status_override: boolean
          title: string
          updated_at: string
        }
        Insert: {
          amount_invoiced_ht?: number
          archived_at?: string | null
          brief?: string | null
          client_id?: string | null
          created_at?: string
          deadline?: string | null
          delivery_link?: string | null
          editor_id?: string | null
          editor_name?: string | null
          editor_quantity?: number | null
          editor_rate?: number | null
          editor_rate_type?: Database["public"]["Enums"]["editor_rate_type"]
          editor_total_cost?: number
          format?: Database["public"]["Enums"]["project_format"]
          gross_profit?: number
          id?: string
          net_profit?: number
          revision_link?: string | null
          rushs_links?: string[]
          rushs_received?: boolean
          social_charges?: number
          status?: Database["public"]["Enums"]["project_status"]
          status_override?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          amount_invoiced_ht?: number
          archived_at?: string | null
          brief?: string | null
          client_id?: string | null
          created_at?: string
          deadline?: string | null
          delivery_link?: string | null
          editor_id?: string | null
          editor_name?: string | null
          editor_quantity?: number | null
          editor_rate?: number | null
          editor_rate_type?: Database["public"]["Enums"]["editor_rate_type"]
          editor_total_cost?: number
          format?: Database["public"]["Enums"]["project_format"]
          gross_profit?: number
          id?: string
          net_profit?: number
          revision_link?: string | null
          rushs_links?: string[]
          rushs_received?: boolean
          social_charges?: number
          status?: Database["public"]["Enums"]["project_status"]
          status_override?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_editor_id_fkey"
            columns: ["editor_id"]
            isOneToOne: false
            referencedRelation: "editor_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_seen_at: string
          owner_id: string
          owner_type: string
          p256dh: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_seen_at?: string
          owner_id: string
          owner_type: string
          p256dh: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_seen_at?: string
          owner_id?: string
          owner_type?: string
          p256dh?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      site_carousels: {
        Row: {
          aspect: string
          created_at: string
          description: string | null
          key: string
          label: string
          media_kind: string
          position: number
          show_source: boolean
          show_title: boolean
          updated_at: string
        }
        Insert: {
          aspect?: string
          created_at?: string
          description?: string | null
          key: string
          label: string
          media_kind?: string
          position?: number
          show_source?: boolean
          show_title?: boolean
          updated_at?: string
        }
        Update: {
          aspect?: string
          created_at?: string
          description?: string | null
          key?: string
          label?: string
          media_kind?: string
          position?: number
          show_source?: boolean
          show_title?: boolean
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
      site_presence: {
        Row: {
          ip: string
          last_seen_at: string
          user_agent: string | null
        }
        Insert: {
          ip: string
          last_seen_at?: string
          user_agent?: string | null
        }
        Update: {
          ip?: string
          last_seen_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
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
          source_label: string
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
          source_label?: string
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
          source_label?: string
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
      typing_indicators: {
        Row: {
          author_id: string
          author_name: string
          author_type: string
          id: string
          is_recording_audio: boolean
          project_video_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          author_name?: string
          author_type: string
          id?: string
          is_recording_audio?: boolean
          project_video_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_name?: string
          author_type?: string
          id?: string
          is_recording_audio?: boolean
          project_video_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_project_video_id_fkey"
            columns: ["project_video_id"]
            isOneToOne: false
            referencedRelation: "project_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_comments: {
        Row: {
          audio_duration: number | null
          audio_url: string | null
          author_id: string | null
          author_name: string
          author_type: string
          content: string
          created_at: string
          id: string
          image_url: string | null
          project_video_id: string
          read_at: string | null
          read_by_admin: boolean
          read_by_editor: boolean
        }
        Insert: {
          audio_duration?: number | null
          audio_url?: string | null
          author_id?: string | null
          author_name?: string
          author_type: string
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          project_video_id: string
          read_at?: string | null
          read_by_admin?: boolean
          read_by_editor?: boolean
        }
        Update: {
          audio_duration?: number | null
          audio_url?: string | null
          author_id?: string | null
          author_name?: string
          author_type?: string
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          project_video_id?: string
          read_at?: string | null
          read_by_admin?: boolean
          read_by_editor?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "video_comments_project_video_id_fkey"
            columns: ["project_video_id"]
            isOneToOne: false
            referencedRelation: "project_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_versions: {
        Row: {
          additional_links: Json
          created_at: string
          description: string | null
          file_name: string
          file_url: string
          id: string
          project_video_id: string
          title: string
          uploaded_by: string | null
          version_number: number
        }
        Insert: {
          additional_links?: Json
          created_at?: string
          description?: string | null
          file_name?: string
          file_url: string
          id?: string
          project_video_id: string
          title?: string
          uploaded_by?: string | null
          version_number: number
        }
        Update: {
          additional_links?: Json
          created_at?: string
          description?: string | null
          file_name?: string
          file_url?: string
          id?: string
          project_video_id?: string
          title?: string
          uploaded_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_versions_project_video_id_fkey"
            columns: ["project_video_id"]
            isOneToOne: false
            referencedRelation: "project_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "editor_accounts"
            referencedColumns: ["id"]
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
      create_editor: {
        Args: { _display_name: string; _password: string; _username: string }
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
      set_editor_password: {
        Args: { _id: string; _new_password: string }
        Returns: boolean
      }
      verify_admin: {
        Args: { _password: string; _username: string }
        Returns: {
          id: string
          username: string
        }[]
      }
      verify_editor: {
        Args: { _password: string; _username: string }
        Returns: {
          display_name: string
          id: string
          status: string
          username: string
        }[]
      }
    }
    Enums: {
      client_status: "Prospect" | "Actif" | "En pause" | "Terminé" | "Archivé"
      editor_rate_type: "per_video" | "per_minute"
      project_format: "Court" | "Long"
      project_status:
        | "En attente de validation client"
        | "À faire"
        | "En cours"
        | "En révision"
        | "Corrections"
        | "Montage terminé"
        | "Livrée"
        | "Payée"
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
    Enums: {
      client_status: ["Prospect", "Actif", "En pause", "Terminé", "Archivé"],
      editor_rate_type: ["per_video", "per_minute"],
      project_format: ["Court", "Long"],
      project_status: [
        "En attente de validation client",
        "À faire",
        "En cours",
        "En révision",
        "Corrections",
        "Montage terminé",
        "Livrée",
        "Payée",
      ],
    },
  },
} as const
