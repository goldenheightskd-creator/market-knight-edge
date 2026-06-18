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
      alerts: {
        Row: {
          acknowledged: boolean
          asset: string
          direction: string | null
          id: string
          level: number | null
          level_type: string | null
          note: string | null
          triggered_at: string
          user_id: string
        }
        Insert: {
          acknowledged?: boolean
          asset: string
          direction?: string | null
          id?: string
          level?: number | null
          level_type?: string | null
          note?: string | null
          triggered_at?: string
          user_id: string
        }
        Update: {
          acknowledged?: boolean
          asset?: string
          direction?: string | null
          id?: string
          level?: number | null
          level_type?: string | null
          note?: string | null
          triggered_at?: string
          user_id?: string
        }
        Relationships: []
      }
      asset_levels: {
        Row: {
          asset: string
          id: string
          levels: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          asset: string
          id?: string
          levels?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          asset?: string
          id?: string
          levels?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      checklist_log: {
        Row: {
          checked_session: boolean
          id: string
          log_date: string
          marked_levels: boolean
          risk_calculated: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          checked_session?: boolean
          id?: string
          log_date?: string
          marked_levels?: boolean
          risk_calculated?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          checked_session?: boolean
          id?: string
          log_date?: string
          marked_levels?: boolean
          risk_calculated?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          asset: string
          created_at: string
          direction: string
          emotion: string | null
          entry: number | null
          exit_price: number | null
          followed_plan: boolean
          id: string
          lesson: string | null
          notes: string | null
          outcome: string
          pnl: number
          setup: string | null
          stop: number | null
          target: number | null
          trade_date: string
          user_id: string
        }
        Insert: {
          asset: string
          created_at?: string
          direction: string
          emotion?: string | null
          entry?: number | null
          exit_price?: number | null
          followed_plan?: boolean
          id?: string
          lesson?: string | null
          notes?: string | null
          outcome: string
          pnl?: number
          setup?: string | null
          stop?: number | null
          target?: number | null
          trade_date?: string
          user_id: string
        }
        Update: {
          asset?: string
          created_at?: string
          direction?: string
          emotion?: string | null
          entry?: number | null
          exit_price?: number | null
          followed_plan?: boolean
          id?: string
          lesson?: string | null
          notes?: string | null
          outcome?: string
          pnl?: number
          setup?: string | null
          stop?: number | null
          target?: number | null
          trade_date?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          account_size: number | null
          current_asset: string | null
          prefs: Json
          risk_pct: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_size?: number | null
          current_asset?: string | null
          prefs?: Json
          risk_pct?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_size?: number | null
          current_asset?: string | null
          prefs?: Json
          risk_pct?: number | null
          updated_at?: string
          user_id?: string
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
