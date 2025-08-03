export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      analytics: {
        Row: {
          created_at: string
          date: string
          id: string
          period: Database["public"]["Enums"]["analytics_period"]
          type: Database["public"]["Enums"]["analytics_type"]
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          period: Database["public"]["Enums"]["analytics_period"]
          type: Database["public"]["Enums"]["analytics_type"]
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          period?: Database["public"]["Enums"]["analytics_period"]
          type?: Database["public"]["Enums"]["analytics_type"]
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_slots: {
        Row: {
          created_at: string
          end_time: string
          exceptions: Json | null
          id: string
          start_time: string
          timezone: string
          user_id: string
          weekday: number
        }
        Insert: {
          created_at?: string
          end_time: string
          exceptions?: Json | null
          id?: string
          start_time: string
          timezone?: string
          user_id: string
          weekday: number
        }
        Update: {
          created_at?: string
          end_time?: string
          exceptions?: Json | null
          id?: string
          start_time?: string
          timezone?: string
          user_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          status: Database["public"]["Enums"]["contact_status"]
          timezone: string
          utm_data: Json | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          email: string
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          timezone?: string
          utm_data?: Json | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          timezone?: string
          utm_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      disqualifications: {
        Row: {
          created_at: string
          created_by: string
          disqualification_message: string
          event_id: string
          expected_value: string
          id: string
          logic_type: string
          operator: string
          question_id: string | null
          redirect_url: string | null
          redirect_with_params: boolean
        }
        Insert: {
          created_at?: string
          created_by: string
          disqualification_message?: string
          event_id: string
          expected_value: string
          id?: string
          logic_type?: string
          operator: string
          question_id?: string | null
          redirect_url?: string | null
          redirect_with_params?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string
          disqualification_message?: string
          event_id?: string
          expected_value?: string
          id?: string
          logic_type?: string
          operator?: string
          question_id?: string | null
          redirect_url?: string | null
          redirect_with_params?: boolean
        }
        Relationships: []
      }
      events: {
        Row: {
          calendar_link: string | null
          created_at: string
          created_by: string
          date_time: string
          duration: number
          form_id: string | null
          guest_id: string
          host_ids: string[]
          id: string
          location: Database["public"]["Enums"]["event_location"]
          name: string
          status: Database["public"]["Enums"]["event_status"]
          timezone: string
          type: Database["public"]["Enums"]["event_type"]
        }
        Insert: {
          calendar_link?: string | null
          created_at?: string
          created_by: string
          date_time: string
          duration: number
          form_id?: string | null
          guest_id: string
          host_ids: string[]
          id?: string
          location?: Database["public"]["Enums"]["event_location"]
          name: string
          status?: Database["public"]["Enums"]["event_status"]
          timezone?: string
          type: Database["public"]["Enums"]["event_type"]
        }
        Update: {
          calendar_link?: string | null
          created_at?: string
          created_by?: string
          date_time?: string
          duration?: number
          form_id?: string | null
          guest_id?: string
          host_ids?: string[]
          id?: string
          location?: Database["public"]["Enums"]["event_location"]
          name?: string
          status?: Database["public"]["Enums"]["event_status"]
          timezone?: string
          type?: Database["public"]["Enums"]["event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      form_questions: {
        Row: {
          condition_logic: Json | null
          created_at: string
          form_id: string
          id: string
          label: string
          required: boolean
          type: Database["public"]["Enums"]["question_type"]
        }
        Insert: {
          condition_logic?: Json | null
          created_at?: string
          form_id: string
          id?: string
          label: string
          required?: boolean
          type: Database["public"]["Enums"]["question_type"]
        }
        Update: {
          condition_logic?: Json | null
          created_at?: string
          form_id?: string
          id?: string
          label?: string
          required?: boolean
          type?: Database["public"]["Enums"]["question_type"]
        }
        Relationships: [
          {
            foreignKeyName: "form_questions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_responses: {
        Row: {
          contact_id: string
          created_at: string
          form_id: string
          id: string
          question_id: string
          response: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          form_id: string
          id?: string
          question_id: string
          response: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          form_id?: string
          id?: string
          question_id?: string
          response?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "form_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          created_at: string
          created_by: string
          disqualif_logic: Json | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          disqualif_logic?: Json | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          disqualif_logic?: Json | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          status: Database["public"]["Enums"]["integration_status"]
          tool: Database["public"]["Enums"]["integration_tool"]
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["integration_status"]
          tool: Database["public"]["Enums"]["integration_tool"]
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["integration_status"]
          tool?: Database["public"]["Enums"]["integration_tool"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          created_by: string
          event_id: string
          id: string
          is_active: boolean
          message: string
          offset_type: string
          offset_unit: string
          offset_value: number
          recipient_type: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          event_id: string
          id?: string
          is_active?: boolean
          message: string
          offset_type: string
          offset_unit: string
          offset_value: number
          recipient_type: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          event_id?: string
          id?: string
          is_active?: boolean
          message?: string
          offset_type?: string
          offset_unit?: string
          offset_value?: number
          recipient_type?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          active: boolean
          calendar_connected: boolean
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          priority: number
          role: Database["public"]["Enums"]["app_role"]
          slack_id: string | null
          timezone: string
          user_id: string
        }
        Insert: {
          active?: boolean
          calendar_connected?: boolean
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          priority?: number
          role?: Database["public"]["Enums"]["app_role"]
          slack_id?: string | null
          timezone?: string
          user_id: string
        }
        Update: {
          active?: boolean
          calendar_connected?: boolean
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          priority?: number
          role?: Database["public"]["Enums"]["app_role"]
          slack_id?: string | null
          timezone?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      detect_abandoned_leads: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_current_user_teams: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      process_scheduled_notifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      user_in_team: {
        Args: { _team_id: string }
        Returns: boolean
      }
    }
    Enums: {
      analytics_period: "day" | "week" | "month"
      analytics_type: "meetings" | "conversion_rate" | "show_rate"
      app_role: "super_admin" | "admin" | "closer" | "setter"
      contact_status: "opportunity" | "lead" | "client"
      event_location: "online" | "physical" | "custom"
      event_status: "confirmed" | "canceled" | "rescheduled"
      event_type: "1v1" | "group" | "round_robin"
      integration_status: "connected" | "error" | "disconnected"
      integration_tool: "google_calendar" | "slack" | "zapier" | "whatsapp"
      notification_recipient: "guest" | "host" | "team" | "other"
      notification_trigger: "booked" | "canceled" | "rescheduled" | "custom"
      notification_type: "email" | "sms" | "slack"
      question_type: "text" | "email" | "phone" | "dropdown" | "checkbox"
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
      analytics_period: ["day", "week", "month"],
      analytics_type: ["meetings", "conversion_rate", "show_rate"],
      app_role: ["super_admin", "admin", "closer", "setter"],
      contact_status: ["opportunity", "lead", "client"],
      event_location: ["online", "physical", "custom"],
      event_status: ["confirmed", "canceled", "rescheduled"],
      event_type: ["1v1", "group", "round_robin"],
      integration_status: ["connected", "error", "disconnected"],
      integration_tool: ["google_calendar", "slack", "zapier", "whatsapp"],
      notification_recipient: ["guest", "host", "team", "other"],
      notification_trigger: ["booked", "canceled", "rescheduled", "custom"],
      notification_type: ["email", "sms", "slack"],
      question_type: ["text", "email", "phone", "dropdown", "checkbox"],
    },
  },
} as const
