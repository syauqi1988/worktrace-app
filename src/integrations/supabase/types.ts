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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          admin_notes: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          created_at: string
          id: string
          reason: string | null
          requested_at: string
          scheduled_at: string
          status: string
          user_email: string
          user_id: string
          user_name: string | null
          user_plan: string | null
        }
        Insert: {
          admin_notes?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          requested_at?: string
          scheduled_at: string
          status?: string
          user_email: string
          user_id: string
          user_name?: string | null
          user_plan?: string | null
        }
        Update: {
          admin_notes?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          requested_at?: string
          scheduled_at?: string
          status?: string
          user_email?: string
          user_id?: string
          user_name?: string | null
          user_plan?: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          last_login: string | null
          name: string
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          name: string
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          name?: string
          role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          seen_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          seen_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          seen_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body_en: string | null
          body_ms: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          link: string | null
          published_at: string
          severity: string
          show_popup: boolean
          title_en: string
          title_ms: string
          updated_at: string
        }
        Insert: {
          body_en?: string | null
          body_ms?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          link?: string | null
          published_at?: string
          severity?: string
          show_popup?: boolean
          title_en: string
          title_ms: string
          updated_at?: string
        }
        Update: {
          body_en?: string | null
          body_ms?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          link?: string | null
          published_at?: string
          severity?: string
          show_popup?: boolean
          title_en?: string
          title_ms?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_counters: {
        Row: {
          key: string
          value: number | null
        }
        Insert: {
          key: string
          value?: number | null
        }
        Update: {
          key?: string
          value?: number | null
        }
        Relationships: []
      }
      completion_reports: {
        Row: {
          accepted_at: string | null
          after_photos: Json | null
          before_photos: Json | null
          checklist: Json | null
          completion_date: string | null
          created_at: string | null
          customer_signature: string | null
          id: string
          job_id: string
          location_label: string | null
          materials_used: string | null
          notes: string | null
          photo_captions: Json | null
          photos: Json | null
          project_ref: string | null
          rejected_at: string | null
          rejection_reason: string | null
          report_number: string
          status: string | null
          submitted_at: string | null
          technician_name: string | null
          user_id: string
          work_description: string | null
        }
        Insert: {
          accepted_at?: string | null
          after_photos?: Json | null
          before_photos?: Json | null
          checklist?: Json | null
          completion_date?: string | null
          created_at?: string | null
          customer_signature?: string | null
          id?: string
          job_id: string
          location_label?: string | null
          materials_used?: string | null
          notes?: string | null
          photo_captions?: Json | null
          photos?: Json | null
          project_ref?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          report_number: string
          status?: string | null
          submitted_at?: string | null
          technician_name?: string | null
          user_id: string
          work_description?: string | null
        }
        Update: {
          accepted_at?: string | null
          after_photos?: Json | null
          before_photos?: Json | null
          checklist?: Json | null
          completion_date?: string | null
          created_at?: string | null
          customer_signature?: string | null
          id?: string
          job_id?: string
          location_label?: string | null
          materials_used?: string | null
          notes?: string | null
          photo_captions?: Json | null
          photos?: Json | null
          project_ref?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          report_number?: string
          status?: string | null
          submitted_at?: string | null
          technician_name?: string | null
          user_id?: string
          work_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "completion_reports_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_approvals: {
        Row: {
          action: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          document_id: string
          document_type: string
          expires_at: string | null
          id: string
          pdf_url: string | null
          reason: string | null
          responded_at: string | null
          token: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          document_id: string
          document_type: string
          expires_at?: string | null
          id?: string
          pdf_url?: string | null
          reason?: string | null
          responded_at?: string | null
          token: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          document_id?: string
          document_type?: string
          expires_at?: string | null
          id?: string
          pdf_url?: string | null
          reason?: string | null
          responded_at?: string | null
          token?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          tags: string[] | null
          tags_v2: Json | null
          tin_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          tags_v2?: Json | null
          tin_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          tags_v2?: Json | null
          tin_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      features: {
        Row: {
          created_at: string
          id: string
          kind: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          created_at: string
          customer_id: string | null
          discount: number
          due_date: string | null
          id: string
          invoice_number: string
          issued_date: string | null
          items: Json
          job_id: string | null
          lhdn_submitted: boolean
          notes: string | null
          paid_date: string | null
          payment_proof_token: string | null
          quote_id: string | null
          receipt_number: string | null
          selected_payment_methods: Json | null
          status: string
          subtotal: number
          tax_rate: number
          terms: string | null
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          discount?: number
          due_date?: string | null
          id?: string
          invoice_number: string
          issued_date?: string | null
          items?: Json
          job_id?: string | null
          lhdn_submitted?: boolean
          notes?: string | null
          paid_date?: string | null
          payment_proof_token?: string | null
          quote_id?: string | null
          receipt_number?: string | null
          selected_payment_methods?: Json | null
          status?: string
          subtotal?: number
          tax_rate?: number
          terms?: string | null
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          discount?: number
          due_date?: string | null
          id?: string
          invoice_number?: string
          issued_date?: string | null
          items?: Json
          job_id?: string | null
          lhdn_submitted?: boolean
          notes?: string | null
          paid_date?: string | null
          payment_proof_token?: string | null
          quote_id?: string | null
          receipt_number?: string | null
          selected_payment_methods?: Json | null
          status?: string
          subtotal?: number
          tax_rate?: number
          terms?: string | null
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          amount: number | null
          category: string
          completed_date: string | null
          created_at: string
          customer_id: string | null
          description: string | null
          id: string
          job_number: string
          notes: string | null
          scheduled_date: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          category?: string
          completed_date?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          job_number: string
          notes?: string | null
          scheduled_date?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          category?: string
          completed_date?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          job_number?: string
          notes?: string | null
          scheduled_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          i18n: Json | null
          id: string
          link: string | null
          read_at: string | null
          ref_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          i18n?: Json | null
          id?: string
          link?: string | null
          read_at?: string | null
          ref_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          i18n?: Json | null
          id?: string
          link?: string | null
          read_at?: string | null
          ref_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_proofs: {
        Row: {
          amount_paid: number | null
          bank_name: string | null
          created_at: string
          id: string
          invoice_id: string
          invoice_pdf_url: string | null
          notes: string | null
          payer_name: string | null
          payment_date: string | null
          payment_method: string | null
          receipt_url: string | null
          reference_number: string | null
          rejection_reason: string | null
          status: string
          submitted_at: string | null
          token: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount_paid?: number | null
          bank_name?: string | null
          created_at?: string
          id?: string
          invoice_id: string
          invoice_pdf_url?: string | null
          notes?: string | null
          payer_name?: string | null
          payment_date?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          token: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount_paid?: number | null
          bank_name?: string | null
          created_at?: string
          id?: string
          invoice_id?: string
          invoice_pdf_url?: string | null
          notes?: string | null
          payer_name?: string | null
          payment_date?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          token?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      plan_feature_flags: {
        Row: {
          feature_id: string
          feature_name: string | null
          is_unlocked: boolean
          limit_value: number | null
          plan_id: string
        }
        Insert: {
          feature_id: string
          feature_name?: string | null
          is_unlocked?: boolean
          limit_value?: number | null
          plan_id: string
        }
        Update: {
          feature_id?: string
          feature_name?: string | null
          is_unlocked?: boolean
          limit_value?: number | null
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_feature_flags_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_feature_flags_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      pricing_plans: {
        Row: {
          badge_color: string | null
          badge_text: string | null
          created_at: string | null
          currency: string
          features: Json | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          max_customers: number | null
          max_jobs: number | null
          monthly_price: number
          name: string
          plan_key: string
          sort_order: number | null
          tagline: string | null
          updated_at: string | null
          updated_by: string | null
          yearly_discount_pct: number
          yearly_price: number
        }
        Insert: {
          badge_color?: string | null
          badge_text?: string | null
          created_at?: string | null
          currency?: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          max_customers?: number | null
          max_jobs?: number | null
          monthly_price?: number
          name: string
          plan_key: string
          sort_order?: number | null
          tagline?: string | null
          updated_at?: string | null
          updated_by?: string | null
          yearly_discount_pct?: number
          yearly_price?: number
        }
        Update: {
          badge_color?: string | null
          badge_text?: string | null
          created_at?: string | null
          currency?: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          max_customers?: number | null
          max_jobs?: number | null
          monthly_price?: number
          name?: string
          plan_key?: string
          sort_order?: number | null
          tagline?: string | null
          updated_at?: string | null
          updated_by?: string | null
          yearly_discount_pct?: number
          yearly_price?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string | null
          address: string | null
          billing_period: string | null
          billplz_bill_id: string | null
          cancel_reason: string | null
          cancel_requested_at: string | null
          company_name: string | null
          created_at: string
          deletion_cancelled_at: string | null
          deletion_reason: string | null
          deletion_requested_at: string | null
          deletion_scheduled_at: string | null
          doc_number_settings: Json | null
          email: string | null
          free_months_earned: number | null
          free_months_used: number | null
          id: string
          invoice_terms: string | null
          last_support_visit: string | null
          lhdn_enabled: boolean
          logo_url: string | null
          msic_code: string | null
          onboarding_complete: boolean
          passkey_prompt_dismissed: boolean
          payment_methods: Json | null
          phone: string | null
          plan: string
          quotation_terms: string | null
          receipt_count: number | null
          referral_code: string | null
          referral_count: number | null
          referred_by: string | null
          report_count: number | null
          ssm_number_new: string | null
          ssm_number_old: string | null
          sst_registered: boolean
          subscription_cancelled: boolean | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          ticket_count: number | null
          tin_number: string | null
          tutorial_completed: boolean | null
          tutorial_seen_count: number | null
          tutorial_state: Json | null
          updated_at: string
          whatsapp_templates: Json
          wo_terms: string | null
        }
        Insert: {
          account_status?: string | null
          address?: string | null
          billing_period?: string | null
          billplz_bill_id?: string | null
          cancel_reason?: string | null
          cancel_requested_at?: string | null
          company_name?: string | null
          created_at?: string
          deletion_cancelled_at?: string | null
          deletion_reason?: string | null
          deletion_requested_at?: string | null
          deletion_scheduled_at?: string | null
          doc_number_settings?: Json | null
          email?: string | null
          free_months_earned?: number | null
          free_months_used?: number | null
          id: string
          invoice_terms?: string | null
          last_support_visit?: string | null
          lhdn_enabled?: boolean
          logo_url?: string | null
          msic_code?: string | null
          onboarding_complete?: boolean
          passkey_prompt_dismissed?: boolean
          payment_methods?: Json | null
          phone?: string | null
          plan?: string
          quotation_terms?: string | null
          receipt_count?: number | null
          referral_code?: string | null
          referral_count?: number | null
          referred_by?: string | null
          report_count?: number | null
          ssm_number_new?: string | null
          ssm_number_old?: string | null
          sst_registered?: boolean
          subscription_cancelled?: boolean | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          ticket_count?: number | null
          tin_number?: string | null
          tutorial_completed?: boolean | null
          tutorial_seen_count?: number | null
          tutorial_state?: Json | null
          updated_at?: string
          whatsapp_templates?: Json
          wo_terms?: string | null
        }
        Update: {
          account_status?: string | null
          address?: string | null
          billing_period?: string | null
          billplz_bill_id?: string | null
          cancel_reason?: string | null
          cancel_requested_at?: string | null
          company_name?: string | null
          created_at?: string
          deletion_cancelled_at?: string | null
          deletion_reason?: string | null
          deletion_requested_at?: string | null
          deletion_scheduled_at?: string | null
          doc_number_settings?: Json | null
          email?: string | null
          free_months_earned?: number | null
          free_months_used?: number | null
          id?: string
          invoice_terms?: string | null
          last_support_visit?: string | null
          lhdn_enabled?: boolean
          logo_url?: string | null
          msic_code?: string | null
          onboarding_complete?: boolean
          passkey_prompt_dismissed?: boolean
          payment_methods?: Json | null
          phone?: string | null
          plan?: string
          quotation_terms?: string | null
          receipt_count?: number | null
          referral_code?: string | null
          referral_count?: number | null
          referred_by?: string | null
          report_count?: number | null
          ssm_number_new?: string | null
          ssm_number_old?: string | null
          sst_registered?: boolean
          subscription_cancelled?: boolean | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          ticket_count?: number | null
          tin_number?: string | null
          tutorial_completed?: boolean | null
          tutorial_seen_count?: number | null
          tutorial_state?: Json | null
          updated_at?: string
          whatsapp_templates?: Json
          wo_terms?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quotations: {
        Row: {
          created_at: string
          discount: number
          id: string
          items: Json
          job_id: string | null
          notes: string | null
          quote_number: string
          status: string
          subtotal: number
          tax_rate: number
          terms: string | null
          total: number
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          discount?: number
          id?: string
          items?: Json
          job_id?: string | null
          notes?: string | null
          quote_number: string
          status?: string
          subtotal?: number
          tax_rate?: number
          terms?: string | null
          total?: number
          updated_at?: string
          user_id: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          discount?: number
          id?: string
          items?: Json
          job_id?: string | null
          notes?: string | null
          quote_number?: string
          status?: string
          subtotal?: number
          tax_rate?: number
          terms?: string | null
          total?: number
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          months_awarded: number
          referral_code: string
          referred_id: string
          referrer_id: string
          rewarded_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          months_awarded?: number
          referral_code: string
          referred_id: string
          referrer_id: string
          rewarded_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          months_awarded?: number
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          rewarded_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      refund_requests: {
        Row: {
          account_name: string | null
          admin_notes: string | null
          amount_myr: number | null
          billing_period: string | null
          billplz_bill_id: string | null
          created_at: string
          eligibility: string
          id: string
          notes: string | null
          payment_date: string | null
          plan: string | null
          processed_at: string | null
          processed_by: string | null
          reason_category: string
          status: string
          transaction_ref: string | null
          updated_at: string
          user_email: string
          user_id: string
        }
        Insert: {
          account_name?: string | null
          admin_notes?: string | null
          amount_myr?: number | null
          billing_period?: string | null
          billplz_bill_id?: string | null
          created_at?: string
          eligibility: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          plan?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reason_category: string
          status?: string
          transaction_ref?: string | null
          updated_at?: string
          user_email: string
          user_id: string
        }
        Update: {
          account_name?: string | null
          admin_notes?: string | null
          amount_myr?: number | null
          billing_period?: string | null
          billplz_bill_id?: string | null
          created_at?: string
          eligibility?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          plan?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reason_category?: string
          status?: string
          transaction_ref?: string | null
          updated_at?: string
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      short_links: {
        Row: {
          code: string
          created_at: string
          id: string
          kind: string
          target_url: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          kind?: string
          target_url: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          kind?: string
          target_url?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_events: {
        Row: {
          amount: number | null
          billing_period: string | null
          billplz_bill_id: string | null
          created_at: string | null
          event_type: string
          id: string
          notes: string | null
          plan: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          billing_period?: string | null
          billplz_bill_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          notes?: string | null
          plan?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          billing_period?: string | null
          billplz_bill_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          notes?: string | null
          plan?: string | null
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_notes: string | null
          attachments: Json | null
          category: string
          created_at: string | null
          description: string
          id: string
          priority: string | null
          resolved_at: string | null
          status: string | null
          subject: string
          ticket_number: string
          updated_at: string | null
          user_email: string
          user_id: string
          user_name: string | null
          user_plan: string | null
        }
        Insert: {
          admin_notes?: string | null
          attachments?: Json | null
          category: string
          created_at?: string | null
          description: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject: string
          ticket_number: string
          updated_at?: string | null
          user_email: string
          user_id: string
          user_name?: string | null
          user_plan?: string | null
        }
        Update: {
          admin_notes?: string | null
          attachments?: Json | null
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string
          ticket_number?: string
          updated_at?: string | null
          user_email?: string
          user_id?: string
          user_name?: string | null
          user_plan?: string | null
        }
        Relationships: []
      }
      ticket_replies: {
        Row: {
          attachments: Json | null
          created_at: string | null
          id: string
          message: string
          sender_type: string
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          message: string
          sender_type: string
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          message?: string
          sender_type?: string
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feature_overrides: {
        Row: {
          feature_id: string
          is_unlocked: boolean
          limit_value: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          feature_id: string
          is_unlocked: boolean
          limit_value?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          feature_id?: string
          is_unlocked?: boolean
          limit_value?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feature_overrides_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
        ]
      }
      user_passkeys: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_label: string | null
          id: string
          last_used_at: string | null
          public_key: string
          transports: string[]
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_label?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string[]
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_label?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string[]
          user_id?: string
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          created_at: string
          plan_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          plan_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          plan_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      webauthn_challenges: {
        Row: {
          challenge: string
          created_at: string
          email: string | null
          expires_at: string
          id: string
          purpose: string
          user_id: string | null
        }
        Insert: {
          challenge: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          purpose: string
          user_id?: string | null
        }
        Update: {
          challenge?: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          purpose?: string
          user_id?: string | null
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          accepted_at: string | null
          created_at: string
          customer_signature: string | null
          estimated_duration: string | null
          id: string
          items: Json | null
          job_id: string
          location: string | null
          quotation_id: string | null
          rejected_at: string | null
          rejection_reason: string | null
          scheduled_end_date: string | null
          scheduled_start_date: string | null
          scope_of_work: string
          special_instructions: string | null
          status: string
          technician_name: string | null
          terms: string | null
          title: string
          total: number | null
          updated_at: string
          user_id: string
          wo_number: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          customer_signature?: string | null
          estimated_duration?: string | null
          id?: string
          items?: Json | null
          job_id: string
          location?: string | null
          quotation_id?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          scheduled_end_date?: string | null
          scheduled_start_date?: string | null
          scope_of_work: string
          special_instructions?: string | null
          status?: string
          technician_name?: string | null
          terms?: string | null
          title: string
          total?: number | null
          updated_at?: string
          user_id: string
          wo_number: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          customer_signature?: string | null
          estimated_duration?: string | null
          id?: string
          items?: Json | null
          job_id?: string
          location?: string | null
          quotation_id?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          scheduled_end_date?: string | null
          scheduled_start_date?: string | null
          scope_of_work?: string
          special_instructions?: string | null
          status?: string
          technician_name?: string | null
          terms?: string | null
          title?: string
          total?: number | null
          updated_at?: string
          user_id?: string
          wo_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_plan_matrix: {
        Args: never
        Returns: {
          feature_kind: string
          feature_name: string
          feature_slug: string
          is_unlocked: boolean
          limit_value: number
          plan_name: string
          plan_slug: string
        }[]
      }
      admin_upsert_plan_feature: {
        Args: {
          p_feature_slug: string
          p_is_unlocked: boolean
          p_limit_value: number
          p_plan_slug: string
        }
        Returns: undefined
      }
      admin_upsert_pricing_plan: {
        Args: { p_patch: Json; p_plan_key: string }
        Returns: {
          badge_color: string | null
          badge_text: string | null
          created_at: string | null
          currency: string
          features: Json | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          max_customers: number | null
          max_jobs: number | null
          monthly_price: number
          name: string
          plan_key: string
          sort_order: number | null
          tagline: string | null
          updated_at: string | null
          updated_by: string | null
          yearly_discount_pct: number
          yearly_price: number
        }
        SetofOptions: {
          from: "*"
          to: "pricing_plans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cleanup_deleted_user_email: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      complete_referral_reward: {
        Args: { p_billing_period: string; p_referred_id: string }
        Returns: undefined
      }
      complete_referral_reward_old: {
        Args: { p_referred_id: string }
        Returns: undefined
      }
      create_notification: {
        Args: {
          p_body: string
          p_link: string
          p_ref_id: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      expire_subscriptions: { Args: never; Returns: undefined }
      generate_approval_token: { Args: never; Returns: string }
      generate_ticket_number: { Args: never; Returns: string }
      get_approval_by_token: {
        Args: { p_token: string }
        Returns: {
          action: string
          customer_name: string
          document_id: string
          document_type: string
          expires_at: string
          id: string
          pdf_url: string
          reason: string
          responded_at: string
          token: string
          user_id: string
        }[]
      }
      get_payment_proof_by_token: { Args: { p_token: string }; Returns: Json }
      get_public_document_summary: { Args: { p_token: string }; Returns: Json }
      increment_free_months: { Args: { row_id: string }; Returns: undefined }
      increment_free_months_by: {
        Args: { p_months: number; row_id: string }
        Returns: undefined
      }
      increment_referral_count: { Args: { row_id: string }; Returns: undefined }
      is_active_admin: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
      is_app_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      mark_approval_viewed: { Args: { p_token: string }; Returns: undefined }
      publish_announcement: { Args: { p_id: string }; Returns: number }
      respond_to_approval: {
        Args: { p_action: string; p_reason: string; p_token: string }
        Returns: undefined
      }
      set_onboarding_plan: {
        Args: { p_billing_period: string; p_plan: string }
        Returns: undefined
      }
      submit_payment_proof: {
        Args: {
          p_amount: number
          p_bank_name: string
          p_method: string
          p_notes: string
          p_payer_name: string
          p_payment_date: string
          p_receipt_url: string
          p_reference: string
          p_token: string
        }
        Returns: undefined
      }
      upload_payment_receipt_signed_url: {
        Args: { p_path: string; p_token: string }
        Returns: undefined
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
