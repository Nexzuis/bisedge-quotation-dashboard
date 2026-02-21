/**
 * Database Type Definitions for Supabase
 *
 * This file contains TypeScript interfaces matching the PostgreSQL schema.
 * TODO: Replace with auto-generated types after running:
 * npx supabase gen types typescript --project-id xxxxx > src/lib/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string // UUID
          email: string
          full_name: string
          role: 'system_admin' | 'ceo' | 'local_leader' | 'sales_manager' | 'key_account' | 'sales_rep'
          is_active: boolean
          created_at: string
          updated_at: string
          phone: string | null
          department: string | null
          employee_id: string | null
          delegate_to: string | null
          delegate_until: string | null
          permission_overrides: Json | null
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role: 'system_admin' | 'ceo' | 'local_leader' | 'sales_manager' | 'key_account' | 'sales_rep'
          is_active?: boolean
          created_at?: string
          updated_at?: string
          phone?: string | null
          department?: string | null
          employee_id?: string | null
          delegate_to?: string | null
          delegate_until?: string | null
          permission_overrides?: Json | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'system_admin' | 'ceo' | 'local_leader' | 'sales_manager' | 'key_account' | 'sales_rep'
          is_active?: boolean
          created_at?: string
          updated_at?: string
          phone?: string | null
          department?: string | null
          employee_id?: string | null
          delegate_to?: string | null
          delegate_until?: string | null
          permission_overrides?: Json | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          id: string
          name: string
          contact_person: string | null
          contact_email: string | null
          contact_phone: string | null
          address: Json | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          contact_person?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          address?: Json | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          contact_person?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          address?: Json | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          id: string
          quote_ref: string
          version: number
          status: 'draft' | 'pending-approval' | 'in-review' | 'changes-requested' | 'approved' | 'sent-to-customer' | 'rejected' | 'expired'
          created_by: string
          assigned_to: string | null
          customer_id: string | null
          company_id: string | null
          client_name: string
          contact_name: string
          contact_title: string | null
          contact_email: string | null
          contact_phone: string | null
          client_address: Json | null
          factory_roe: number
          customer_roe: number
          discount_pct: number
          annual_interest_rate: number
          default_lease_term_months: number | null
          battery_chemistry_lock: 'lead-acid' | 'lithium-ion' | null
          quote_type: 'rental' | 'rent-to-own' | 'dual' | null
          slots: Json // Array of UnitSlot objects
          shipping_entries: Json | null
          approval_tier: number | null
          approval_status: string | null
          approval_notes: string | null
          override_irr: boolean
          submitted_by: string | null
          submitted_at: string | null
          approved_by: string | null
          approved_at: string | null
          rejected_by: string | null
          rejected_at: string | null
          rejection_reason: string | null
          current_assignee_id: string | null
          current_assignee_role: string | null
          approval_chain: Json | null
          locked_by: string | null
          locked_at: string | null
          created_at: string
          updated_at: string
          updated_by: string | null
          quote_date: string
          validity_days: number | null
          last_synced_at: string | null
          sync_status: 'synced' | 'pending' | 'conflict' | null
        }
        Insert: {
          id?: string
          quote_ref: string
          version?: number
          status: 'draft' | 'pending-approval' | 'in-review' | 'changes-requested' | 'approved' | 'sent-to-customer' | 'rejected' | 'expired'
          created_by: string
          assigned_to?: string | null
          customer_id?: string | null
          company_id?: string | null
          client_name: string
          contact_name: string
          contact_title?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          client_address?: Json | null
          factory_roe: number
          customer_roe: number
          discount_pct?: number
          annual_interest_rate: number
          default_lease_term_months?: number | null
          battery_chemistry_lock?: 'lead-acid' | 'lithium-ion' | null
          quote_type?: 'rental' | 'rent-to-own' | 'dual' | null
          slots: Json
          shipping_entries?: Json | null
          approval_tier?: number | null
          approval_status?: string | null
          approval_notes?: string | null
          override_irr?: boolean
          submitted_by?: string | null
          submitted_at?: string | null
          approved_by?: string | null
          approved_at?: string | null
          rejected_by?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          current_assignee_id?: string | null
          current_assignee_role?: string | null
          approval_chain?: Json | null
          locked_by?: string | null
          locked_at?: string | null
          created_at?: string
          updated_at?: string
          updated_by?: string | null
          quote_date?: string
          validity_days?: number | null
          last_synced_at?: string | null
          sync_status?: 'synced' | 'pending' | 'conflict' | null
        }
        Update: {
          id?: string
          quote_ref?: string
          version?: number
          status?: 'draft' | 'pending-approval' | 'in-review' | 'changes-requested' | 'approved' | 'sent-to-customer' | 'rejected' | 'expired'
          created_by?: string
          assigned_to?: string | null
          customer_id?: string | null
          company_id?: string | null
          client_name?: string
          contact_name?: string
          contact_title?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          client_address?: Json | null
          factory_roe?: number
          customer_roe?: number
          discount_pct?: number
          annual_interest_rate?: number
          default_lease_term_months?: number | null
          battery_chemistry_lock?: 'lead-acid' | 'lithium-ion' | null
          quote_type?: 'rental' | 'rent-to-own' | 'dual' | null
          slots?: Json
          shipping_entries?: Json | null
          approval_tier?: number | null
          approval_status?: string | null
          approval_notes?: string | null
          override_irr?: boolean
          submitted_by?: string | null
          submitted_at?: string | null
          approved_by?: string | null
          approved_at?: string | null
          rejected_by?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          current_assignee_id?: string | null
          current_assignee_role?: string | null
          approval_chain?: Json | null
          locked_by?: string | null
          locked_at?: string | null
          created_at?: string
          updated_at?: string
          updated_by?: string | null
          quote_date?: string
          validity_days?: number | null
          last_synced_at?: string | null
          sync_status?: 'synced' | 'pending' | 'conflict' | null
        }
        Relationships: []
      }
      quote_versions: {
        Row: {
          id: string
          quote_id: string
          version: number
          snapshot: Json
          changed_by: string | null
          change_summary: string | null
          created_at: string
        }
        Insert: {
          id?: string
          quote_id: string
          version: number
          snapshot: Json
          changed_by?: string | null
          change_summary?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          quote_id?: string
          version?: number
          snapshot?: Json
          changed_by?: string | null
          change_summary?: string | null
          created_at?: string
        }
        Relationships: []
      }
      approval_actions: {
        Row: {
          id: string
          quote_id: string
          action: 'submitted' | 'approved' | 'rejected' | 'delegated' | 'recalled'
          performed_by: string
          tier: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          quote_id: string
          action: 'submitted' | 'approved' | 'rejected' | 'delegated' | 'recalled'
          performed_by: string
          tier?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          quote_id?: string
          action?: 'submitted' | 'approved' | 'rejected' | 'delegated' | 'recalled'
          performed_by?: string
          tier?: number | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      quote_collaborators: {
        Row: {
          quote_id: string
          user_id: string
          permission: 'view' | 'edit' | 'approve'
          granted_by: string | null
          granted_at: string
        }
        Insert: {
          quote_id: string
          user_id: string
          permission: 'view' | 'edit' | 'approve'
          granted_by?: string | null
          granted_at?: string
        }
        Update: {
          quote_id?: string
          user_id?: string
          permission?: 'view' | 'edit' | 'approve'
          granted_by?: string | null
          granted_at?: string
        }
        Relationships: []
      }
      quote_presence: {
        Row: {
          quote_id: string
          user_id: string
          last_seen_at: string
        }
        Insert: {
          quote_id: string
          user_id: string
          last_seen_at?: string
        }
        Update: {
          quote_id?: string
          user_id?: string
          last_seen_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          id: string
          timestamp: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string
          changes: Json | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          timestamp?: string
          user_id?: string | null
          action: string
          entity_type: string
          entity_id: string
          changes?: Json | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          timestamp?: string
          user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string
          changes?: Json | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      approval_tiers: {
        Row: {
          id: string
          tier_level: number
          tier_name: string
          min_value: number
          max_value: number
          approver_role: string | null
          description: string | null
        }
        Insert: {
          id?: string
          tier_level: number
          tier_name: string
          min_value: number
          max_value: number
          approver_role?: string | null
          description?: string | null
        }
        Update: {
          id?: string
          tier_level?: number
          tier_name?: string
          min_value?: number
          max_value?: number
          approver_role?: string | null
          description?: string | null
        }
        Relationships: []
      }
      commission_tiers: {
        Row: {
          id: string
          min_margin: number
          max_margin: number
          commission_pct: number
        }
        Insert: {
          id?: string
          min_margin: number
          max_margin: number
          commission_pct: number
        }
        Update: {
          id?: string
          min_margin?: number
          max_margin?: number
          commission_pct?: number
        }
        Relationships: []
      }
      residual_curves: {
        Row: {
          id: string
          chemistry: 'lead-acid' | 'lithium-ion'
          term_36: number | null
          term_48: number | null
          term_60: number | null
          term_72: number | null
          term_84: number | null
        }
        Insert: {
          id?: string
          chemistry: 'lead-acid' | 'lithium-ion'
          term_36?: number | null
          term_48?: number | null
          term_60?: number | null
          term_72?: number | null
          term_84?: number | null
        }
        Update: {
          id?: string
          chemistry?: 'lead-acid' | 'lithium-ion'
          term_36?: number | null
          term_48?: number | null
          term_60?: number | null
          term_72?: number | null
          term_84?: number | null
        }
        Relationships: []
      }
      forklift_models: {
        Row: {
          model_code: string
          model_name: string
          description: string | null
          category: string | null
          capacity: number | null
          eur_cost: number
          default_mast: string | null
          available_masts: string[] | null
          compatible_batteries: string[] | null
          dimensions: Json | null
          specifications: Json | null
          image_url: string | null
        }
        Insert: {
          model_code: string
          model_name: string
          description?: string | null
          category?: string | null
          capacity?: number | null
          eur_cost: number
          default_mast?: string | null
          available_masts?: string[] | null
          compatible_batteries?: string[] | null
          dimensions?: Json | null
          specifications?: Json | null
          image_url?: string | null
        }
        Update: {
          model_code?: string
          model_name?: string
          description?: string | null
          category?: string | null
          capacity?: number | null
          eur_cost?: number
          default_mast?: string | null
          available_masts?: string[] | null
          compatible_batteries?: string[] | null
          dimensions?: Json | null
          specifications?: Json | null
          image_url?: string | null
        }
        Relationships: []
      }
      battery_models: {
        Row: {
          id: string
          name: string
          chemistry: string
          voltage: number | null
          capacity: number | null
          eur_cost: number
          weight: number | null
          dimensions: Json | null
          compatible_models: string[] | null
          warranty_years: number | null
        }
        Insert: {
          id: string
          name: string
          chemistry: string
          voltage?: number | null
          capacity?: number | null
          eur_cost: number
          weight?: number | null
          dimensions?: Json | null
          compatible_models?: string[] | null
          warranty_years?: number | null
        }
        Update: {
          id?: string
          name?: string
          chemistry?: string
          voltage?: number | null
          capacity?: number | null
          eur_cost?: number
          weight?: number | null
          dimensions?: Json | null
          compatible_models?: string[] | null
          warranty_years?: number | null
        }
        Relationships: []
      }
      attachments: {
        Row: {
          id: string
          name: string
          category: string | null
          eur_cost: number
          description: string | null
          compatible_models: string[] | null
          image_url: string | null
        }
        Insert: {
          id: string
          name: string
          category?: string | null
          eur_cost: number
          description?: string | null
          compatible_models?: string[] | null
          image_url?: string | null
        }
        Update: {
          id?: string
          name?: string
          category?: string | null
          eur_cost?: number
          description?: string | null
          compatible_models?: string[] | null
          image_url?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          id: string
          name: string
          trading_name: string
          registration_number: string
          vat_number: string
          industry: string
          website: string
          address: Json
          city: string
          province: string
          postal_code: string
          country: string
          phone: string
          email: string
          pipeline_stage: 'lead' | 'contacted' | 'site-assessment' | 'quoted' | 'negotiation' | 'won' | 'lost'
          assigned_to: string | null
          estimated_value: number
          credit_limit: number
          payment_terms: number
          tags: Json
          notes: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          trading_name?: string
          registration_number?: string
          vat_number?: string
          industry?: string
          website?: string
          address?: Json
          city?: string
          province?: string
          postal_code?: string
          country?: string
          phone?: string
          email?: string
          pipeline_stage?: 'lead' | 'contacted' | 'site-assessment' | 'quoted' | 'negotiation' | 'won' | 'lost'
          assigned_to?: string | null
          estimated_value?: number
          credit_limit?: number
          payment_terms?: number
          tags?: Json
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          trading_name?: string
          registration_number?: string
          vat_number?: string
          industry?: string
          website?: string
          address?: Json
          city?: string
          province?: string
          postal_code?: string
          country?: string
          phone?: string
          email?: string
          pipeline_stage?: 'lead' | 'contacted' | 'site-assessment' | 'quoted' | 'negotiation' | 'won' | 'lost'
          assigned_to?: string | null
          estimated_value?: number
          credit_limit?: number
          payment_terms?: number
          tags?: Json
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          id: string
          company_id: string
          first_name: string
          last_name: string
          title: string
          email: string
          phone: string
          is_primary: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          first_name: string
          last_name?: string
          title?: string
          email?: string
          phone?: string
          is_primary?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          first_name?: string
          last_name?: string
          title?: string
          email?: string
          phone?: string
          is_primary?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      activities: {
        Row: {
          id: string
          company_id: string
          contact_id: string | null
          quote_id: string | null
          type: 'note' | 'call' | 'email' | 'meeting' | 'site-visit' | 'quote-created' | 'quote-sent' | 'stage-change'
          title: string
          description: string
          due_date: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          contact_id?: string | null
          quote_id?: string | null
          type: 'note' | 'call' | 'email' | 'meeting' | 'site-visit' | 'quote-created' | 'quote-sent' | 'stage-change'
          title: string
          description?: string
          due_date?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          contact_id?: string | null
          quote_id?: string | null
          type?: 'note' | 'call' | 'email' | 'meeting' | 'site-visit' | 'quote-created' | 'quote-sent' | 'stage-change'
          title?: string
          description?: string
          due_date?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'approval_needed' | 'approval_result' | 'quote_assigned' | 'company_assigned' | 'stage_change' | 'activity_mention' | 'system'
          title: string
          message: string
          entity_type: 'quote' | 'company' | 'activity' | null
          entity_id: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'approval_needed' | 'approval_result' | 'quote_assigned' | 'company_assigned' | 'stage_change' | 'activity_mention' | 'system'
          title: string
          message?: string
          entity_type?: 'quote' | 'company' | 'activity' | null
          entity_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'approval_needed' | 'approval_result' | 'quote_assigned' | 'company_assigned' | 'stage_change' | 'activity_mention' | 'system'
          title?: string
          message?: string
          entity_type?: 'quote' | 'company' | 'activity' | null
          entity_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          id: string
          type: 'terms-and-conditions' | 'email' | 'quote-header' | 'cover-letter'
          name: string
          content: Json
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: 'terms-and-conditions' | 'email' | 'quote-header' | 'cover-letter'
          name: string
          content: Json
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: 'terms-and-conditions' | 'email' | 'quote-header' | 'cover-letter'
          name?: string
          content?: Json
          is_default?: boolean
          created_at?: string
          updated_at?: string
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
      price_list_series: {
        Row: {
          series_code: string
          series_name: string
          models: Json
          options: Json
        }
        Insert: {
          series_code: string
          series_name: string
          models?: Json
          options?: Json
        }
        Update: {
          series_code?: string
          series_name?: string
          models?: Json
          options?: Json
        }
        Relationships: []
      }
      telematics_packages: {
        Row: {
          id: string
          name: string
          description: string
          tags: string
          cost_zar: number
        }
        Insert: {
          id?: string
          name: string
          description?: string
          tags?: string
          cost_zar?: number
        }
        Update: {
          id?: string
          name?: string
          description?: string
          tags?: string
          cost_zar?: number
        }
        Relationships: []
      }
      container_mappings: {
        Row: {
          id: number
          series_code: string
          category: string
          model: string
          qty_per_container: number
          container_type: string
          container_cost_eur: number
          notes: string
        }
        Insert: {
          id?: number
          series_code: string
          category?: string
          model?: string
          qty_per_container?: number
          container_type?: string
          container_cost_eur?: number
          notes?: string
        }
        Update: {
          id?: number
          series_code?: string
          category?: string
          model?: string
          qty_per_container?: number
          container_type?: string
          container_cost_eur?: number
          notes?: string
        }
        Relationships: []
      }
      configuration_matrices: {
        Row: {
          id: string
          base_model_family: string
          variants: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          base_model_family: string
          variants?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          base_model_family?: string
          variants?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      merge_companies: {
        Args: {
          p_primary_id: string
          p_secondary_id: string
          p_merged_data: Json
        }
        Returns: void
      }
      generate_next_quote_ref: {
        Args: Record<string, never>
        Returns: string
      }
      save_quote_if_version: {
        Args: {
          p_id: string
          p_expected_version: number
          p_data: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
