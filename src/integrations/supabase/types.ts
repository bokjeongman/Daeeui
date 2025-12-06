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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accessibility_reports: {
        Row: {
          accessibility_level: string
          category: string
          created_at: string | null
          details: string | null
          has_accessible_restroom: boolean | null
          has_elevator: boolean | null
          has_low_threshold: boolean | null
          has_ramp: boolean | null
          has_wide_door: boolean | null
          id: string
          latitude: number
          location_name: string
          longitude: number
          photo_urls: string[] | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          accessibility_level: string
          category: string
          created_at?: string | null
          details?: string | null
          has_accessible_restroom?: boolean | null
          has_elevator?: boolean | null
          has_low_threshold?: boolean | null
          has_ramp?: boolean | null
          has_wide_door?: boolean | null
          id?: string
          latitude: number
          location_name: string
          longitude: number
          photo_urls?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          accessibility_level?: string
          category?: string
          created_at?: string | null
          details?: string | null
          has_accessible_restroom?: boolean | null
          has_elevator?: boolean | null
          has_low_threshold?: boolean | null
          has_ramp?: boolean | null
          has_wide_door?: boolean | null
          id?: string
          latitude?: number
          location_name?: string
          longitude?: number
          photo_urls?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accessibility_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accessibility_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          latitude: number
          longitude: number
          place_name: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          latitude: number
          longitude: number
          place_name: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          latitude?: number
          longitude?: number
          place_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      modification_requests: {
        Row: {
          created_at: string
          id: string
          proposed_details: string | null
          proposed_has_accessible_restroom: boolean | null
          proposed_has_elevator: boolean | null
          proposed_has_low_threshold: boolean | null
          proposed_has_ramp: boolean | null
          proposed_has_wide_door: boolean | null
          proposed_photo_urls: string[] | null
          reason: string
          report_id: string
          request_type: string
          requester_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          proposed_details?: string | null
          proposed_has_accessible_restroom?: boolean | null
          proposed_has_elevator?: boolean | null
          proposed_has_low_threshold?: boolean | null
          proposed_has_ramp?: boolean | null
          proposed_has_wide_door?: boolean | null
          proposed_photo_urls?: string[] | null
          reason: string
          report_id: string
          request_type: string
          requester_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          proposed_details?: string | null
          proposed_has_accessible_restroom?: boolean | null
          proposed_has_elevator?: boolean | null
          proposed_has_low_threshold?: boolean | null
          proposed_has_ramp?: boolean | null
          proposed_has_wide_door?: boolean | null
          proposed_photo_urls?: string[] | null
          reason?: string
          report_id?: string
          request_type?: string
          requester_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "modification_requests_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "accessibility_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modification_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modification_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          nickname: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          nickname?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          nickname?: string | null
        }
        Relationships: []
      }
      route_history: {
        Row: {
          created_at: string
          distance: number | null
          duration: number | null
          end_lat: number
          end_lon: number
          end_name: string
          id: string
          start_lat: number
          start_lon: number
          start_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          distance?: number | null
          duration?: number | null
          end_lat: number
          end_lon: number
          end_name: string
          id?: string
          start_lat: number
          start_lon: number
          start_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          distance?: number | null
          duration?: number | null
          end_lat?: number
          end_lon?: number
          end_name?: string
          id?: string
          start_lat?: number
          start_lon?: number
          start_name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_email_by_nickname: {
        Args: { search_nickname: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
