export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      application_downloads: {
        Row: {
          application_id: string
          dealer_id: string
          downloaded_at: string
          id: string
          payment_amount: number | null
          payment_id: string | null
        }
        Insert: {
          application_id: string
          dealer_id: string
          downloaded_at?: string
          id?: string
          payment_amount?: number | null
          payment_id?: string | null
        }
        Update: {
          application_id?: string
          dealer_id?: string
          downloaded_at?: string
          id?: string
          payment_amount?: number | null
          payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_downloads_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_locks: {
        Row: {
          application_id: string
          created_at: string
          dealer_id: string
          expires_at: string
          id: string
          is_paid: boolean | null
          lock_type: string
          locked_at: string
          payment_amount: number | null
          payment_id: string | null
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          dealer_id: string
          expires_at: string
          id?: string
          is_paid?: boolean | null
          lock_type: string
          locked_at?: string
          payment_amount?: number | null
          payment_id?: string | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          dealer_id?: string
          expires_at?: string
          id?: string
          is_paid?: boolean | null
          lock_type?: string
          locked_at?: string
          payment_amount?: number | null
          payment_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_locks_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_notifications: {
        Row: {
          application_id: string
          email_sent: boolean
          id: string
          notified_at: string
        }
        Insert: {
          application_id: string
          email_sent?: boolean
          id?: string
          notified_at?: string
        }
        Update: {
          application_id?: string
          email_sent?: boolean
          id?: string
          notified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_notifications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          additionalnotes: string | null
          amountowed: string | null
          city: string | null
          created_at: string | null
          currentpayment: string | null
          currentvehicle: string | null
          email: string | null
          employer_name: string | null
          employment_duration: string | null
          employmentstatus: string | null
          fullname: string
          hasexistingloan: boolean | null
          id: string
          iscomplete: boolean | null
          job_title: string | null
          mileage: string | null
          monthlyincome: string | null
          phonenumber: string | null
          postalcode: string | null
          preferredmakemodel: string | null
          province: string | null
          requiredfeatures: string | null
          status: string | null
          streetaddress: string | null
          unwantedcolors: string | null
          updated_at: string | null
          user_id: string | null
          vehicletype: string | null
        }
        Insert: {
          additionalnotes?: string | null
          amountowed?: string | null
          city?: string | null
          created_at?: string | null
          currentpayment?: string | null
          currentvehicle?: string | null
          email?: string | null
          employer_name?: string | null
          employment_duration?: string | null
          employmentstatus?: string | null
          fullname: string
          hasexistingloan?: boolean | null
          id?: string
          iscomplete?: boolean | null
          job_title?: string | null
          mileage?: string | null
          monthlyincome?: string | null
          phonenumber?: string | null
          postalcode?: string | null
          preferredmakemodel?: string | null
          province?: string | null
          requiredfeatures?: string | null
          status?: string | null
          streetaddress?: string | null
          unwantedcolors?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicletype?: string | null
        }
        Update: {
          additionalnotes?: string | null
          amountowed?: string | null
          city?: string | null
          created_at?: string | null
          currentpayment?: string | null
          currentvehicle?: string | null
          email?: string | null
          employer_name?: string | null
          employment_duration?: string | null
          employmentstatus?: string | null
          fullname?: string
          hasexistingloan?: boolean | null
          id?: string
          iscomplete?: boolean | null
          job_title?: string | null
          mileage?: string | null
          monthlyincome?: string | null
          phonenumber?: string | null
          postalcode?: string | null
          preferredmakemodel?: string | null
          province?: string | null
          requiredfeatures?: string | null
          status?: string | null
          streetaddress?: string | null
          unwantedcolors?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicletype?: string | null
        }
        Relationships: []
      }
      applications_old: {
        Row: {
          additionalnotes: string | null
          amountowed: string | null
          city: string | null
          created_at: string | null
          currentpayment: string | null
          currentvehicle: string | null
          email: string | null
          employer_name: string | null
          employment_duration: string | null
          employmentstatus: string | null
          fullname: string
          hasexistingloan: boolean | null
          id: string
          iscomplete: boolean | null
          job_title: string | null
          mileage: string | null
          monthlyincome: string | null
          phonenumber: string | null
          postalcode: string | null
          preferredmakemodel: string | null
          province: string | null
          requiredfeatures: string | null
          status: string | null
          streetaddress: string | null
          unwantedcolors: string | null
          updated_at: string | null
          user_id: string | null
          vehicletype: string | null
        }
        Insert: {
          additionalnotes?: string | null
          amountowed?: string | null
          city?: string | null
          created_at?: string | null
          currentpayment?: string | null
          currentvehicle?: string | null
          email?: string | null
          employer_name?: string | null
          employment_duration?: string | null
          employmentstatus?: string | null
          fullname: string
          hasexistingloan?: boolean | null
          id?: string
          iscomplete?: boolean | null
          job_title?: string | null
          mileage?: string | null
          monthlyincome?: string | null
          phonenumber?: string | null
          postalcode?: string | null
          preferredmakemodel?: string | null
          province?: string | null
          requiredfeatures?: string | null
          status?: string | null
          streetaddress?: string | null
          unwantedcolors?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicletype?: string | null
        }
        Update: {
          additionalnotes?: string | null
          amountowed?: string | null
          city?: string | null
          created_at?: string | null
          currentpayment?: string | null
          currentvehicle?: string | null
          email?: string | null
          employer_name?: string | null
          employment_duration?: string | null
          employmentstatus?: string | null
          fullname?: string
          hasexistingloan?: boolean | null
          id?: string
          iscomplete?: boolean | null
          job_title?: string | null
          mileage?: string | null
          monthlyincome?: string | null
          phonenumber?: string | null
          postalcode?: string | null
          preferredmakemodel?: string | null
          province?: string | null
          requiredfeatures?: string | null
          status?: string | null
          streetaddress?: string | null
          unwantedcolors?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicletype?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      company_pricing: {
        Row: {
          company_id: string
          created_at: string
          discounted_price: number
          id: string
          standard_price: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          discounted_price?: number
          id?: string
          standard_price?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          discounted_price?: number
          id?: string
          standard_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_pricing_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dealer_pauses: {
        Row: {
          created_at: string
          dealer_id: string
          id: string
          is_permanent: boolean
          paused_at: string
          paused_by: string
          pin_code: string
          resumed_at: string | null
          resumed_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dealer_id: string
          id?: string
          is_permanent?: boolean
          paused_at?: string
          paused_by: string
          pin_code: string
          resumed_at?: string | null
          resumed_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dealer_id?: string
          id?: string
          is_permanent?: boolean
          paused_at?: string
          paused_by?: string
          pin_code?: string
          resumed_at?: string | null
          resumed_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dealer_purchases: {
        Row: {
          application_id: string
          created_at: string
          dealer_id: string
          discount_amount: number | null
          discount_applied: boolean | null
          discount_type: string | null
          download_count: number | null
          downloaded_at: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          payment_amount: number
          payment_id: string
          payment_status: string
          purchase_date: string
          stripe_customer_id: string | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          dealer_id: string
          discount_amount?: number | null
          discount_applied?: boolean | null
          discount_type?: string | null
          download_count?: number | null
          downloaded_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          payment_amount: number
          payment_id: string
          payment_status?: string
          purchase_date?: string
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          dealer_id?: string
          discount_amount?: number | null
          discount_applied?: boolean | null
          discount_type?: string | null
          download_count?: number | null
          downloaded_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          payment_amount?: number
          payment_id?: string
          payment_status?: string
          purchase_date?: string
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          owner_id: string
          phone: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          owner_id: string
          phone?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lockout_periods: {
        Row: {
          created_at: string
          fee: number
          hours: number
          id: number
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fee: number
          hours: number
          id?: number
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fee?: number
          hours?: number
          id?: number
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      mailgun_settings: {
        Row: {
          api_key: string
          created_at: string
          domain: string
          from_email: string
          from_name: string
          id: string
          updated_at: string
        }
        Insert: {
          api_key: string
          created_at?: string
          domain: string
          from_email: string
          from_name?: string
          id?: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          created_at?: string
          domain?: string
          from_email?: string
          from_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          age_discount_enabled: boolean | null
          age_discount_percentage: number | null
          age_discount_threshold: number | null
          discounted_price: number
          id: number
          standard_price: number
          temporary_lock_minutes: number
          updated_at: string
        }
        Insert: {
          age_discount_enabled?: boolean | null
          age_discount_percentage?: number | null
          age_discount_threshold?: number | null
          discounted_price?: number
          id?: number
          standard_price?: number
          temporary_lock_minutes?: number
          updated_at?: string
        }
        Update: {
          age_discount_enabled?: boolean | null
          age_discount_percentage?: number | null
          age_discount_threshold?: number | null
          discounted_price?: number
          id?: number
          standard_price?: number
          temporary_lock_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          company_id: string
          company_name: string | null
          created_at: string
          email: string
          email_notifications: boolean | null
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          company_id: string
          company_name?: string | null
          created_at?: string
          email: string
          email_notifications?: boolean | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          company_id?: string
          company_name?: string | null
          created_at?: string
          email?: string
          email_notifications?: boolean | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      backfill_missing_user_profiles: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          user_email: string
          status: string
        }[]
      }
      can_create_profile_for_user: {
        Args: { user_id: string }
        Returns: boolean
      }
      create_application: {
        Args: { p_application_data: Json }
        Returns: Json
      }
      export_applications_as_csv: {
        Args: { app_ids: string[] }
        Returns: string
      }
      get_all_applications: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_application_by_id: {
        Args: { p_application_id: string }
        Returns: Json
      }
      get_applications_columns: {
        Args: Record<PropertyKey, never>
        Returns: unknown[]
      }
      get_applications_for_dealer: {
        Args: { p_dealer_id: string }
        Returns: Json
      }
      get_company_pricing: {
        Args: { p_company_id: string }
        Returns: Json
      }
      get_dealer_downloads: {
        Args: { p_dealer_id: string }
        Returns: Json
      }
      get_dealer_purchases: {
        Args: { p_dealer_id: string }
        Returns: Json
      }
      get_default_pin: {
        Args: { p_dealer_id: string }
        Returns: string
      }
      get_new_applications_for_notification: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          fullname: string
          city: string
          vehicletype: string
          created_at: string
        }[]
      }
      get_user_company: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_application_downloaded_by_dealer: {
        Args: { p_application_id: string; p_dealer_id: string }
        Returns: boolean
      }
      is_application_locked: {
        Args: { p_application_id: string; p_current_dealer_id?: string }
        Returns: Json
      }
      is_dealer_paused: {
        Args: { p_dealer_id: string }
        Returns: Json
      }
      list_companies_with_pricing: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      lock_application: {
        Args: {
          p_application_id: string
          p_dealer_id: string
          p_lock_type: string
          p_payment_id?: string
          p_payment_amount?: number
        }
        Returns: Json
      }
      mark_purchase_downloaded: {
        Args: { p_dealer_id: string; p_application_id: string }
        Returns: Json
      }
      move_old_applications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      pause_dealer: {
        Args: {
          p_dealer_id: string
          p_is_permanent: boolean
          p_pin_code: string
          p_admin_id?: string
        }
        Returns: Json
      }
      record_application_download: {
        Args: {
          p_application_id: string
          p_dealer_id: string
          p_payment_id?: string
          p_payment_amount?: number
        }
        Returns: Json
      }
      record_dealer_purchase: {
        Args: {
          p_dealer_id: string
          p_application_id: string
          p_payment_id: string
          p_payment_amount: number
          p_stripe_session_id?: string
          p_stripe_customer_id?: string
          p_discount_applied?: boolean
          p_discount_type?: string
          p_discount_amount?: number
          p_ip_address?: string
        }
        Returns: Json
      }
      resume_dealer_by_admin: {
        Args: { p_dealer_id: string; p_admin_id?: string }
        Returns: Json
      }
      resume_dealer_with_pin: {
        Args: { p_dealer_id: string; p_pin_code: string }
        Returns: Json
      }
      send_dealer_pin_email: {
        Args: { p_dealer_id: string }
        Returns: Json
      }
      sync_columns: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      unlock_application: {
        Args: { p_application_id: string; p_dealer_id: string }
        Returns: Json
      }
      update_application: {
        Args: { p_application_id: string; p_application_data: Json }
        Returns: Json
      }
      update_company_pricing: {
        Args: {
          p_company_id: string
          p_standard_price: number
          p_discounted_price: number
        }
        Returns: Json
      }
    }
    Enums: {
      user_role: "dealer" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["dealer", "admin"],
    },
  },
} as const
