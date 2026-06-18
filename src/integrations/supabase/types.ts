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
      buyer_contract_items: {
        Row: {
          agreed_price: number | null
          brand: string | null
          buyer_id: string
          contract_id: string
          created_at: string
          currency: string | null
          description: string
          id: string
          min_qty: number | null
          model: string | null
          mpn: string | null
          notes: string | null
          unit: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          agreed_price?: number | null
          brand?: string | null
          buyer_id: string
          contract_id: string
          created_at?: string
          currency?: string | null
          description: string
          id?: string
          min_qty?: number | null
          model?: string | null
          mpn?: string | null
          notes?: string | null
          unit?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          agreed_price?: number | null
          brand?: string | null
          buyer_id?: string
          contract_id?: string
          created_at?: string
          currency?: string | null
          description?: string
          id?: string
          min_qty?: number | null
          model?: string | null
          mpn?: string | null
          notes?: string | null
          unit?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_contract_items_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_contract_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "buyer_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_contract_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_contracts: {
        Row: {
          buyer_id: string
          created_at: string
          currency: string | null
          ends_at: string | null
          file_path: string | null
          id: string
          notes: string | null
          reference: string | null
          starts_at: string | null
          status: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          currency?: string | null
          ends_at?: string | null
          file_path?: string | null
          id?: string
          notes?: string | null
          reference?: string | null
          starts_at?: string | null
          status?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          currency?: string | null
          ends_at?: string | null
          file_path?: string | null
          id?: string
          notes?: string | null
          reference?: string | null
          starts_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_contracts_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_contracts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      buyers: {
        Row: {
          billing_email: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          sector: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          billing_email?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          sector?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          billing_email?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          sector?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_items: {
        Row: {
          authorisation_ref: string | null
          brand: string | null
          category: string | null
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
          unit: string | null
          unit_price: number | null
          updated_at: string
          warehouse_location: string | null
          workspace_id: string
        }
        Insert: {
          authorisation_ref?: string | null
          brand?: string | null
          category?: string | null
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
          unit?: string | null
          unit_price?: number | null
          updated_at?: string
          warehouse_location?: string | null
          workspace_id: string
        }
        Update: {
          authorisation_ref?: string | null
          brand?: string | null
          category?: string | null
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
          unit?: string | null
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
      documents: {
        Row: {
          created_at: string
          doc_type: string
          file_path: string | null
          id: string
          name: string
          notes: string | null
          order_id: string | null
          status: string
          updated_at: string
          url: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          doc_type?: string
          file_path?: string | null
          id?: string
          name: string
          notes?: string | null
          order_id?: string | null
          status?: string
          updated_at?: string
          url?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_path?: string | null
          id?: string
          name?: string
          notes?: string | null
          order_id?: string | null
          status?: string
          updated_at?: string
          url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_workspace_id_fkey"
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
          category: string | null
          created_at: string
          document_id: string
          id: string
          line_no: number
          lookup_note: string | null
          manufacturer: string | null
          match_confidence: number | null
          match_status: Database["public"]["Enums"]["line_match_status"]
          matched_catalog_item_id: string | null
          mpn: string | null
          requested_brand: string | null
          requested_description: string
          requested_model: string | null
          requested_qty: number | null
          requested_unit: string | null
          routing_status: string
          target_price: number | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          document_id: string
          id?: string
          line_no: number
          lookup_note?: string | null
          manufacturer?: string | null
          match_confidence?: number | null
          match_status?: Database["public"]["Enums"]["line_match_status"]
          matched_catalog_item_id?: string | null
          mpn?: string | null
          requested_brand?: string | null
          requested_description: string
          requested_model?: string | null
          requested_qty?: number | null
          requested_unit?: string | null
          routing_status?: string
          target_price?: number | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          document_id?: string
          id?: string
          line_no?: number
          lookup_note?: string | null
          manufacturer?: string | null
          match_confidence?: number | null
          match_status?: Database["public"]["Enums"]["line_match_status"]
          matched_catalog_item_id?: string | null
          mpn?: string | null
          requested_brand?: string | null
          requested_description?: string
          requested_model?: string | null
          requested_qty?: number | null
          requested_unit?: string | null
          routing_status?: string
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
      invoice_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          method: string | null
          note: string | null
          paid_on: string
          reference: string | null
          workspace_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          method?: string | null
          note?: string | null
          paid_on?: string
          reference?: string | null
          workspace_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: string | null
          note?: string | null
          paid_on?: string
          reference?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          amount_paid: number
          billing_email: string | null
          buyer_company: string | null
          buyer_email: string | null
          buyer_name: string | null
          created_at: string
          currency: string | null
          description: string | null
          due_date: string | null
          id: string
          invoice_number: string
          issued_at: string
          notes: string | null
          order_id: string | null
          paid_at: string | null
          quote_id: string | null
          reminder_count: number
          reminder_sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          tax_amount: number
          tax_pct: number
          terms: string | null
          total: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount?: number
          amount_paid?: number
          billing_email?: string | null
          buyer_company?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          issued_at?: string
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          quote_id?: string | null
          reminder_count?: number
          reminder_sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          tax_amount?: number
          tax_pct?: number
          terms?: string | null
          total?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          amount_paid?: number
          billing_email?: string | null
          buyer_company?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          quote_id?: string | null
          reminder_count?: number
          reminder_sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          tax_amount?: number
          tax_pct?: number
          terms?: string | null
          total?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          label: string
          note: string | null
          occurred_at: string
          order_id: string
          status: Database["public"]["Enums"]["order_status"] | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          event_type?: string
          id?: string
          label: string
          note?: string | null
          occurred_at?: string
          order_id: string
          status?: Database["public"]["Enums"]["order_status"] | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          label?: string
          note?: string | null
          occurred_at?: string
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"] | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      order_line_items: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          id: string
          line_no: number
          order_id: string
          product: string | null
          qty: number
          subtotal: number
          unit: string | null
          unit_price: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          line_no?: number
          order_id: string
          product?: string | null
          qty?: number
          subtotal?: number
          unit?: string | null
          unit_price?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          line_no?: number
          order_id?: string
          product?: string | null
          qty?: number
          subtotal?: number
          unit?: string | null
          unit_price?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_line_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_line_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_company: string | null
          buyer_email: string | null
          buyer_id: string | null
          buyer_name: string | null
          buyer_po_date: string | null
          buyer_po_ref: string | null
          carrier: string | null
          created_at: string
          currency: string | null
          description: string | null
          expected_delivery: string | null
          id: string
          notes: string | null
          order_number: string
          ordered_at: string
          po_acknowledged_at: string | null
          po_acknowledged_by: string | null
          po_doc_path: string | null
          po_signature: string | null
          po_status: string
          quote_id: string | null
          rfq_id: string | null
          share_token: string
          status: Database["public"]["Enums"]["order_status"]
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          value: number
          workspace_id: string
        }
        Insert: {
          buyer_company?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_po_date?: string | null
          buyer_po_ref?: string | null
          carrier?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_number: string
          ordered_at?: string
          po_acknowledged_at?: string | null
          po_acknowledged_by?: string | null
          po_doc_path?: string | null
          po_signature?: string | null
          po_status?: string
          quote_id?: string | null
          rfq_id?: string | null
          share_token?: string
          status?: Database["public"]["Enums"]["order_status"]
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          value?: number
          workspace_id: string
        }
        Update: {
          buyer_company?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_po_date?: string | null
          buyer_po_ref?: string | null
          carrier?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          ordered_at?: string
          po_acknowledged_at?: string | null
          po_acknowledged_by?: string | null
          po_doc_path?: string | null
          po_signature?: string | null
          po_status?: string
          quote_id?: string | null
          rfq_id?: string | null
          share_token?: string
          status?: Database["public"]["Enums"]["order_status"]
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          value?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_workspace_id_fkey"
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
      provider_offers: {
        Row: {
          buy_url: string | null
          created_at: string
          currency: string | null
          datasheet_url: string | null
          distributor_external_id: string | null
          distributor_name: string | null
          distributor_sku: string | null
          external_part_id: string | null
          fetched_at: string
          id: string
          identifier: string
          image_url: string | null
          is_authorised: boolean | null
          lead_time_days: number | null
          manufacturer: string | null
          moq: number | null
          order_multiple: number | null
          packaging: string | null
          price_breaks: Json
          provider_id: string
          stock_qty: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          buy_url?: string | null
          created_at?: string
          currency?: string | null
          datasheet_url?: string | null
          distributor_external_id?: string | null
          distributor_name?: string | null
          distributor_sku?: string | null
          external_part_id?: string | null
          fetched_at?: string
          id?: string
          identifier: string
          image_url?: string | null
          is_authorised?: boolean | null
          lead_time_days?: number | null
          manufacturer?: string | null
          moq?: number | null
          order_multiple?: number | null
          packaging?: string | null
          price_breaks?: Json
          provider_id: string
          stock_qty?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          buy_url?: string | null
          created_at?: string
          currency?: string | null
          datasheet_url?: string | null
          distributor_external_id?: string | null
          distributor_name?: string | null
          distributor_sku?: string | null
          external_part_id?: string | null
          fetched_at?: string
          id?: string
          identifier?: string
          image_url?: string | null
          is_authorised?: boolean | null
          lead_time_days?: number | null
          manufacturer?: string | null
          moq?: number | null
          order_multiple?: number | null
          packaging?: string | null
          price_breaks?: Json
          provider_id?: string
          stock_qty?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_offers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "sourcing_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_offers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          id: string
          kind: Database["public"]["Enums"]["attachment_kind"]
          mime_type: string | null
          quote_id: string
          size_bytes: number | null
          updated_at: string
          uploaded_by: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          kind?: Database["public"]["Enums"]["attachment_kind"]
          mime_type?: string | null
          quote_id: string
          size_bytes?: number | null
          updated_at?: string
          uploaded_by?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          kind?: Database["public"]["Enums"]["attachment_kind"]
          mime_type?: string | null
          quote_id?: string
          size_bytes?: number | null
          updated_at?: string
          uploaded_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_attachments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_attachments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_line_items: {
        Row: {
          brand: string | null
          catalog_item_id: string | null
          created_at: string
          description: string
          discount_pct: number
          external_part_id: string | null
          extracted_line_item_id: string | null
          fx_rate: number | null
          height_cm: number | null
          id: string
          length_cm: number | null
          line_no: number
          line_type: Database["public"]["Enums"]["quote_line_type"]
          manufacturer: string | null
          margin_pct: number | null
          model: string | null
          mpn: string | null
          notes: string | null
          price_fetched_at: string | null
          qty: number
          quote_id: string
          section: string | null
          section_order: number
          selected_offer_id: string | null
          source: Database["public"]["Enums"]["quote_line_source"]
          source_currency: string | null
          source_distributor: string | null
          source_unit_cost: number | null
          unit: string | null
          unit_cost: number | null
          unit_price: number | null
          updated_at: string
          weight_kg: number | null
          width_cm: number | null
          workspace_id: string
        }
        Insert: {
          brand?: string | null
          catalog_item_id?: string | null
          created_at?: string
          description: string
          discount_pct?: number
          external_part_id?: string | null
          extracted_line_item_id?: string | null
          fx_rate?: number | null
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          line_no: number
          line_type?: Database["public"]["Enums"]["quote_line_type"]
          manufacturer?: string | null
          margin_pct?: number | null
          model?: string | null
          mpn?: string | null
          notes?: string | null
          price_fetched_at?: string | null
          qty?: number
          quote_id: string
          section?: string | null
          section_order?: number
          selected_offer_id?: string | null
          source?: Database["public"]["Enums"]["quote_line_source"]
          source_currency?: string | null
          source_distributor?: string | null
          source_unit_cost?: number | null
          unit?: string | null
          unit_cost?: number | null
          unit_price?: number | null
          updated_at?: string
          weight_kg?: number | null
          width_cm?: number | null
          workspace_id: string
        }
        Update: {
          brand?: string | null
          catalog_item_id?: string | null
          created_at?: string
          description?: string
          discount_pct?: number
          external_part_id?: string | null
          extracted_line_item_id?: string | null
          fx_rate?: number | null
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          line_no?: number
          line_type?: Database["public"]["Enums"]["quote_line_type"]
          manufacturer?: string | null
          margin_pct?: number | null
          model?: string | null
          mpn?: string | null
          notes?: string | null
          price_fetched_at?: string | null
          qty?: number
          quote_id?: string
          section?: string | null
          section_order?: number
          selected_offer_id?: string | null
          source?: Database["public"]["Enums"]["quote_line_source"]
          source_currency?: string | null
          source_distributor?: string | null
          source_unit_cost?: number | null
          unit?: string | null
          unit_cost?: number | null
          unit_price?: number | null
          updated_at?: string
          weight_kg?: number | null
          width_cm?: number | null
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
            foreignKeyName: "quote_line_items_selected_offer_id_fkey"
            columns: ["selected_offer_id"]
            isOneToOne: false
            referencedRelation: "provider_offers"
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
      quote_shipments: {
        Row: {
          amount: number
          bookable: boolean
          carrier_logo: string | null
          carrier_name: string
          created_at: string
          currency: string
          eta_minutes: number | null
          eta_text: string | null
          fx_rate: number | null
          id: string
          includes_insurance: boolean | null
          mode: string
          provider_slug: string | null
          quote_id: string
          rate_ref: string | null
          service: string | null
          source_amount: number | null
          source_currency: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount?: number
          bookable?: boolean
          carrier_logo?: string | null
          carrier_name: string
          created_at?: string
          currency?: string
          eta_minutes?: number | null
          eta_text?: string | null
          fx_rate?: number | null
          id?: string
          includes_insurance?: boolean | null
          mode?: string
          provider_slug?: string | null
          quote_id: string
          rate_ref?: string | null
          service?: string | null
          source_amount?: number | null
          source_currency?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          bookable?: boolean
          carrier_logo?: string | null
          carrier_name?: string
          created_at?: string
          currency?: string
          eta_minutes?: number | null
          eta_text?: string | null
          fx_rate?: number | null
          id?: string
          includes_insurance?: boolean | null
          mode?: string
          provider_slug?: string | null
          quote_id?: string
          rate_ref?: string | null
          service?: string | null
          source_amount?: number | null
          source_currency?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_shipments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_shipments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          accept_signature: string | null
          accepted_at: string | null
          accepted_by: string | null
          assignee: string | null
          buyer_id: string | null
          buyer_name: string | null
          buyer_po_ref: string | null
          created_at: string
          currency: string | null
          decline_note: string | null
          declined_at: string | null
          delivery_location: string | null
          id: string
          incoterm: string | null
          install_window: string | null
          lead_time_days: number | null
          margin_pct: number
          notes: string | null
          quote_number: string
          rfq_id: string | null
          sector: string | null
          sent_at: string | null
          share_token: string | null
          site_address: string | null
          site_contact_name: string | null
          site_contact_phone: string | null
          stage: string
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number
          tax_amount: number
          tax_pct: number
          title: string | null
          total: number
          updated_at: string
          valid_until: string | null
          workspace_id: string
        }
        Insert: {
          accept_signature?: string | null
          accepted_at?: string | null
          accepted_by?: string | null
          assignee?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_po_ref?: string | null
          created_at?: string
          currency?: string | null
          decline_note?: string | null
          declined_at?: string | null
          delivery_location?: string | null
          id?: string
          incoterm?: string | null
          install_window?: string | null
          lead_time_days?: number | null
          margin_pct?: number
          notes?: string | null
          quote_number: string
          rfq_id?: string | null
          sector?: string | null
          sent_at?: string | null
          share_token?: string | null
          site_address?: string | null
          site_contact_name?: string | null
          site_contact_phone?: string | null
          stage?: string
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax_amount?: number
          tax_pct?: number
          title?: string | null
          total?: number
          updated_at?: string
          valid_until?: string | null
          workspace_id: string
        }
        Update: {
          accept_signature?: string | null
          accepted_at?: string | null
          accepted_by?: string | null
          assignee?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_po_ref?: string | null
          created_at?: string
          currency?: string | null
          decline_note?: string | null
          declined_at?: string | null
          delivery_location?: string | null
          id?: string
          incoterm?: string | null
          install_window?: string | null
          lead_time_days?: number | null
          margin_pct?: number
          notes?: string | null
          quote_number?: string
          rfq_id?: string | null
          sector?: string | null
          sent_at?: string | null
          share_token?: string | null
          site_address?: string | null
          site_contact_name?: string | null
          site_contact_phone?: string | null
          stage?: string
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax_amount?: number
          tax_pct?: number
          title?: string | null
          total?: number
          updated_at?: string
          valid_until?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
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
          buyer_id: string | null
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
          buyer_id?: string | null
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
          buyer_id?: string | null
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
            foreignKeyName: "rfqs_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
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
      shipping_providers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          mode: string
          name: string
          priority: number
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          mode?: string
          name: string
          priority?: number
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          mode?: string
          name?: string
          priority?: number
          slug?: string
        }
        Relationships: []
      }
      shipping_rate_cache: {
        Row: {
          fetched_at: string
          id: string
          provider_slug: string
          request_hash: string
          response: Json
          workspace_id: string
        }
        Insert: {
          fetched_at?: string
          id?: string
          provider_slug: string
          request_hash: string
          response?: Json
          workspace_id: string
        }
        Update: {
          fetched_at?: string
          id?: string
          provider_slug?: string
          request_hash?: string
          response?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_rate_cache_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sitc_catalogue: {
        Row: {
          brand: string | null
          category: string | null
          cost: number | null
          currency: string
          distributors: Json
          ean: string | null
          height_cm: number | null
          image_url: string | null
          length_cm: number | null
          name: string | null
          price: number | null
          short_description: string | null
          sitc_id: string
          sku: string | null
          specs: string | null
          stock: number | null
          sub_category: string | null
          unspsc: string | null
          updated_at: string
          weight_kg: number | null
          width_cm: number | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          cost?: number | null
          currency?: string
          distributors?: Json
          ean?: string | null
          height_cm?: number | null
          image_url?: string | null
          length_cm?: number | null
          name?: string | null
          price?: number | null
          short_description?: string | null
          sitc_id: string
          sku?: string | null
          specs?: string | null
          stock?: number | null
          sub_category?: string | null
          unspsc?: string | null
          updated_at?: string
          weight_kg?: number | null
          width_cm?: number | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          cost?: number | null
          currency?: string
          distributors?: Json
          ean?: string | null
          height_cm?: number | null
          image_url?: string | null
          length_cm?: number | null
          name?: string | null
          price?: number | null
          short_description?: string | null
          sitc_id?: string
          sku?: string | null
          specs?: string | null
          stock?: number | null
          sub_category?: string | null
          unspsc?: string | null
          updated_at?: string
          weight_kg?: number | null
          width_cm?: number | null
        }
        Relationships: []
      }
      sourcing_providers: {
        Row: {
          categories: string[]
          created_at: string
          id: string
          is_active: boolean
          key: string
          kind: string
          name: string
          priority: number
          updated_at: string
        }
        Insert: {
          categories?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          kind?: string
          name: string
          priority?: number
          updated_at?: string
        }
        Update: {
          categories?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          kind?: string
          name?: string
          priority?: number
          updated_at?: string
        }
        Relationships: []
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
          external_seller_id: string | null
          id: string
          is_authorised_distributor: boolean
          name: string
          notes: string | null
          provider_id: string | null
          status: Database["public"]["Enums"]["supplier_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          external_seller_id?: string | null
          id?: string
          is_authorised_distributor?: boolean
          name: string
          notes?: string | null
          provider_id?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          external_seller_id?: string | null
          id?: string
          is_authorised_distributor?: boolean
          name?: string
          notes?: string | null
          provider_id?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "sourcing_providers"
            referencedColumns: ["id"]
          },
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
      workspace_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string | null
          role: string
          status: string
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          role?: string
          status?: string
          token?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          role?: string
          status?: string
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_providers: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean
          id: string
          preferred: boolean
          provider_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          preferred?: boolean
          provider_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          preferred?: boolean
          provider_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_providers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "sourcing_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_providers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_shipping_providers: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          provider_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          provider_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          provider_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_shipping_providers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "shipping_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_shipping_providers_workspace_id_fkey"
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
          first_quote_at: string | null
          id: string
          name: string
          notify_email: string | null
          onboarding_completed_at: string | null
          owner_id: string
          plan: string
          plan_trial_ends_at: string | null
          review_notify_email: string | null
          seeded_demo: boolean
          updated_at: string
          vendor_types: Database["public"]["Enums"]["vendor_type"][]
        }
        Insert: {
          account_type?: string
          auto_approve_threshold?: number
          country?: string | null
          created_at?: string
          first_quote_at?: string | null
          id?: string
          name?: string
          notify_email?: string | null
          onboarding_completed_at?: string | null
          owner_id: string
          plan?: string
          plan_trial_ends_at?: string | null
          review_notify_email?: string | null
          seeded_demo?: boolean
          updated_at?: string
          vendor_types?: Database["public"]["Enums"]["vendor_type"][]
        }
        Update: {
          account_type?: string
          auto_approve_threshold?: number
          country?: string | null
          created_at?: string
          first_quote_at?: string | null
          id?: string
          name?: string
          notify_email?: string | null
          onboarding_completed_at?: string | null
          owner_id?: string
          plan?: string
          plan_trial_ends_at?: string | null
          review_notify_email?: string | null
          seeded_demo?: boolean
          updated_at?: string
          vendor_types?: Database["public"]["Enums"]["vendor_type"][]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_quote_public: {
        Args: { p_name: string; p_signature: string; p_token: string }
        Returns: Json
      }
      claim_workspace_invites: { Args: never; Returns: number }
      decline_quote_public: {
        Args: { p_note: string; p_token: string }
        Returns: Json
      }
      get_quote_public: { Args: { p_token: string }; Returns: Json }
      get_tracking: { Args: { p_token: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      is_workspace_admin: { Args: { ws: string }; Returns: boolean }
      is_workspace_member: { Args: { ws: string }; Returns: boolean }
      list_workspace_members: {
        Args: never
        Returns: {
          created_at: string
          email: string
          role: string
          user_id: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "owner" | "admin" | "member"
      attachment_kind: "datasheet" | "warranty" | "compliance" | "other"
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
      invoice_status:
        | "draft"
        | "sent"
        | "paid"
        | "overdue"
        | "disputed"
        | "void"
        | "partial"
      line_match_status: "matched" | "not_found" | "sourcing" | "manual"
      order_status:
        | "received"
        | "confirmed"
        | "processing"
        | "shipped"
        | "in_transit"
        | "delivered"
        | "cancelled"
      quote_line_source: "catalog" | "sourcing" | "manual"
      quote_line_type:
        | "hardware"
        | "software"
        | "service"
        | "labour"
        | "travel"
        | "training"
        | "subscription"
        | "shipping"
      quote_status: "draft" | "sent" | "accepted" | "declined" | "expired"
      rfq_status: "open" | "quoted" | "won" | "lost"
      supplier_status: "active" | "inactive"
      vendor_type: "distributor" | "system_integrator" | "vendor"
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
      attachment_kind: ["datasheet", "warranty", "compliance", "other"],
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
      invoice_status: [
        "draft",
        "sent",
        "paid",
        "overdue",
        "disputed",
        "void",
        "partial",
      ],
      line_match_status: ["matched", "not_found", "sourcing", "manual"],
      order_status: [
        "received",
        "confirmed",
        "processing",
        "shipped",
        "in_transit",
        "delivered",
        "cancelled",
      ],
      quote_line_source: ["catalog", "sourcing", "manual"],
      quote_line_type: [
        "hardware",
        "software",
        "service",
        "labour",
        "travel",
        "training",
        "subscription",
        "shipping",
      ],
      quote_status: ["draft", "sent", "accepted", "declined", "expired"],
      rfq_status: ["open", "quoted", "won", "lost"],
      supplier_status: ["active", "inactive"],
      vendor_type: ["distributor", "system_integrator", "vendor"],
    },
  },
} as const
