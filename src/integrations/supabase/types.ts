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
      accounting_entries: {
        Row: {
          banco: string | null
          cliente: string | null
          created_at: string
          data: string
          forma_de_pagamento: string | null
          id: string
          justificativa: string | null
          movimentacao: string | null
          nf: string | null
          plano_de_contas: string | null
          updated_at: string
          user_id: string
          valor_enviado: number
          valor_recebido: number
        }
        Insert: {
          banco?: string | null
          cliente?: string | null
          created_at?: string
          data: string
          forma_de_pagamento?: string | null
          id?: string
          justificativa?: string | null
          movimentacao?: string | null
          nf?: string | null
          plano_de_contas?: string | null
          updated_at?: string
          user_id: string
          valor_enviado?: number
          valor_recebido?: number
        }
        Update: {
          banco?: string | null
          cliente?: string | null
          created_at?: string
          data?: string
          forma_de_pagamento?: string | null
          id?: string
          justificativa?: string | null
          movimentacao?: string | null
          nf?: string | null
          plano_de_contas?: string | null
          updated_at?: string
          user_id?: string
          valor_enviado?: number
          valor_recebido?: number
        }
        Relationships: []
      }
      accounting_files: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_activity: {
        Row: {
          agent_key: string
          agent_name: string
          area: string
          created_at: string
          experience_level: string | null
          health_level: string | null
          health_reason: string | null
          id: string
          last_action: string | null
          last_channel: string | null
          last_duration_ms: number | null
          last_error: string | null
          last_run_at: string | null
          last_summary: string | null
          mission: string | null
          next_run_at: string | null
          persona: string | null
          specialty: string | null
          status: string
          style: string | null
          updated_at: string
        }
        Insert: {
          agent_key: string
          agent_name: string
          area?: string
          created_at?: string
          experience_level?: string | null
          health_level?: string | null
          health_reason?: string | null
          id?: string
          last_action?: string | null
          last_channel?: string | null
          last_duration_ms?: number | null
          last_error?: string | null
          last_run_at?: string | null
          last_summary?: string | null
          mission?: string | null
          next_run_at?: string | null
          persona?: string | null
          specialty?: string | null
          status?: string
          style?: string | null
          updated_at?: string
        }
        Update: {
          agent_key?: string
          agent_name?: string
          area?: string
          created_at?: string
          experience_level?: string | null
          health_level?: string | null
          health_reason?: string | null
          id?: string
          last_action?: string | null
          last_channel?: string | null
          last_duration_ms?: number | null
          last_error?: string | null
          last_run_at?: string | null
          last_summary?: string | null
          mission?: string | null
          next_run_at?: string | null
          persona?: string | null
          specialty?: string | null
          status?: string
          style?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      agent_execution_history: {
        Row: {
          action: string | null
          agent_key: string
          agent_name: string
          area: string
          channel: string | null
          created_at: string
          duration_ms: number | null
          error: string | null
          finished_at: string | null
          id: string
          started_at: string | null
          status: string
          summary: string | null
        }
        Insert: {
          action?: string | null
          agent_key: string
          agent_name: string
          area: string
          channel?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string | null
          status: string
          summary?: string | null
        }
        Update: {
          action?: string | null
          agent_key?: string
          agent_name?: string
          area?: string
          channel?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          summary?: string | null
        }
        Relationships: []
      }
      agent_reports: {
        Row: {
          agent_key: string
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          report_type: string
          title: string
        }
        Insert: {
          agent_key: string
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          report_type: string
          title: string
        }
        Update: {
          agent_key?: string
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          report_type?: string
          title?: string
        }
        Relationships: []
      }
      api_integrations: {
        Row: {
          api_key: string
          api_url: string
          created_at: string
          id: string
          integration_name: string
          is_active: boolean
          last_sync_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          api_url: string
          created_at?: string
          id?: string
          integration_name?: string
          is_active?: boolean
          last_sync_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          api_url?: string
          created_at?: string
          id?: string
          integration_name?: string
          is_active?: boolean
          last_sync_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      commission_orders: {
        Row: {
          cliente: string | null
          comissao: number
          comissao_total: number
          comissao_vendedor: number
          created_at: string
          data: string | null
          fornecedor: string | null
          id: string
          pedido: string | null
          porcentagem_vendedor: number
          produto: string | null
          salesperson_id: string
          venda: number
        }
        Insert: {
          cliente?: string | null
          comissao?: number
          comissao_total?: number
          comissao_vendedor?: number
          created_at?: string
          data?: string | null
          fornecedor?: string | null
          id?: string
          pedido?: string | null
          porcentagem_vendedor?: number
          produto?: string | null
          salesperson_id: string
          venda?: number
        }
        Update: {
          cliente?: string | null
          comissao?: number
          comissao_total?: number
          comissao_vendedor?: number
          created_at?: string
          data?: string | null
          fornecedor?: string | null
          id?: string
          pedido?: string | null
          porcentagem_vendedor?: number
          produto?: string | null
          salesperson_id?: string
          venda?: number
        }
        Relationships: [
          {
            foreignKeyName: "commission_orders_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "commission_salespeople"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_payments: {
        Row: {
          created_at: string
          id: string
          paid: boolean
          paid_at: string | null
          period_month: number
          period_year: number
          receipt_url: string | null
          salesperson_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          paid?: boolean
          paid_at?: string | null
          period_month: number
          period_year: number
          receipt_url?: string | null
          salesperson_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          paid?: boolean
          paid_at?: string | null
          period_month?: number
          period_year?: number
          receipt_url?: string | null
          salesperson_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      commission_reports: {
        Row: {
          created_at: string
          id: string
          period_month: number
          period_year: number
          total_comissao: number
          total_negocios: number
          total_vendas: number
          user_id: string | null
          vendedores_ativos: number
        }
        Insert: {
          created_at?: string
          id?: string
          period_month: number
          period_year: number
          total_comissao?: number
          total_negocios?: number
          total_vendas?: number
          user_id?: string | null
          vendedores_ativos?: number
        }
        Update: {
          created_at?: string
          id?: string
          period_month?: number
          period_year?: number
          total_comissao?: number
          total_negocios?: number
          total_vendas?: number
          user_id?: string | null
          vendedores_ativos?: number
        }
        Relationships: []
      }
      commission_salespeople: {
        Row: {
          created_at: string
          id: string
          name: string
          report_id: string
          total_comissao: number
          total_negocios: number
          total_vendas: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          report_id: string
          total_comissao?: number
          total_negocios?: number
          total_vendas?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          report_id?: string
          total_comissao?: number
          total_negocios?: number
          total_vendas?: number
        }
        Relationships: [
          {
            foreignKeyName: "commission_salespeople_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "commission_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          created_at: string
          email: string | null
          estimated_value: number | null
          follow_up_date: string | null
          id: string
          name: string
          notes: string | null
          notion_created_at: string | null
          phone: string | null
          position: number
          product: string | null
          salesperson_name: string | null
          stage: Database["public"]["Enums"]["crm_stage"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          estimated_value?: number | null
          follow_up_date?: string | null
          id?: string
          name: string
          notes?: string | null
          notion_created_at?: string | null
          phone?: string | null
          position?: number
          product?: string | null
          salesperson_name?: string | null
          stage?: Database["public"]["Enums"]["crm_stage"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          estimated_value?: number | null
          follow_up_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          notion_created_at?: string | null
          phone?: string | null
          position?: number
          product?: string | null
          salesperson_name?: string | null
          stage?: Database["public"]["Enums"]["crm_stage"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      growth_metrics: {
        Row: {
          created_at: string | null
          id: string
          month: number
          revenue: number
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          month: number
          revenue?: number
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          month?: number
          revenue?: number
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      marketing_costs: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          google_ads: number
          id: string
          imposto: number
          leads: number
          meta_ads: number
          other_marketing: number
          period_month: number
          period_year: number
          software: number
          telefonia: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          google_ads?: number
          id?: string
          imposto?: number
          leads?: number
          meta_ads?: number
          other_marketing?: number
          period_month: number
          period_year: number
          software?: number
          telefonia?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          google_ads?: number
          id?: string
          imposto?: number
          leads?: number
          meta_ads?: number
          other_marketing?: number
          period_month?: number
          period_year?: number
          software?: number
          telefonia?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      marketing_costs_audit: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          operation: string
          record_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          operation: string
          record_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          operation?: string
          record_id?: string
        }
        Relationships: []
      }
      marketing_daily_stats: {
        Row: {
          cpl_real_meta: number
          created_at: string
          date: string
          forms_data: Json | null
          google_campaigns: Json | null
          google_clicks: number
          google_conversions: number
          google_cpl: number
          google_spend: number
          id: string
          leads_by_campaign: Json | null
          leads_by_content: Json | null
          leads_by_medium: Json | null
          leads_by_term: Json | null
          leads_google: number
          leads_meta: number
          leads_organic: number
          leads_total: number
          meta_campaigns: Json | null
          meta_clicks: number
          meta_conversions: number
          meta_cpl: number
          meta_ctr: number
          meta_frequency: number | null
          meta_impressions: number
          meta_landing_page_views: number | null
          meta_reach: number | null
          meta_spend: number
          monthly_budget: number | null
          top_creatives: Json | null
          updated_at: string
        }
        Insert: {
          cpl_real_meta?: number
          created_at?: string
          date: string
          forms_data?: Json | null
          google_campaigns?: Json | null
          google_clicks?: number
          google_conversions?: number
          google_cpl?: number
          google_spend?: number
          id?: string
          leads_by_campaign?: Json | null
          leads_by_content?: Json | null
          leads_by_medium?: Json | null
          leads_by_term?: Json | null
          leads_google?: number
          leads_meta?: number
          leads_organic?: number
          leads_total?: number
          meta_campaigns?: Json | null
          meta_clicks?: number
          meta_conversions?: number
          meta_cpl?: number
          meta_ctr?: number
          meta_frequency?: number | null
          meta_impressions?: number
          meta_landing_page_views?: number | null
          meta_reach?: number | null
          meta_spend?: number
          monthly_budget?: number | null
          top_creatives?: Json | null
          updated_at?: string
        }
        Update: {
          cpl_real_meta?: number
          created_at?: string
          date?: string
          forms_data?: Json | null
          google_campaigns?: Json | null
          google_clicks?: number
          google_conversions?: number
          google_cpl?: number
          google_spend?: number
          id?: string
          leads_by_campaign?: Json | null
          leads_by_content?: Json | null
          leads_by_medium?: Json | null
          leads_by_term?: Json | null
          leads_google?: number
          leads_meta?: number
          leads_organic?: number
          leads_total?: number
          meta_campaigns?: Json | null
          meta_clicks?: number
          meta_conversions?: number
          meta_cpl?: number
          meta_ctr?: number
          meta_frequency?: number | null
          meta_impressions?: number
          meta_landing_page_views?: number | null
          meta_reach?: number | null
          meta_spend?: number
          monthly_budget?: number | null
          top_creatives?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      marketing_files: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      nfse_history: {
        Row: {
          aliquota: number
          ambiente: string
          codigo_servico: string
          codigo_verificacao: string | null
          created_at: string
          data_emissao: string
          discriminacao: string
          id: string
          numero_nfse: string | null
          rps_numero: string
          rps_serie: string
          status: string
          tomador_cpf_cnpj: string
          tomador_email: string | null
          tomador_razao_social: string
          updated_at: string
          user_id: string
          valor_servico: number
        }
        Insert: {
          aliquota?: number
          ambiente?: string
          codigo_servico: string
          codigo_verificacao?: string | null
          created_at?: string
          data_emissao: string
          discriminacao: string
          id?: string
          numero_nfse?: string | null
          rps_numero: string
          rps_serie: string
          status?: string
          tomador_cpf_cnpj: string
          tomador_email?: string | null
          tomador_razao_social: string
          updated_at?: string
          user_id: string
          valor_servico?: number
        }
        Update: {
          aliquota?: number
          ambiente?: string
          codigo_servico?: string
          codigo_verificacao?: string | null
          created_at?: string
          data_emissao?: string
          discriminacao?: string
          id?: string
          numero_nfse?: string | null
          rps_numero?: string
          rps_serie?: string
          status?: string
          tomador_cpf_cnpj?: string
          tomador_email?: string | null
          tomador_razao_social?: string
          updated_at?: string
          user_id?: string
          valor_servico?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          cliente: string | null
          comissao: number
          comissao_guia: number
          comissao_total: number
          comissao_vendedor: number
          created_at: string
          data: string
          email_cliente: string | null
          enviado: boolean
          fornecedor: string | null
          guia: string | null
          id: string
          pedido: string | null
          porcentagem_vendedor: number
          produto: string | null
          sheet_row_index: number | null
          status: string | null
          updated_at: string
          user_id: string
          venda: number
          vendedor: string
        }
        Insert: {
          cliente?: string | null
          comissao?: number
          comissao_guia?: number
          comissao_total?: number
          comissao_vendedor?: number
          created_at?: string
          data: string
          email_cliente?: string | null
          enviado?: boolean
          fornecedor?: string | null
          guia?: string | null
          id?: string
          pedido?: string | null
          porcentagem_vendedor?: number
          produto?: string | null
          sheet_row_index?: number | null
          status?: string | null
          updated_at?: string
          user_id: string
          venda?: number
          vendedor: string
        }
        Update: {
          cliente?: string | null
          comissao?: number
          comissao_guia?: number
          comissao_total?: number
          comissao_vendedor?: number
          created_at?: string
          data?: string
          email_cliente?: string | null
          enviado?: boolean
          fornecedor?: string | null
          guia?: string | null
          id?: string
          pedido?: string | null
          porcentagem_vendedor?: number
          produto?: string | null
          sheet_row_index?: number | null
          status?: string | null
          updated_at?: string
          user_id?: string
          venda?: number
          vendedor?: string
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
      sales_goals: {
        Row: {
          created_at: string
          goal_comissao: number
          goal_negocios: number
          goal_resultado: number
          goal_vendas: number
          id: string
          period_month: number
          period_year: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          goal_comissao?: number
          goal_negocios?: number
          goal_resultado?: number
          goal_vendas?: number
          id?: string
          period_month: number
          period_year: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          goal_comissao?: number
          goal_negocios?: number
          goal_resultado?: number
          goal_vendas?: number
          id?: string
          period_month?: number
          period_year?: number
          user_id?: string | null
        }
        Relationships: []
      }
      salesperson_discounts: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          period_month: number
          period_year: number
          salesperson_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          period_month: number
          period_year: number
          salesperson_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          period_month?: number
          period_year?: number
          salesperson_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      salesperson_goals: {
        Row: {
          created_at: string
          goal_vendas: number
          id: string
          period_month: number
          period_year: number
          salesperson_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_vendas?: number
          id?: string
          period_month: number
          period_year: number
          salesperson_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal_vendas?: number
          id?: string
          period_month?: number
          period_year?: number
          salesperson_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      salesperson_salaries: {
        Row: {
          created_at: string
          id: string
          salary: number
          salesperson_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          salary?: number
          salesperson_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          salary?: number
          salesperson_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          salesperson_name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          salesperson_name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          salesperson_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_sheet_settings: {
        Row: {
          created_at: string
          id: string
          sheet_url: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sheet_url: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sheet_url?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_status: {
        Row: {
          chats_by_agent: Json | null
          chats_by_stage: Json | null
          chats_by_tag: Json | null
          chats_sem_vendedor: number | null
          date: string
          id: string
          total_chats: number | null
          updated_at: string | null
        }
        Insert: {
          chats_by_agent?: Json | null
          chats_by_stage?: Json | null
          chats_by_tag?: Json | null
          chats_sem_vendedor?: number | null
          date: string
          id?: string
          total_chats?: number | null
          updated_at?: string | null
        }
        Update: {
          chats_by_agent?: Json | null
          chats_by_stage?: Json | null
          chats_by_tag?: Json | null
          chats_sem_vendedor?: number | null
          date?: string
          id?: string
          total_chats?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_first_manager: { Args: { _user_id: string }; Returns: boolean }
      find_user_by_email: { Args: { _email: string }; Returns: string }
      get_salesperson_name: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      link_marketing: { Args: { _target_user_id: string }; Returns: boolean }
      link_salesperson: {
        Args: { _salesperson_name: string; _target_user_id: string }
        Returns: boolean
      }
      normalize_date_to_iso: { Args: { date_str: string }; Returns: string }
    }
    Enums: {
      app_role: "manager" | "salesperson" | "marketing"
      crm_stage:
        | "novo_lead"
        | "coletando_informacao"
        | "proposta_enviada"
        | "venda_concluida"
        | "venda_perdida"
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
      app_role: ["manager", "salesperson", "marketing"],
      crm_stage: [
        "novo_lead",
        "coletando_informacao",
        "proposta_enviada",
        "venda_concluida",
        "venda_perdida",
      ],
    },
  },
} as const
