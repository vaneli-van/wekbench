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
      catalog_items: {
        Row: {
          authorisation_ref: string | null
          brand: string | null
          created_at: string
          currency: string | null
          description: string
          external_ref: string | null
          id: string
          is_authorised: boolean
          lead_time_days: number | null
          model: string | null
          oem: string | null
          reorder_point: number | null
          reserved_qty: number
          sku: string | null
          source: Database["public"]["Enums"]["catalog_source"]
          spec: Json
          stock_qty: number | null
          supplier_id: string | null
          unit_price: number | null
          updated_at: string
          warehouse_location: string | null
          workspace_id: string
        }
        Insert: {
          authorisation_ref?: string | null
          brand?: string | null
          created_at?: string
          currency?: string | null
          description: string
          external_ref?: string | null
          id?: string
          is_authorised?: boolean
          lead_time_days?: number | null
          model?: string | null
          oem?: string | null
          reorder_point?: number | null
          reserved_qty?: number
          sku?: string | null
          source?: Database["public"]["Enums"]["catalog_source"]
          spec?: Json
          stock_qty?: number | null
          supplier_id?: string | null
          unit_price?: number | null
          updated_at?: string
          warehouse_location?: string | null
          workspace_id: string
        }
        Update: {
          authorisation_ref?: string | null
          brand?: string | null
          created_at?: string
          currency?: string | null
          description?: string
          external_ref?: string | null
          id?: string
          is_authorised?: boolean
          lead_time_days?: number | null
          model?: string | null
          oem?: string | null
          reorder_point?: number | null
          reserved_qty?: number
          sku?: string | null
          source?: Database["public"]["Enums"]["catalog_source"]
          spec?: Json
          stock_qty?: number | null
          supplier_id?: string | null
          unit_price?: number | null
          updated_at?: string
          warehouse_location?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      extracted_documents: {
        Row: {
          buyer_ref: string | null
          confidence: number | null
          created_at: string
          currency: string | null
          doc_type: Database["public"]["Enums"]["extracted_doc_type"]
          due_date: string | null
          error_message: string | null
          id: string
          inbound_email_id: string
          raw_extraction: Json
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["extracted_doc_status"]
          summary: string | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          buyer_ref?: string | null
          confidence?: number | null
          created_at?: string
          currency?: string | null
          doc_type?: Database["public"]["Enums"]["extracted_doc_type"]
          due_date?: string | null
          error_message?: string | null
          id?: string
          inbound_email_id: string
          raw_extraction?: Json
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["extracted_doc_status"]
          summary?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          buyer_ref?: string | null
          confidence?: number | null
          created_at?: string
          currency?: string | null
          doc_type?: Database["public"]["Enums"]["extracted_doc_type"]
          due_date?: string | null
          error_message?: string | null
          id?: string
          inbound_email_id?: string
          raw_extraction?: Json
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["extracted_doc_status"]
          summary?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extracted_documents_inbound_email_id_fkey"
            columns: ["inbound_email_id"]
            isOneToOne: false
            referencedRelation: "inbound_emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      extracted_line_items: {
        Row: {
          created_at: string
          document_id: string
          id: string
          line_no: number
          lookup_note: string | null
          match_confidence: number | null
          match_status: Database["public"]["Enums"]["line_match_status"]
          matched_catalog_item_id: string | null
          requested_brand: string | null
          requested_description: string
          requested_model: string | null
          requested_qty: number | null
          requested_unit: string | null
          target_price: number | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          line_no: number
          lookup_note?: string | null
          match_confidence?: number | null
          match_status?: Database["public"]["Enums"]["line_match_status"]
          matched_catalog_item_id?: string | null
          requested_brand?: string | null
          requested_description: string
          requested_model?: string | null
          requested_qty?: number | null
          requested_unit?: string | null
          target_price?: number | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          line_no?: number
          lookup_note?: string | null
          match_confidence?: number | null
          match_status?: Database["public"]["Enums"]["line_match_status"]
          matched_catalog_item_id?: string | null
          requested_brand?: string | null
          requested_description?: string
          requested_model?: string | null
          requested_qty?: number | null
          requested_unit?: string | null
          target_price?: number | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extracted_line_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "extracted_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_line_items_matched_catalog_item_id_fkey"
            columns: ["matched_catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_line_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_addresses: {
        Row: {
          active: boolean
          buyer_label: string | null
          created_at: string
          full_address: string
          id: string
          label: string | null
          local_part: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          buyer_label?: string | null
          created_at?: string
          full_address: string
          id?: string
          label?: string | null
          local_part: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          buyer_label?: string | null
          created_at?: string
          full_address?: string
          id?: string
          label?: string | null
          local_part?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbound_addresses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_emails: {
        Row: {
          attachments: Json
          created_at: string
          envelope: Json | null
          error_message: string | null
          extraction_status: string
          from_address: string
          from_name: string | null
          headers: Json | null
          html_body: string | null
          id: string
          received_at: string
          spam_score: number | null
          status: Database["public"]["Enums"]["inbound_email_status"]
          subject: string | null
          text_body: string | null
          to_address: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          attachments?: Json
          created_at?: string
          envelope?: Json | null
          error_message?: string | null
          extraction_status?: string
          from_address: string
          from_name?: string | null
          headers?: Json | null
          html_body?: string | null
          id?: string
          received_at?: string
          spam_score?: number | null
          status?: Database["public"]["Enums"]["inbound_email_status"]
          subject?: string | null
          text_body?: string | null
          to_address: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          attachments?: Json
          created_at?: string
          envelope?: Json | null
          error_message?: string | null
          extraction_status?: string
          from_address?: string
          from_name?: string | null
          headers?: Json | null
          html_body?: string | null
          id?: string
          received_at?: string
          spam_score?: number | null
          status?: Database["public"]["Enums"]["inbound_email_status"]
          subject?: string | null
          text_body?: string | null
          to_address?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbound_emails_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quote_line_items: {
        Row: {
          brand: string | null
          catalog_item_id: string | null
          created_at: string
          description: string
          extracted_line_item_id: string | null
          id: string
          line_no: number
          margin_pct: number | null
          model: string | null
          notes: string | null
          qty: number
          quote_id: string
          source: Database["public"]["Enums"]["quote_line_source"]
          unit: string | null
          unit_cost: number | null
          unit_price: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          brand?: string | null
          catalog_item_id?: string | null
          created_at?: string
          description: string
          extracted_line_item_id?: string | null
          id?: string
          line_no: number
          margin_pct?: number | null
          model?: string | null
          notes?: string | null
          qty?: number
          quote_id: string
          source?: Database["public"]["Enums"]["quote_line_source"]
          unit?: string | null
          unit_cost?: number | null
          unit_price?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          brand?: string | null
          catalog_item_id?: string | null
          created_at?: string
          description?: string
          extracted_line_item_id?: string | null
          id?: string
          line_no?: number
          margin_pct?: number | null
          model?: string | null
          notes?: string | null
          qty?: number
          quote_id?: string
          source?: Database["public"]["Enums"]["quote_line_source"]
          unit?: string | null
          unit_cost?: number | null
          unit_price?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_line_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_line_items_extracted_line_item_id_fkey"
            columns: ["extracted_line_item_id"]
            isOneToOne: false
            referencedRelation: "extracted_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_line_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_line_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          created_at: string
          currency: string | null
          delivery_location: string | null
          id: string
          incoterm: string | null
          lead_time_days: number | null
          margin_pct: number
          notes: string | null
          quote_number: string
          rfq_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number
          tax_amount: number
          tax_pct: number
          total: number
          updated_at: string
          valid_until: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          delivery_location?: string | null
          id?: string
          incoterm?: string | null
          lead_time_days?: number | null
          margin_pct?: number
          notes?: string | null
          quote_number: string
          rfq_id: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax_amount?: number
          tax_pct?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          delivery_location?: string | null
          id?: string
          incoterm?: string | null
          lead_time_days?: number | null
          margin_pct?: number
          notes?: string | null
          quote_number?: string
          rfq_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax_amount?: number
          tax_pct?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      review_notifications: {
        Row: {
          created_at: string
          document_id: string
          id: string
          kind: string
          message: string
          read_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          kind?: string
          message: string
          read_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          kind?: string
          message?: string
          read_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_notifications_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "extracted_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      rfqs: {
        Row: {
          buyer_company: string | null
          buyer_email: string | null
          buyer_name: string | null
          buyer_ref: string | null
          created_at: string
          currency: string | null
          due_date: string | null
          extracted_document_id: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["rfq_status"]
          summary: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          buyer_company?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_ref?: string | null
          created_at?: string
          currency?: string | null
          due_date?: string | null
          extracted_document_id: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["rfq_status"]
          summary?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          buyer_company?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_ref?: string | null
          created_at?: string
          currency?: string | null
          due_date?: string | null
          extracted_document_id?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["rfq_status"]
          summary?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfqs_extracted_document_id_fkey"
            columns: ["extracted_document_id"]
            isOneToOne: true
            referencedRelation: "extracted_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_contracts: {
        Row: {
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at: string
          ends_at: string | null
          file_path: string | null
          id: string
          starts_at: string | null
          supplier_id: string
          terms: Json
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          ends_at?: string | null
          file_path?: string | null
          id?: string
          starts_at?: string | null
          supplier_id: string
          terms?: Json
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          ends_at?: string | null
          file_path?: string | null
          id?: string
          starts_at?: string | null
          supplier_id?: string
          terms?: Json
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contracts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_contracts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          status: Database["public"]["Enums"]["supplier_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          account_type: string
          auto_approve_threshold: number
          country: string | null
          created_at: string
          id: string
          name: string
          onboarding_completed_at: string | null
          owner_id: string
          review_notify_email: string | null
          seeded_demo: boolean
          updated_at: string
        }
        Insert: {
          account_type?: string
          auto_approve_threshold?: number
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          onboarding_completed_at?: string | null
          owner_id: string
          review_notify_email?: string | null
          seeded_demo?: boolean
          updated_at?: string
        }
        Update: {
          account_type?: string
          auto_approve_threshold?: number
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          onboarding_completed_at?: string | null
          owner_id?: string
          review_notify_email?: string | null
          seeded_demo?: boolean
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "member"
      catalog_source: "manual" | "supplier_upload" | "external_api"
      contract_type: "master" | "sla" | "pricing" | "other"
      extracted_doc_status: "pending_review" | "approved" | "rejected"
      extracted_doc_type:
        | "rfq"
        | "purchase_order"
        | "rfq_amendment"
        | "po_amendment"
        | "unknown"
      inbound_email_status:
        | "received"
        | "processing"
        | "processed"
        | "failed"
        | "ignored"
      line_match_status: "matched" | "not_found" | "sourcing" | "manual"
      quote_line_source: "catalog" | "sourcing" | "manual"
      quote_status: "draft" | "sent" | "accepted" | "declined" | "expired"
      rfq_status: "open" | "quoted" | "won" | "lost"
      supplier_status: "active" | "inactive"
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
      app_role: ["owner", "admin", "member"],
      catalog_source: ["manual", "supplier_upload", "external_api"],
      contract_type: ["master", "sla", "pricing", "other"],
      extracted_doc_status: ["pending_review", "approved", "rejected"],
      extracted_doc_type: [
        "rfq",
        "purchase_order",
        "rfq_amendment",
        "po_amendment",
        "unknown",
      ],
      inbound_email_status: [
        "received",
        "processing",
        "processed",
        "failed",
        "ignored",
      ],
      line_match_status: ["matched", "not_found", "sourcing", "manual"],
      quote_line_source: ["catalog", "sourcing", "manual"],
      quote_status: ["draft", "sent", "accepted", "declined", "expired"],
      rfq_status: ["open", "quoted", "won", "lost"],
      supplier_status: ["active", "inactive"],
    },
  },
} as const
