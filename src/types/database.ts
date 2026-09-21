/**
 * Supabase database types — GENERATED FILE, do not edit by hand.
 *
 * Regenerate with:
 *   npx supabase gen types typescript --project-id kbzyzyfusnysrpgoabku
 *
 * Regenerate this file whenever the database schema changes.
 */

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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      delivery_note_lines: {
        Row: {
          arrival_photo_path: string | null
          arrived_qty: number | null
          created_at: string
          delivery_note_id: string
          discrepancy_code:
            | Database["public"]["Enums"]["dn_discrepancy_reason"]
            | null
          discrepancy_reason: string | null
          id: string
          item_description: string
          item_id: string
          item_number: string
          line_no: number
          missing_qty: number | null
          notes: string | null
          pdf_qty: number
          received_at: string | null
          received_by: string | null
          status: Database["public"]["Enums"]["dn_status"]
          uom: string
        }
        Insert: {
          arrival_photo_path?: string | null
          arrived_qty?: number | null
          created_at?: string
          delivery_note_id: string
          discrepancy_code?:
            | Database["public"]["Enums"]["dn_discrepancy_reason"]
            | null
          discrepancy_reason?: string | null
          id?: string
          item_description: string
          item_id: string
          item_number: string
          line_no?: number
          missing_qty?: number | null
          notes?: string | null
          pdf_qty: number
          received_at?: string | null
          received_by?: string | null
          status?: Database["public"]["Enums"]["dn_status"]
          uom: string
        }
        Update: {
          arrival_photo_path?: string | null
          arrived_qty?: number | null
          created_at?: string
          delivery_note_id?: string
          discrepancy_code?:
            | Database["public"]["Enums"]["dn_discrepancy_reason"]
            | null
          discrepancy_reason?: string | null
          id?: string
          item_description?: string
          item_id?: string
          item_number?: string
          line_no?: number
          missing_qty?: number | null
          notes?: string | null
          pdf_qty?: number
          received_at?: string | null
          received_by?: string | null
          status?: Database["public"]["Enums"]["dn_status"]
          uom?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_note_lines_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_note_lines_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_dashboard"
            referencedColumns: ["delivery_note_id"]
          },
          {
            foreignKeyName: "delivery_note_lines_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "v_reissue_register"
            referencedColumns: ["delivery_note_id"]
          },
          {
            foreignKeyName: "delivery_note_lines_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "v_reissue_register"
            referencedColumns: ["replaced_dn_id"]
          },
          {
            foreignKeyName: "delivery_note_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_note_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_item_stock"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "delivery_note_lines_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "user_tbl"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_notes: {
        Row: {
          acknowledged_at: string | null
          arrived_at: string | null
          assigned_driver_id: string | null
          assigned_to: string | null
          created_at: string
          created_by: string | null
          customer_name: string | null
          customer_number: string | null
          dn_number: string
          driver_sent_at: string | null
          driver_sent_by: string | null
          extraction_confidence: number | null
          extraction_method:
            | Database["public"]["Enums"]["extraction_method"]
            | null
          holder_id: string | null
          holder_role: Database["public"]["Enums"]["user_role"] | null
          holder_since: string | null
          id: string
          needs_review_fields: string[]
          notes: string | null
          order_date: string | null
          pdf_file_name: string | null
          pdf_sha256: string | null
          pdf_storage_path: string | null
          print_date: string | null
          reissue_note: string | null
          reissue_reason:
            | Database["public"]["Enums"]["dn_reissue_reason"]
            | null
          replaces_dn_id: string | null
          salesman: string | null
          sent_at: string | null
          sent_by: string | null
          ship_from: string | null
          ship_to: string | null
          shipping_reference: string | null
          so_number: string
          so_override_at: string | null
          so_override_by: string | null
          so_override_reason: string | null
          source_file_type: string | null
          stamped_pdf_path: string | null
          status: Database["public"]["Enums"]["dn_status"]
          supplier_id: string
          updated_at: string
          upload_batch_id: string | null
          workflow_status: Database["public"]["Enums"]["dn_workflow_status"]
        }
        Insert: {
          acknowledged_at?: string | null
          arrived_at?: string | null
          assigned_driver_id?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          customer_number?: string | null
          dn_number: string
          driver_sent_at?: string | null
          driver_sent_by?: string | null
          extraction_confidence?: number | null
          extraction_method?:
            | Database["public"]["Enums"]["extraction_method"]
            | null
          holder_id?: string | null
          holder_role?: Database["public"]["Enums"]["user_role"] | null
          holder_since?: string | null
          id?: string
          needs_review_fields?: string[]
          notes?: string | null
          order_date?: string | null
          pdf_file_name?: string | null
          pdf_sha256?: string | null
          pdf_storage_path?: string | null
          print_date?: string | null
          reissue_note?: string | null
          reissue_reason?:
            | Database["public"]["Enums"]["dn_reissue_reason"]
            | null
          replaces_dn_id?: string | null
          salesman?: string | null
          sent_at?: string | null
          sent_by?: string | null
          ship_from?: string | null
          ship_to?: string | null
          shipping_reference?: string | null
          so_number: string
          so_override_at?: string | null
          so_override_by?: string | null
          so_override_reason?: string | null
          source_file_type?: string | null
          stamped_pdf_path?: string | null
          status?: Database["public"]["Enums"]["dn_status"]
          supplier_id: string
          updated_at?: string
          upload_batch_id?: string | null
          workflow_status?: Database["public"]["Enums"]["dn_workflow_status"]
        }
        Update: {
          acknowledged_at?: string | null
          arrived_at?: string | null
          assigned_driver_id?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          customer_number?: string | null
          dn_number?: string
          driver_sent_at?: string | null
          driver_sent_by?: string | null
          extraction_confidence?: number | null
          extraction_method?:
            | Database["public"]["Enums"]["extraction_method"]
            | null
          holder_id?: string | null
          holder_role?: Database["public"]["Enums"]["user_role"] | null
          holder_since?: string | null
          id?: string
          needs_review_fields?: string[]
          notes?: string | null
          order_date?: string | null
          pdf_file_name?: string | null
          pdf_sha256?: string | null
          pdf_storage_path?: string | null
          print_date?: string | null
          reissue_note?: string | null
          reissue_reason?:
            | Database["public"]["Enums"]["dn_reissue_reason"]
            | null
          replaces_dn_id?: string | null
          salesman?: string | null
          sent_at?: string | null
          sent_by?: string | null
          ship_from?: string | null
          ship_to?: string | null
          shipping_reference?: string | null
          so_number?: string
          so_override_at?: string | null
          so_override_by?: string | null
          so_override_reason?: string | null
          source_file_type?: string | null
          stamped_pdf_path?: string | null
          status?: Database["public"]["Enums"]["dn_status"]
          supplier_id?: string
          updated_at?: string
          upload_batch_id?: string | null
          workflow_status?: Database["public"]["Enums"]["dn_workflow_status"]
        }
        Relationships: [
          {
            foreignKeyName: "delivery_notes_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "user_tbl"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_tbl"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_tbl"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_driver_sent_by_fkey"
            columns: ["driver_sent_by"]
            isOneToOne: false
            referencedRelation: "user_tbl"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "user_tbl"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_replaces_dn_id_fkey"
            columns: ["replaces_dn_id"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_replaces_dn_id_fkey"
            columns: ["replaces_dn_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_dashboard"
            referencedColumns: ["delivery_note_id"]
          },
          {
            foreignKeyName: "delivery_notes_replaces_dn_id_fkey"
            columns: ["replaces_dn_id"]
            isOneToOne: false
            referencedRelation: "v_reissue_register"
            referencedColumns: ["delivery_note_id"]
          },
          {
            foreignKeyName: "delivery_notes_replaces_dn_id_fkey"
            columns: ["replaces_dn_id"]
            isOneToOne: false
            referencedRelation: "v_reissue_register"
            referencedColumns: ["replaced_dn_id"]
          },
          {
            foreignKeyName: "delivery_notes_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "user_tbl"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_so_override_by_fkey"
            columns: ["so_override_by"]
            isOneToOne: false
            referencedRelation: "user_tbl"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_upload_batch_id_fkey"
            columns: ["upload_batch_id"]
            isOneToOne: false
            referencedRelation: "upload_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      dn_reissue_submissions: {
        Row: {
          created_dn_id: string | null
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          dn_number: string | null
          file_path: string | null
          file_type: string
          id: string
          note: string | null
          original_dn_id: string
          reason: Database["public"]["Enums"]["dn_reissue_reason"]
          so_number: string | null
          status: string
          submitted_at: string
          submitted_by: string
        }
        Insert: {
          created_dn_id?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          dn_number?: string | null
          file_path?: string | null
          file_type?: string
          id?: string
          note?: string | null
          original_dn_id: string
          reason: Database["public"]["Enums"]["dn_reissue_reason"]
          so_number?: string | null
          status?: string
          submitted_at?: string
          submitted_by: string
        }
        Update: {
          created_dn_id?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          dn_number?: string | null
          file_path?: string | null
          file_type?: string
          id?: string
          note?: string | null
          original_dn_id?: string
          reason?: Database["public"]["Enums"]["dn_reissue_reason"]
          so_number?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "dn_reissue_submissions_created_dn_id_fkey"
            columns: ["created_dn_id"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dn_reissue_submissions_created_dn_id_fkey"
            columns: ["created_dn_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_dashboard"
            referencedColumns: ["delivery_note_id"]
          },
          {
            foreignKeyName: "dn_reissue_submissions_created_dn_id_fkey"
            columns: ["created_dn_id"]
            isOneToOne: false
            referencedRelation: "v_reissue_register"
            referencedColumns: ["delivery_note_id"]
          },
          {
            foreignKeyName: "dn_reissue_submissions_created_dn_id_fkey"
            columns: ["created_dn_id"]
            isOneToOne: false
            referencedRelation: "v_reissue_register"
            referencedColumns: ["replaced_dn_id"]
          },
          {
            foreignKeyName: "dn_reissue_submissions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "user_tbl"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dn_reissue_submissions_original_dn_id_fkey"
            columns: ["original_dn_id"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dn_reissue_submissions_original_dn_id_fkey"
            columns: ["original_dn_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_dashboard"
            referencedColumns: ["delivery_note_id"]
          },
          {
            foreignKeyName: "dn_reissue_submissions_original_dn_id_fkey"
            columns: ["original_dn_id"]
            isOneToOne: false
            referencedRelation: "v_reissue_register"
            referencedColumns: ["delivery_note_id"]
          },
          {
            foreignKeyName: "dn_reissue_submissions_original_dn_id_fkey"
            columns: ["original_dn_id"]
            isOneToOne: false
            referencedRelation: "v_reissue_register"
            referencedColumns: ["replaced_dn_id"]
          },
          {
            foreignKeyName: "dn_reissue_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "user_tbl"
            referencedColumns: ["id"]
          },
        ]
      }
      dn_workflow_log: {
        Row: {
          action: string
          actor: string | null
          assigned_to: string | null
          created_at: string
          delivery_note_id: string
          from_status: Database["public"]["Enums"]["dn_workflow_status"] | null
          holder_from: string | null
          id: string
          note: string | null
          to_role: Database["public"]["Enums"]["user_role"] | null
          to_status: Database["public"]["Enums"]["dn_workflow_status"]
        }
        Insert: {
          action: string
          actor?: string | null
          assigned_to?: string | null
          created_at?: string
          delivery_note_id: string
          from_status?: Database["public"]["Enums"]["dn_workflow_status"] | null
          holder_from?: string | null
          id?: string
          note?: string | null
          to_role?: Database["public"]["Enums"]["user_role"] | null
          to_status: Database["public"]["Enums"]["dn_workflow_status"]
        }
        Update: {
          action?: string
          actor?: string | null
          assigned_to?: string | null
          created_at?: string
          delivery_note_id?: string
          from_status?: Database["public"]["Enums"]["dn_workflow_status"] | null
          holder_from?: string | null
          id?: string
          note?: string | null
          to_role?: Database["public"]["Enums"]["user_role"] | null
          to_status?: Database["public"]["Enums"]["dn_workflow_status"]
        }
        Relationships: [
          {
            foreignKeyName: "dn_workflow_log_actor_fkey"
            columns: ["actor"]
            isOneToOne: false
            referencedRelation: "user_tbl"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dn_workflow_log_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_tbl"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dn_workflow_log_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dn_workflow_log_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_dashboard"
            referencedColumns: ["delivery_note_id"]
          },
          {
            foreignKeyName: "dn_workflow_log_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "v_reissue_register"
            referencedColumns: ["delivery_note_id"]
          },
          {
            foreignKeyName: "dn_workflow_log_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "v_reissue_register"
            referencedColumns: ["replaced_dn_id"]
          },
          {
            foreignKeyName: "dn_workflow_log_holder_from_fkey"
            columns: ["holder_from"]
            isOneToOne: false
            referencedRelation: "user_tbl"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          created_at: string
          description_ar: string | null
          description_en: string
          id: string
          is_active: boolean
          is_auto_added: boolean
          item_number: string
          unit_weight_kg: number | null
          uom: string
        }
        Insert: {
          created_at?: string
          description_ar?: string | null
          description_en: string
          id?: string
          is_active?: boolean
          is_auto_added?: boolean
          item_number: string
          unit_weight_kg?: number | null
          uom: string
        }
        Update: {
          created_at?: string
          description_ar?: string | null
          description_en?: string
          id?: string
          is_active?: boolean
          is_auto_added?: boolean
          item_number?: string
          unit_weight_kg?: number | null
          uom?: string
        }
        Relationships: []
      }
      slip_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          delivery_note_id: string | null
          fulfilled_dn_id: string | null
          id: string
          message: string | null
          request_type: Database["public"]["Enums"]["slip_request_type"]
          requested_by: string
          requested_by_role: Database["public"]["Enums"]["user_role"]
          status: string
          target: Database["public"]["Enums"]["slip_request_target"]
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          delivery_note_id?: string | null
          fulfilled_dn_id?: string | null
          id?: string
          message?: string | null
          request_type: Database["public"]["Enums"]["slip_request_type"]
          requested_by: string
          requested_by_role: Database["public"]["Enums"]["user_role"]
          status?: string
          target: Database["public"]["Enums"]["slip_request_target"]
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          delivery_note_id?: string | null
          fulfilled_dn_id?: string | null
          id?: string
          message?: string | null
          request_type?: Database["public"]["Enums"]["slip_request_type"]
          requested_by?: string
          requested_by_role?: Database["public"]["Enums"]["user_role"]
          status?: string
          target?: Database["public"]["Enums"]["slip_request_target"]
        }
        Relationships: [
          {
            foreignKeyName: "slip_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "user_tbl"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slip_requests_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slip_requests_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_dashboard"
            referencedColumns: ["delivery_note_id"]
          },
          {
            foreignKeyName: "slip_requests_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "v_reissue_register"
            referencedColumns: ["delivery_note_id"]
          },
          {
            foreignKeyName: "slip_requests_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "v_reissue_register"
            referencedColumns: ["replaced_dn_id"]
          },
          {
            foreignKeyName: "slip_requests_fulfilled_dn_id_fkey"
            columns: ["fulfilled_dn_id"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slip_requests_fulfilled_dn_id_fkey"
            columns: ["fulfilled_dn_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_dashboard"
            referencedColumns: ["delivery_note_id"]
          },
          {
            foreignKeyName: "slip_requests_fulfilled_dn_id_fkey"
            columns: ["fulfilled_dn_id"]
            isOneToOne: false
            referencedRelation: "v_reissue_register"
            referencedColumns: ["delivery_note_id"]
          },
          {
            foreignKeyName: "slip_requests_fulfilled_dn_id_fkey"
            columns: ["fulfilled_dn_id"]
            isOneToOne: false
            referencedRelation: "v_reissue_register"
            referencedColumns: ["replaced_dn_id"]
          },
          {
            foreignKeyName: "slip_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "user_tbl"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          delivery_note_line_id: string | null
          direction: Database["public"]["Enums"]["movement_direction"]
          id: string
          item_id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes: string | null
          occurred_at: string
          qty: number
          reference_no: string | null
          reversal_of: string | null
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delivery_note_line_id?: string | null
          direction: Database["public"]["Enums"]["movement_direction"]
          id?: string
          item_id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          occurred_at?: string
          qty: number
          reference_no?: string | null
          reversal_of?: string | null
          warehouse_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delivery_note_line_id?: string | null
          direction?: Database["public"]["Enums"]["movement_direction"]
          id?: string
          item_id?: string
          movement_type?: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          occurred_at?: string
          qty?: number
          reference_no?: string | null
          reversal_of?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_tbl"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_delivery_note_line_id_fkey"
            columns: ["delivery_note_line_id"]
            isOneToOne: false
            referencedRelation: "delivery_note_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_delivery_note_line_id_fkey"
            columns: ["delivery_note_line_id"]
            isOneToOne: false
            referencedRelation: "v_lot_balances"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_item_stock"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "stock_movements_reversal_of_fkey"
            columns: ["reversal_of"]
            isOneToOne: false
            referencedRelation: "stock_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "v_item_stock"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          code: string
          cr_number: string | null
          created_at: string
          id: string
          is_active: boolean
          name_ar: string | null
          name_en: string
          phone: string | null
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          code: string
          cr_number?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en: string
          phone?: string | null
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          code?: string
          cr_number?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string
          phone?: string | null
          vat_number?: string | null
        }
        Relationships: []
      }
      upload_batches: {
        Row: {
          batch_date: string
          created_at: string
          created_by: string | null
          id: string
          note: string | null
        }
        Insert: {
          batch_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
        }
        Update: {
          batch_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upload_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_tbl"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tbl: {
        Row: {
          account_created_at: string
          email: string | null
          first_name: string | null
          id: string
          is_active: boolean
          is_admin: boolean
          is_driver: boolean
          is_gm: boolean
          is_superadmin: boolean
          is_warehouse: boolean
          last_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          account_created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          is_active?: boolean
          is_admin?: boolean
          is_driver?: boolean
          is_gm?: boolean
          is_superadmin?: boolean
          is_warehouse?: boolean
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          account_created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean
          is_admin?: boolean
          is_driver?: boolean
          is_gm?: boolean
          is_superadmin?: boolean
          is_warehouse?: boolean
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_ar: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_ar?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_inventory_dashboard: {
        Row: {
          "Arrived Qty": number | null
          Balance: number | null
          delivery_note_id: string | null
          Discrepancy:
            | Database["public"]["Enums"]["dn_discrepancy_reason"]
            | null
          "DN No": string | null
          "In Qty": number | null
          Item: string | null
          item_number: string | null
          "Missing Qty": number | null
          "Out Qty": number | null
          "PDF Qty": number | null
          print_date: string | null
          received_at: string | null
          "SO No": string | null
          Status: Database["public"]["Enums"]["dn_status"] | null
          supplier: string | null
          UOM: string | null
        }
        Relationships: []
      }
      v_item_stock: {
        Row: {
          available_qty: number | null
          description_en: string | null
          in_qty: number | null
          item_id: string | null
          item_number: string | null
          out_qty: number | null
          uom: string | null
          warehouse_code: string | null
          warehouse_id: string | null
        }
        Relationships: []
      }
      v_lot_balances: {
        Row: {
          arrived_qty: number | null
          balance_qty: number | null
          delivery_note_id: string | null
          discrepancy_code:
            | Database["public"]["Enums"]["dn_discrepancy_reason"]
            | null
          in_qty: number | null
          item_description: string | null
          item_id: string | null
          item_number: string | null
          lot_id: string | null
          missing_qty: number | null
          out_qty: number | null
          pdf_qty: number | null
          received_at: string | null
          status: Database["public"]["Enums"]["dn_status"] | null
          uom: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_note_lines_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_note_lines_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_dashboard"
            referencedColumns: ["delivery_note_id"]
          },
          {
            foreignKeyName: "delivery_note_lines_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "v_reissue_register"
            referencedColumns: ["delivery_note_id"]
          },
          {
            foreignKeyName: "delivery_note_lines_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "v_reissue_register"
            referencedColumns: ["replaced_dn_id"]
          },
          {
            foreignKeyName: "delivery_note_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_note_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_item_stock"
            referencedColumns: ["item_id"]
          },
        ]
      }
      v_reissue_register: {
        Row: {
          delivery_note_id: string | null
          Item: string | null
          "New DN": string | null
          "New slip status":
            | Database["public"]["Enums"]["dn_workflow_status"]
            | null
          "New SO": string | null
          Qty: number | null
          Reason: Database["public"]["Enums"]["dn_reissue_reason"] | null
          Recorded: string | null
          "Recorded by": string | null
          Remarks: string | null
          "Replaced DN": string | null
          "Replaced slip arrival status":
            | Database["public"]["Enums"]["dn_status"]
            | null
          "Replaced SO": string | null
          replaced_dn_id: string | null
          Reported: string | null
          "Reported by": string | null
          UOM: string | null
        }
        Relationships: []
      }
      v_slip_custody: {
        Row: {
          action: string | null
          actor_id: string | null
          actor_name: string | null
          actor_role: Database["public"]["Enums"]["user_role"] | null
          created_at: string | null
          delivery_note_id: string | null
          dn_number: string | null
          from_id: string | null
          from_name: string | null
          from_role: Database["public"]["Enums"]["user_role"] | null
          from_status: Database["public"]["Enums"]["dn_workflow_status"] | null
          id: string | null
          note: string | null
          so_number: string | null
          to_id: string | null
          to_name: string | null
          to_role: Database["public"]["Enums"]["user_role"] | null
          to_status: Database["public"]["Enums"]["dn_workflow_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "dn_workflow_log_actor_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_tbl"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dn_workflow_log_assigned_to_fkey"
            columns: ["to_id"]
            isOneToOne: false
            referencedRelation: "user_tbl"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dn_workflow_log_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dn_workflow_log_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_dashboard"
            referencedColumns: ["delivery_note_id"]
          },
          {
            foreignKeyName: "dn_workflow_log_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "v_reissue_register"
            referencedColumns: ["delivery_note_id"]
          },
          {
            foreignKeyName: "dn_workflow_log_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "v_reissue_register"
            referencedColumns: ["replaced_dn_id"]
          },
          {
            foreignKeyName: "dn_workflow_log_holder_from_fkey"
            columns: ["from_id"]
            isOneToOne: false
            referencedRelation: "user_tbl"
            referencedColumns: ["id"]
          },
        ]
      }
      v_slip_requests: {
        Row: {
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          decided_by_name: string | null
          decision_note: string | null
          delivery_note_id: string | null
          dn_number: string | null
          fulfilled_dn_id: string | null
          fulfilled_dn_number: string | null
          id: string | null
          message: string | null
          request_type: Database["public"]["Enums"]["slip_request_type"] | null
          requested_by: string | null
          requested_by_name: string | null
          requested_by_role: Database["public"]["Enums"]["user_role"] | null
          status: string | null
          target: Database["public"]["Enums"]["slip_request_target"] | null
        }
        Relationships: [
          {
            foreignKeyName: "slip_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "user_tbl"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slip_requests_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slip_requests_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_dashboard"
            referencedColumns: ["delivery_note_id"]
          },
          {
            foreignKeyName: "slip_requests_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "v_reissue_register"
            referencedColumns: ["delivery_note_id"]
          },
          {
            foreignKeyName: "slip_requests_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "v_reissue_register"
            referencedColumns: ["replaced_dn_id"]
          },
          {
            foreignKeyName: "slip_requests_fulfilled_dn_id_fkey"
            columns: ["fulfilled_dn_id"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slip_requests_fulfilled_dn_id_fkey"
            columns: ["fulfilled_dn_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_dashboard"
            referencedColumns: ["delivery_note_id"]
          },
          {
            foreignKeyName: "slip_requests_fulfilled_dn_id_fkey"
            columns: ["fulfilled_dn_id"]
            isOneToOne: false
            referencedRelation: "v_reissue_register"
            referencedColumns: ["delivery_note_id"]
          },
          {
            foreignKeyName: "slip_requests_fulfilled_dn_id_fkey"
            columns: ["fulfilled_dn_id"]
            isOneToOne: false
            referencedRelation: "v_reissue_register"
            referencedColumns: ["replaced_dn_id"]
          },
          {
            foreignKeyName: "slip_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "user_tbl"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _t_as: { Args: { p: string }; Returns: undefined }
      _t_ok: { Args: { cond: boolean; label: string }; Returns: undefined }
      _t_refused: {
        Args: { fragment: string; label: string; sql: string }
        Returns: undefined
      }
      acknowledge_delivery_note: {
        Args: { p_dn_id: string }
        Returns: {
          acknowledged_at: string | null
          arrived_at: string | null
          assigned_driver_id: string | null
          assigned_to: string | null
          created_at: string
          created_by: string | null
          customer_name: string | null
          customer_number: string | null
          dn_number: string
          driver_sent_at: string | null
          driver_sent_by: string | null
          extraction_confidence: number | null
          extraction_method:
            | Database["public"]["Enums"]["extraction_method"]
            | null
          holder_id: string | null
          holder_role: Database["public"]["Enums"]["user_role"] | null
          holder_since: string | null
          id: string
          needs_review_fields: string[]
          notes: string | null
          order_date: string | null
          pdf_file_name: string | null
          pdf_sha256: string | null
          pdf_storage_path: string | null
          print_date: string | null
          reissue_note: string | null
          reissue_reason:
            | Database["public"]["Enums"]["dn_reissue_reason"]
            | null
          replaces_dn_id: string | null
          salesman: string | null
          sent_at: string | null
          sent_by: string | null
          ship_from: string | null
          ship_to: string | null
          shipping_reference: string | null
          so_number: string
          so_override_at: string | null
          so_override_by: string | null
          so_override_reason: string | null
          source_file_type: string | null
          stamped_pdf_path: string | null
          status: Database["public"]["Enums"]["dn_status"]
          supplier_id: string
          updated_at: string
          upload_batch_id: string | null
          workflow_status: Database["public"]["Enums"]["dn_workflow_status"]
        }
        SetofOptions: {
          from: "*"
          to: "delivery_notes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      approve_reissue: {
        Args: {
          p_dn_number: string
          p_note?: string
          p_pdf_qty?: number
          p_so_number: string
          p_submission_id: string
        }
        Returns: {
          acknowledged_at: string | null
          arrived_at: string | null
          assigned_driver_id: string | null
          assigned_to: string | null
          created_at: string
          created_by: string | null
          customer_name: string | null
          customer_number: string | null
          dn_number: string
          driver_sent_at: string | null
          driver_sent_by: string | null
          extraction_confidence: number | null
          extraction_method:
            | Database["public"]["Enums"]["extraction_method"]
            | null
          holder_id: string | null
          holder_role: Database["public"]["Enums"]["user_role"] | null
          holder_since: string | null
          id: string
          needs_review_fields: string[]
          notes: string | null
          order_date: string | null
          pdf_file_name: string | null
          pdf_sha256: string | null
          pdf_storage_path: string | null
          print_date: string | null
          reissue_note: string | null
          reissue_reason:
            | Database["public"]["Enums"]["dn_reissue_reason"]
            | null
          replaces_dn_id: string | null
          salesman: string | null
          sent_at: string | null
          sent_by: string | null
          ship_from: string | null
          ship_to: string | null
          shipping_reference: string | null
          so_number: string
          so_override_at: string | null
          so_override_by: string | null
          so_override_reason: string | null
          source_file_type: string | null
          stamped_pdf_path: string | null
          status: Database["public"]["Enums"]["dn_status"]
          supplier_id: string
          updated_at: string
          upload_batch_id: string | null
          workflow_status: Database["public"]["Enums"]["dn_workflow_status"]
        }
        SetofOptions: {
          from: "*"
          to: "delivery_notes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_slip_request: {
        Args: { p_request_id: string }
        Returns: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          delivery_note_id: string | null
          fulfilled_dn_id: string | null
          id: string
          message: string | null
          request_type: Database["public"]["Enums"]["slip_request_type"]
          requested_by: string
          requested_by_role: Database["public"]["Enums"]["user_role"]
          status: string
          target: Database["public"]["Enums"]["slip_request_target"]
        }
        SetofOptions: {
          from: "*"
          to: "slip_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_dn_duplicates: {
        Args: {
          p_dn_numbers: string[]
          p_sha256: string[]
          p_so_numbers?: string[]
        }
        Returns: {
          dn_number: string
          matched_on: string
          pdf_sha256: string
          so_number: string
          uploaded_at: string
          workflow_status: Database["public"]["Enums"]["dn_workflow_status"]
        }[]
      }
      create_app_user: {
        Args: {
          p_email: string
          p_first_name: string
          p_is_admin?: boolean
          p_is_driver?: boolean
          p_is_gm?: boolean
          p_is_superadmin?: boolean
          p_is_warehouse?: boolean
          p_last_name?: string
          p_password: string
        }
        Returns: string
      }
      create_delivery_note: {
        Args: {
          p_batch_id?: string
          p_confidence?: number
          p_customer_name?: string
          p_customer_number?: string
          p_dn_number: string
          p_extraction?: Database["public"]["Enums"]["extraction_method"]
          p_file_type?: string
          p_item_description: string
          p_item_number: string
          p_needs_review?: string[]
          p_order_date?: string
          p_pdf_file_name?: string
          p_pdf_path?: string
          p_pdf_qty: number
          p_pdf_sha256?: string
          p_print_date?: string
          p_reissue_note?: string
          p_reissue_reason?: Database["public"]["Enums"]["dn_reissue_reason"]
          p_replaces_dn_id?: string
          p_salesman?: string
          p_ship_from?: string
          p_ship_to?: string
          p_shipping_ref?: string
          p_so_number: string
          p_so_override_reason?: string
          p_supplier_code: string
          p_uom: string
        }
        Returns: {
          acknowledged_at: string | null
          arrived_at: string | null
          assigned_driver_id: string | null
          assigned_to: string | null
          created_at: string
          created_by: string | null
          customer_name: string | null
          customer_number: string | null
          dn_number: string
          driver_sent_at: string | null
          driver_sent_by: string | null
          extraction_confidence: number | null
          extraction_method:
            | Database["public"]["Enums"]["extraction_method"]
            | null
          holder_id: string | null
          holder_role: Database["public"]["Enums"]["user_role"] | null
          holder_since: string | null
          id: string
          needs_review_fields: string[]
          notes: string | null
          order_date: string | null
          pdf_file_name: string | null
          pdf_sha256: string | null
          pdf_storage_path: string | null
          print_date: string | null
          reissue_note: string | null
          reissue_reason:
            | Database["public"]["Enums"]["dn_reissue_reason"]
            | null
          replaces_dn_id: string | null
          salesman: string | null
          sent_at: string | null
          sent_by: string | null
          ship_from: string | null
          ship_to: string | null
          shipping_reference: string | null
          so_number: string
          so_override_at: string | null
          so_override_by: string | null
          so_override_reason: string | null
          source_file_type: string | null
          stamped_pdf_path: string | null
          status: Database["public"]["Enums"]["dn_status"]
          supplier_id: string
          updated_at: string
          upload_batch_id: string | null
          workflow_status: Database["public"]["Enums"]["dn_workflow_status"]
        }
        SetofOptions: {
          from: "*"
          to: "delivery_notes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_slip_request: {
        Args: {
          p_delivery_note_id?: string
          p_message?: string
          p_request_type: Database["public"]["Enums"]["slip_request_type"]
        }
        Returns: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          delivery_note_id: string | null
          fulfilled_dn_id: string | null
          id: string
          message: string | null
          request_type: Database["public"]["Enums"]["slip_request_type"]
          requested_by: string
          requested_by_role: Database["public"]["Enums"]["user_role"]
          status: string
          target: Database["public"]["Enums"]["slip_request_target"]
        }
        SetofOptions: {
          from: "*"
          to: "slip_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      daily_slip_counts: {
        Args: { p_days?: number }
        Returns: {
          day: string
          out_to_driver: number
          received: number
          reissued: number
          sent_by_me: number
          uploaded: number
        }[]
      }
      decide_dn: {
        Args: { p_approve: boolean; p_dn_id: string; p_note?: string }
        Returns: {
          acknowledged_at: string | null
          arrived_at: string | null
          assigned_driver_id: string | null
          assigned_to: string | null
          created_at: string
          created_by: string | null
          customer_name: string | null
          customer_number: string | null
          dn_number: string
          driver_sent_at: string | null
          driver_sent_by: string | null
          extraction_confidence: number | null
          extraction_method:
            | Database["public"]["Enums"]["extraction_method"]
            | null
          holder_id: string | null
          holder_role: Database["public"]["Enums"]["user_role"] | null
          holder_since: string | null
          id: string
          needs_review_fields: string[]
          notes: string | null
          order_date: string | null
          pdf_file_name: string | null
          pdf_sha256: string | null
          pdf_storage_path: string | null
          print_date: string | null
          reissue_note: string | null
          reissue_reason:
            | Database["public"]["Enums"]["dn_reissue_reason"]
            | null
          replaces_dn_id: string | null
          salesman: string | null
          sent_at: string | null
          sent_by: string | null
          ship_from: string | null
          ship_to: string | null
          shipping_reference: string | null
          so_number: string
          so_override_at: string | null
          so_override_by: string | null
          so_override_reason: string | null
          source_file_type: string | null
          stamped_pdf_path: string | null
          status: Database["public"]["Enums"]["dn_status"]
          supplier_id: string
          updated_at: string
          upload_batch_id: string | null
          workflow_status: Database["public"]["Enums"]["dn_workflow_status"]
        }
        SetofOptions: {
          from: "*"
          to: "delivery_notes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decline_slip_request: {
        Args: { p_reason?: string; p_request_id: string }
        Returns: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          delivery_note_id: string | null
          fulfilled_dn_id: string | null
          id: string
          message: string | null
          request_type: Database["public"]["Enums"]["slip_request_type"]
          requested_by: string
          requested_by_role: Database["public"]["Enums"]["user_role"]
          status: string
          target: Database["public"]["Enums"]["slip_request_target"]
        }
        SetofOptions: {
          from: "*"
          to: "slip_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      find_possible_originals: {
        Args: {
          p_customer_number?: string
          p_item_number: string
          p_pdf_qty: number
          p_within_days?: number
        }
        Returns: {
          dn_number: string
          holder_name: string
          id: string
          item_number: string
          pdf_qty: number
          print_date: string
          so_number: string
          workflow_status: Database["public"]["Enums"]["dn_workflow_status"]
        }[]
      }
      fulfil_slip_request: {
        Args: { p_dn_id?: string; p_note?: string; p_request_id: string }
        Returns: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          delivery_note_id: string | null
          fulfilled_dn_id: string | null
          id: string
          message: string | null
          request_type: Database["public"]["Enums"]["slip_request_type"]
          requested_by: string
          requested_by_role: Database["public"]["Enums"]["user_role"]
          status: string
          target: Database["public"]["Enums"]["slip_request_target"]
        }
        SetofOptions: {
          from: "*"
          to: "slip_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      hand_over_delivery_note: {
        Args: { p_dn_id: string; p_note?: string; p_to_user: string }
        Returns: {
          acknowledged_at: string | null
          arrived_at: string | null
          assigned_driver_id: string | null
          assigned_to: string | null
          created_at: string
          created_by: string | null
          customer_name: string | null
          customer_number: string | null
          dn_number: string
          driver_sent_at: string | null
          driver_sent_by: string | null
          extraction_confidence: number | null
          extraction_method:
            | Database["public"]["Enums"]["extraction_method"]
            | null
          holder_id: string | null
          holder_role: Database["public"]["Enums"]["user_role"] | null
          holder_since: string | null
          id: string
          needs_review_fields: string[]
          notes: string | null
          order_date: string | null
          pdf_file_name: string | null
          pdf_sha256: string | null
          pdf_storage_path: string | null
          print_date: string | null
          reissue_note: string | null
          reissue_reason:
            | Database["public"]["Enums"]["dn_reissue_reason"]
            | null
          replaces_dn_id: string | null
          salesman: string | null
          sent_at: string | null
          sent_by: string | null
          ship_from: string | null
          ship_to: string | null
          shipping_reference: string | null
          so_number: string
          so_override_at: string | null
          so_override_by: string | null
          so_override_reason: string | null
          source_file_type: string | null
          stamped_pdf_path: string | null
          status: Database["public"]["Enums"]["dn_status"]
          supplier_id: string
          updated_at: string
          upload_batch_id: string | null
          workflow_status: Database["public"]["Enums"]["dn_workflow_status"]
        }
        SetofOptions: {
          from: "*"
          to: "delivery_notes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      inventory_totals: {
        Args: {
          p_discrepancies_only?: boolean
          p_from?: string
          p_search?: string
          p_status?: string
          p_to?: string
        }
        Returns: {
          arrived_qty: number
          balance_qty: number
          discrepancies: number
          missing_qty: number
          notes: number
          pdf_qty: number
        }[]
      }
      issue_stock: {
        Args: {
          p_lot_id: string
          p_movement_type: Database["public"]["Enums"]["movement_type"]
          p_notes?: string
          p_qty: number
          p_reference_no?: string
          p_warehouse_id: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          delivery_note_line_id: string | null
          direction: Database["public"]["Enums"]["movement_direction"]
          id: string
          item_id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes: string | null
          occurred_at: string
          qty: number
          reference_no: string | null
          reversal_of: string | null
          warehouse_id: string
        }
        SetofOptions: {
          from: "*"
          to: "stock_movements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      list_recipients: {
        Args: { p_kind: string }
        Returns: {
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      receive_delivery_note_line: {
        Args: {
          p_arrival_photo_path?: string
          p_arrived_qty: number
          p_discrepancy_code?: Database["public"]["Enums"]["dn_discrepancy_reason"]
          p_discrepancy_note?: string
          p_line_id: string
          p_notes?: string
          p_warehouse_id: string
        }
        Returns: {
          arrival_photo_path: string | null
          arrived_qty: number | null
          created_at: string
          delivery_note_id: string
          discrepancy_code:
            | Database["public"]["Enums"]["dn_discrepancy_reason"]
            | null
          discrepancy_reason: string | null
          id: string
          item_description: string
          item_id: string
          item_number: string
          line_no: number
          missing_qty: number | null
          notes: string | null
          pdf_qty: number
          received_at: string | null
          received_by: string | null
          status: Database["public"]["Enums"]["dn_status"]
          uom: string
        }
        SetofOptions: {
          from: "*"
          to: "delivery_note_lines"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reject_reissue: {
        Args: { p_reason: string; p_submission_id: string }
        Returns: {
          created_dn_id: string | null
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          dn_number: string | null
          file_path: string | null
          file_type: string
          id: string
          note: string | null
          original_dn_id: string
          reason: Database["public"]["Enums"]["dn_reissue_reason"]
          so_number: string | null
          status: string
          submitted_at: string
          submitted_by: string
        }
        SetofOptions: {
          from: "*"
          to: "dn_reissue_submissions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reverse_stock_movement: {
        Args: { p_movement_id: string; p_reason: string }
        Returns: {
          created_at: string
          created_by: string | null
          delivery_note_line_id: string | null
          direction: Database["public"]["Enums"]["movement_direction"]
          id: string
          item_id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes: string | null
          occurred_at: string
          qty: number
          reference_no: string | null
          reversal_of: string | null
          warehouse_id: string
        }
        SetofOptions: {
          from: "*"
          to: "stock_movements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      send_dn_to_gm: {
        Args: { p_dn_ids: string[]; p_gm_id?: string; p_note?: string }
        Returns: number
      }
      set_user_flags: {
        Args: {
          p_is_admin?: boolean
          p_is_driver?: boolean
          p_is_gm?: boolean
          p_is_superadmin?: boolean
          p_is_warehouse?: boolean
          p_user_id: string
        }
        Returns: {
          account_created_at: string
          email: string | null
          first_name: string | null
          id: string
          is_active: boolean
          is_admin: boolean
          is_driver: boolean
          is_gm: boolean
          is_superadmin: boolean
          is_warehouse: boolean
          last_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        SetofOptions: {
          from: "*"
          to: "user_tbl"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_user_password: {
        Args: { p_email: string; p_password: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      submit_reissue: {
        Args: {
          p_dn_number?: string
          p_file_path?: string
          p_file_type?: string
          p_note?: string
          p_original_dn_id: string
          p_reason: Database["public"]["Enums"]["dn_reissue_reason"]
          p_so_number?: string
        }
        Returns: {
          created_dn_id: string | null
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          dn_number: string | null
          file_path: string | null
          file_type: string
          id: string
          note: string | null
          original_dn_id: string
          reason: Database["public"]["Enums"]["dn_reissue_reason"]
          so_number: string | null
          status: string
          submitted_at: string
          submitted_by: string
        }
        SetofOptions: {
          from: "*"
          to: "dn_reissue_submissions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      dn_discrepancy_reason:
        | "supplier_short_loaded"
        | "transit_loss"
        | "damaged"
        | "counting_error"
        | "supplier_over_loaded"
        | "other"
      dn_reissue_reason: "lost" | "damaged" | "supplier_correction" | "other"
      dn_status: "not_arrived" | "partial" | "arrived" | "cancelled"
      dn_workflow_status:
        | "draft"
        | "sent_to_gm"
        | "gm_approved"
        | "with_warehouse"
        | "sent_to_driver"
        | "rejected"
        | "received"
        | "replaced"
      extraction_method: "pdf_text" | "vision" | "manual"
      movement_direction: "IN" | "OUT"
      movement_type:
        | "dn_receipt"
        | "sale"
        | "driver_allocation"
        | "transfer_out"
        | "transfer_in"
        | "adjustment"
        | "reversal"
      slip_request_target: "office" | "warehouse"
      slip_request_type:
        | "slip_for_delivery"
        | "lost_slip"
        | "damaged_slip"
        | "other"
      user_role:
        | "ceo"
        | "gm"
        | "manager"
        | "admin"
        | "dispatcher"
        | "warehouse"
        | "driver"
        | "viewer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      dn_discrepancy_reason: [
        "supplier_short_loaded",
        "transit_loss",
        "damaged",
        "counting_error",
        "supplier_over_loaded",
        "other",
      ],
      dn_reissue_reason: ["lost", "damaged", "supplier_correction", "other"],
      dn_status: ["not_arrived", "partial", "arrived", "cancelled"],
      dn_workflow_status: [
        "draft",
        "sent_to_gm",
        "gm_approved",
        "with_warehouse",
        "sent_to_driver",
        "rejected",
        "received",
        "replaced",
      ],
      extraction_method: ["pdf_text", "vision", "manual"],
      movement_direction: ["IN", "OUT"],
      movement_type: [
        "dn_receipt",
        "sale",
        "driver_allocation",
        "transfer_out",
        "transfer_in",
        "adjustment",
        "reversal",
      ],
      slip_request_target: ["office", "warehouse"],
      slip_request_type: [
        "slip_for_delivery",
        "lost_slip",
        "damaged_slip",
        "other",
      ],
      user_role: [
        "ceo",
        "gm",
        "manager",
        "admin",
        "dispatcher",
        "warehouse",
        "driver",
        "viewer",
      ],
    },
  },
} as const

