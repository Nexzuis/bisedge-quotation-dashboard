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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          company_id: string
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          quote_id: string | null
          title: string
          type: string
        }
        Insert: {
          company_id: string
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          quote_id?: string | null
          title: string
          type: string
        }
        Update: {
          company_id?: string
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          quote_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_actions: {
        Row: {
          action: string
          created_at: string | null
          id: string
          notes: string | null
          performed_by: string
          quote_id: string
          tier: number | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          notes?: string | null
          performed_by: string
          quote_id: string
          tier?: number | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          performed_by?: string
          quote_id?: string
          tier?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_actions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_actions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_tiers: {
        Row: {
          approver_role: string | null
          description: string | null
          id: string
          max_value: number
          min_value: number
          tier_level: number
          tier_name: string
        }
        Insert: {
          approver_role?: string | null
          description?: string | null
          id?: string
          max_value: number
          min_value: number
          tier_level: number
          tier_name: string
        }
        Update: {
          approver_role?: string | null
          description?: string | null
          id?: string
          max_value?: number
          min_value?: number
          tier_level?: number
          tier_name?: string
        }
        Relationships: []
      }
      attachments: {
        Row: {
          category: string | null
          compatible_models: string[] | null
          description: string | null
          eur_cost: number
          id: string
          image_url: string | null
          name: string
        }
        Insert: {
          category?: string | null
          compatible_models?: string[] | null
          description?: string | null
          eur_cost: number
          id: string
          image_url?: string | null
          name: string
        }
        Update: {
          category?: string | null
          compatible_models?: string[] | null
          description?: string | null
          eur_cost?: number
          id?: string
          image_url?: string | null
          name?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          changes: Json | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      battery_models: {
        Row: {
          capacity: number | null
          chemistry: string
          compatible_models: string[] | null
          dimensions: Json | null
          eur_cost: number
          id: string
          name: string
          voltage: number | null
          warranty_years: number | null
          weight: number | null
        }
        Insert: {
          capacity?: number | null
          chemistry: string
          compatible_models?: string[] | null
          dimensions?: Json | null
          eur_cost: number
          id: string
          name: string
          voltage?: number | null
          warranty_years?: number | null
          weight?: number | null
        }
        Update: {
          capacity?: number | null
          chemistry?: string
          compatible_models?: string[] | null
          dimensions?: Json | null
          eur_cost?: number
          id?: string
          name?: string
          voltage?: number | null
          warranty_years?: number | null
          weight?: number | null
        }
        Relationships: []
      }
      commission_tiers: {
        Row: {
          commission_pct: number
          id: string
          max_margin: number
          min_margin: number
        }
        Insert: {
          commission_pct: number
          id?: string
          max_margin: number
          min_margin: number
        }
        Update: {
          commission_pct?: number
          id?: string
          max_margin?: number
          min_margin?: number
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: Json | null
          assigned_to: string | null
          city: string | null
          country: string | null
          created_at: string | null
          credit_limit: number | null
          email: string | null
          estimated_value: number | null
          id: string
          industry: string | null
          name: string
          notes: string | null
          payment_terms: number | null
          phone: string | null
          pipeline_stage: string
          postal_code: string | null
          province: string | null
          registration_number: string | null
          tags: Json | null
          trading_name: string | null
          updated_at: string | null
          vat_number: string | null
          website: string | null
        }
        Insert: {
          address?: Json | null
          assigned_to?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          credit_limit?: number | null
          email?: string | null
          estimated_value?: number | null
          id?: string
          industry?: string | null
          name: string
          notes?: string | null
          payment_terms?: number | null
          phone?: string | null
          pipeline_stage?: string
          postal_code?: string | null
          province?: string | null
          registration_number?: string | null
          tags?: Json | null
          trading_name?: string | null
          updated_at?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          address?: Json | null
          assigned_to?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          credit_limit?: number | null
          email?: string | null
          estimated_value?: number | null
          id?: string
          industry?: string | null
          name?: string
          notes?: string | null
          payment_terms?: number | null
          phone?: string | null
          pipeline_stage?: string
          postal_code?: string | null
          province?: string | null
          registration_number?: string | null
          tags?: Json | null
          trading_name?: string | null
          updated_at?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      configuration_matrices: {
        Row: {
          base_model_family: string
          created_at: string | null
          id: string
          updated_at: string | null
          variants: Json | null
        }
        Insert: {
          base_model_family: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          variants?: Json | null
        }
        Update: {
          base_model_family?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          variants?: Json | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company_id: string
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          is_primary: boolean | null
          last_name: string | null
          phone: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_primary?: boolean | null
          last_name?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_primary?: boolean | null
          last_name?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      container_mappings: {
        Row: {
          category: string | null
          container_cost_eur: number | null
          container_type: string | null
          id: number
          model: string | null
          notes: string | null
          qty_per_container: number | null
          series_code: string
        }
        Insert: {
          category?: string | null
          container_cost_eur?: number | null
          container_type?: string | null
          id?: number
          model?: string | null
          notes?: string | null
          qty_per_container?: number | null
          series_code: string
        }
        Update: {
          category?: string | null
          container_cost_eur?: number | null
          container_type?: string | null
          id?: number
          model?: string | null
          notes?: string | null
          qty_per_container?: number | null
          series_code?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: Json | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      forklift_models: {
        Row: {
          available_masts: string[] | null
          capacity: number | null
          category: string | null
          compatible_batteries: string[] | null
          default_mast: string | null
          description: string | null
          dimensions: Json | null
          eur_cost: number
          image_url: string | null
          model_code: string
          model_name: string
          specifications: Json | null
        }
        Insert: {
          available_masts?: string[] | null
          capacity?: number | null
          category?: string | null
          compatible_batteries?: string[] | null
          default_mast?: string | null
          description?: string | null
          dimensions?: Json | null
          eur_cost: number
          image_url?: string | null
          model_code: string
          model_name: string
          specifications?: Json | null
        }
        Update: {
          available_masts?: string[] | null
          capacity?: number | null
          category?: string | null
          compatible_batteries?: string[] | null
          default_mast?: string | null
          description?: string | null
          dimensions?: Json | null
          eur_cost?: number
          image_url?: string | null
          model_code?: string
          model_name?: string
          specifications?: Json | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          address: string | null
          ai_confidence: number | null
          ai_reasoning: string | null
          annual_revenue_estimate: string | null
          assigned_to: string | null
          buy_probability: number | null
          city: string | null
          company_name: string
          company_size: string | null
          converted_at: string | null
          converted_by: string | null
          converted_company_id: string | null
          converted_contact_id: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          decision_maker_email: string | null
          decision_maker_linkedin: string | null
          decision_maker_name: string | null
          decision_maker_phone: string | null
          decision_maker_title: string | null
          id: string
          industry: string | null
          notes: string | null
          province: string | null
          qualification_status: string | null
          qualified_at: string | null
          qualified_by: string | null
          rejection_reason: string | null
          scraped_at: string | null
          source_name: string | null
          source_url: string | null
          tags: string[] | null
          trading_name: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          ai_confidence?: number | null
          ai_reasoning?: string | null
          annual_revenue_estimate?: string | null
          assigned_to?: string | null
          buy_probability?: number | null
          city?: string | null
          company_name: string
          company_size?: string | null
          converted_at?: string | null
          converted_by?: string | null
          converted_company_id?: string | null
          converted_contact_id?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          decision_maker_email?: string | null
          decision_maker_linkedin?: string | null
          decision_maker_name?: string | null
          decision_maker_phone?: string | null
          decision_maker_title?: string | null
          id?: string
          industry?: string | null
          notes?: string | null
          province?: string | null
          qualification_status?: string | null
          qualified_at?: string | null
          qualified_by?: string | null
          rejection_reason?: string | null
          scraped_at?: string | null
          source_name?: string | null
          source_url?: string | null
          tags?: string[] | null
          trading_name?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          ai_confidence?: number | null
          ai_reasoning?: string | null
          annual_revenue_estimate?: string | null
          assigned_to?: string | null
          buy_probability?: number | null
          city?: string | null
          company_name?: string
          company_size?: string | null
          converted_at?: string | null
          converted_by?: string | null
          converted_company_id?: string | null
          converted_contact_id?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          decision_maker_email?: string | null
          decision_maker_linkedin?: string | null
          decision_maker_name?: string | null
          decision_maker_phone?: string | null
          decision_maker_title?: string | null
          id?: string
          industry?: string | null
          notes?: string | null
          province?: string | null
          qualification_status?: string | null
          qualified_at?: string | null
          qualified_by?: string | null
          rejection_reason?: string | null
          scraped_at?: string | null
          source_name?: string | null
          source_url?: string | null
          tags?: string[] | null
          trading_name?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_by_fkey"
            columns: ["converted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_company_id_fkey"
            columns: ["converted_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_contact_id_fkey"
            columns: ["converted_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_qualified_by_fkey"
            columns: ["qualified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      price_list_series: {
        Row: {
          models: Json | null
          options: Json | null
          series_code: string
          series_name: string
        }
        Insert: {
          models?: Json | null
          options?: Json | null
          series_code: string
          series_name: string
        }
        Update: {
          models?: Json | null
          options?: Json | null
          series_code?: string
          series_name?: string
        }
        Relationships: []
      }
      quote_collaborators: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          permission: string | null
          quote_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          permission?: string | null
          quote_id: string
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          permission?: string | null
          quote_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_collaborators_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_collaborators_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_presence: {
        Row: {
          last_seen_at: string | null
          quote_id: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string | null
          quote_id: string
          user_id: string
        }
        Update: {
          last_seen_at?: string | null
          quote_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_presence_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_versions: {
        Row: {
          change_summary: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          quote_id: string
          snapshot: Json
          version: number
        }
        Insert: {
          change_summary?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          quote_id: string
          snapshot: Json
          version: number
        }
        Update: {
          change_summary?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          quote_id?: string
          snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_versions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_versions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          annual_interest_rate: number
          approval_chain: Json | null
          approval_notes: string | null
          approval_status: string | null
          approval_tier: number | null
          approved_at: string | null
          approved_by: string | null
          assigned_to: string | null
          battery_chemistry_lock: string | null
          client_address: Json | null
          client_name: string
          company_id: string | null
          contact_email: string | null
          contact_name: string
          contact_phone: string | null
          contact_title: string | null
          created_at: string | null
          created_by: string
          current_assignee_id: string | null
          current_assignee_role: string | null
          customer_id: string | null
          customer_roe: number
          default_lease_term_months: number | null
          discount_pct: number | null
          factory_roe: number
          id: string
          last_synced_at: string | null
          locked_at: string | null
          locked_by: string | null
          override_irr: boolean | null
          quote_date: string | null
          quote_ref: string
          quote_type: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          shipping_entries: Json | null
          slots: Json
          status: string
          submitted_at: string | null
          submitted_by: string | null
          sync_status: string | null
          updated_at: string | null
          updated_by: string | null
          validity_days: number | null
          version: number | null
        }
        Insert: {
          annual_interest_rate: number
          approval_chain?: Json | null
          approval_notes?: string | null
          approval_status?: string | null
          approval_tier?: number | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          battery_chemistry_lock?: string | null
          client_address?: Json | null
          client_name: string
          company_id?: string | null
          contact_email?: string | null
          contact_name: string
          contact_phone?: string | null
          contact_title?: string | null
          created_at?: string | null
          created_by: string
          current_assignee_id?: string | null
          current_assignee_role?: string | null
          customer_id?: string | null
          customer_roe: number
          default_lease_term_months?: number | null
          discount_pct?: number | null
          factory_roe: number
          id?: string
          last_synced_at?: string | null
          locked_at?: string | null
          locked_by?: string | null
          override_irr?: boolean | null
          quote_date?: string | null
          quote_ref: string
          quote_type?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          shipping_entries?: Json | null
          slots: Json
          status: string
          submitted_at?: string | null
          submitted_by?: string | null
          sync_status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          validity_days?: number | null
          version?: number | null
        }
        Update: {
          annual_interest_rate?: number
          approval_chain?: Json | null
          approval_notes?: string | null
          approval_status?: string | null
          approval_tier?: number | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          battery_chemistry_lock?: string | null
          client_address?: Json | null
          client_name?: string
          company_id?: string | null
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string | null
          contact_title?: string | null
          created_at?: string | null
          created_by?: string
          current_assignee_id?: string | null
          current_assignee_role?: string | null
          customer_id?: string | null
          customer_roe?: number
          default_lease_term_months?: number | null
          discount_pct?: number | null
          factory_roe?: number
          id?: string
          last_synced_at?: string | null
          locked_at?: string | null
          locked_by?: string | null
          override_irr?: boolean | null
          quote_date?: string | null
          quote_ref?: string
          quote_type?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          shipping_entries?: Json | null
          slots?: Json
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          sync_status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          validity_days?: number | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_current_assignee_id_fkey"
            columns: ["current_assignee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      residual_curves: {
        Row: {
          chemistry: string
          id: string
          term_36: number | null
          term_48: number | null
          term_60: number | null
          term_72: number | null
          term_84: number | null
        }
        Insert: {
          chemistry: string
          id?: string
          term_36?: number | null
          term_48?: number | null
          term_60?: number | null
          term_72?: number | null
          term_84?: number | null
        }
        Update: {
          chemistry?: string
          id?: string
          term_36?: number | null
          term_48?: number | null
          term_60?: number | null
          term_72?: number | null
          term_84?: number | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      telematics_packages: {
        Row: {
          cost_zar: number | null
          description: string | null
          id: string
          name: string
          tags: string | null
        }
        Insert: {
          cost_zar?: number | null
          description?: string | null
          id?: string
          name: string
          tags?: string | null
        }
        Update: {
          cost_zar?: number | null
          description?: string | null
          id?: string
          name?: string
          tags?: string | null
        }
        Relationships: []
      }
      templates: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          content: Json
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          type: string
          updated_at?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          delegate_to: string | null
          delegate_until: string | null
          department: string | null
          email: string
          employee_id: string | null
          full_name: string
          id: string
          is_active: boolean | null
          permission_overrides: Json | null
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delegate_to?: string | null
          delegate_until?: string | null
          department?: string | null
          email: string
          employee_id?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          permission_overrides?: Json | null
          phone?: string | null
          role: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delegate_to?: string | null
          delegate_until?: string | null
          department?: string | null
          email?: string
          employee_id?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          permission_overrides?: Json | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_delegate_to_fkey"
            columns: ["delegate_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_next_quote_ref: { Args: never; Returns: string }
      is_admin_user: { Args: never; Returns: boolean }
      merge_companies: {
        Args: {
          p_merged_data: Json
          p_primary_id: string
          p_secondary_id: string
        }
        Returns: undefined
      }
      save_quote_if_version: {
        Args: { p_data: Json; p_expected_version: number; p_id: string }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
