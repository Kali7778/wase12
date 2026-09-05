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
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      delivery_note_lines: {
        Row: {
          arrived_qty: number | null;
          created_at: string;
          delivery_note_id: string;
          discrepancy_reason: string | null;
          id: string;
          item_description: string;
          item_id: string;
          item_number: string;
          line_no: number;
          missing_qty: number | null;
          notes: string | null;
          pdf_qty: number;
          received_at: string | null;
          received_by: string | null;
          status: Database['public']['Enums']['dn_status'];
          uom: string;
        };
        Insert: {
          arrived_qty?: number | null;
          created_at?: string;
          delivery_note_id: string;
          discrepancy_reason?: string | null;
          id?: string;
          item_description: string;
          item_id: string;
          item_number: string;
          line_no?: number;
          notes?: string | null;
          pdf_qty: number;
          received_at?: string | null;
          received_by?: string | null;
          status?: Database['public']['Enums']['dn_status'];
          uom: string;
        };
        Update: {
          arrived_qty?: number | null;
          created_at?: string;
          delivery_note_id?: string;
          discrepancy_reason?: string | null;
          id?: string;
          item_description?: string;
          item_id?: string;
          item_number?: string;
          line_no?: number;
          notes?: string | null;
          pdf_qty?: number;
          received_at?: string | null;
          received_by?: string | null;
          status?: Database['public']['Enums']['dn_status'];
          uom?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'delivery_note_lines_delivery_note_id_fkey';
            columns: ['delivery_note_id'];
            isOneToOne: false;
            referencedRelation: 'delivery_notes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'delivery_note_lines_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'delivery_note_lines_received_by_fkey';
            columns: ['received_by'];
            isOneToOne: false;
            referencedRelation: 'user_tbl';
            referencedColumns: ['id'];
          },
        ];
      };
      delivery_notes: {
        Row: {
          arrived_at: string | null;
          created_at: string;
          created_by: string | null;
          customer_name: string | null;
          customer_number: string | null;
          dn_number: string;
          extraction_confidence: number | null;
          extraction_method: Database['public']['Enums']['extraction_method'] | null;
          id: string;
          needs_review_fields: string[];
          notes: string | null;
          order_date: string | null;
          pdf_file_name: string | null;
          pdf_sha256: string | null;
          pdf_storage_path: string | null;
          print_date: string | null;
          salesman: string | null;
          ship_from: string | null;
          ship_to: string | null;
          shipping_reference: string | null;
          so_number: string;
          status: Database['public']['Enums']['dn_status'];
          supplier_id: string;
          updated_at: string;
        };
        Insert: {
          arrived_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_name?: string | null;
          customer_number?: string | null;
          dn_number: string;
          extraction_confidence?: number | null;
          extraction_method?: Database['public']['Enums']['extraction_method'] | null;
          id?: string;
          needs_review_fields?: string[];
          notes?: string | null;
          order_date?: string | null;
          pdf_file_name?: string | null;
          pdf_sha256?: string | null;
          pdf_storage_path?: string | null;
          print_date?: string | null;
          salesman?: string | null;
          ship_from?: string | null;
          ship_to?: string | null;
          shipping_reference?: string | null;
          so_number: string;
          status?: Database['public']['Enums']['dn_status'];
          supplier_id: string;
          updated_at?: string;
        };
        Update: {
          arrived_at?: string | null;
          created_by?: string | null;
          customer_name?: string | null;
          customer_number?: string | null;
          dn_number?: string;
          extraction_confidence?: number | null;
          extraction_method?: Database['public']['Enums']['extraction_method'] | null;
          id?: string;
          needs_review_fields?: string[];
          notes?: string | null;
          order_date?: string | null;
          pdf_file_name?: string | null;
          pdf_sha256?: string | null;
          pdf_storage_path?: string | null;
          print_date?: string | null;
          salesman?: string | null;
          ship_from?: string | null;
          ship_to?: string | null;
          shipping_reference?: string | null;
          so_number?: string;
          status?: Database['public']['Enums']['dn_status'];
          supplier_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'delivery_notes_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'suppliers';
            referencedColumns: ['id'];
          },
        ];
      };
      items: {
        Row: {
          created_at: string;
          description_ar: string | null;
          description_en: string;
          id: string;
          is_active: boolean;
          item_number: string;
          unit_weight_kg: number | null;
          uom: string;
        };
        Insert: {
          created_at?: string;
          description_ar?: string | null;
          description_en: string;
          id?: string;
          is_active?: boolean;
          item_number: string;
          unit_weight_kg?: number | null;
          uom: string;
        };
        Update: {
          created_at?: string;
          description_ar?: string | null;
          description_en?: string;
          id?: string;
          is_active?: boolean;
          item_number?: string;
          unit_weight_kg?: number | null;
          uom?: string;
        };
        Relationships: [];
      };
      stock_movements: {
        Row: {
          created_at: string;
          created_by: string | null;
          delivery_note_line_id: string | null;
          direction: Database['public']['Enums']['movement_direction'];
          id: string;
          item_id: string;
          movement_type: Database['public']['Enums']['movement_type'];
          notes: string | null;
          occurred_at: string;
          qty: number;
          reference_no: string | null;
          reversal_of: string | null;
          warehouse_id: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'stock_movements_delivery_note_line_id_fkey';
            columns: ['delivery_note_line_id'];
            isOneToOne: false;
            referencedRelation: 'delivery_note_lines';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_movements_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_movements_warehouse_id_fkey';
            columns: ['warehouse_id'];
            isOneToOne: false;
            referencedRelation: 'warehouses';
            referencedColumns: ['id'];
          },
        ];
      };
      suppliers: {
        Row: {
          address: string | null;
          code: string;
          cr_number: string | null;
          created_at: string;
          id: string;
          is_active: boolean;
          name_ar: string | null;
          name_en: string;
          phone: string | null;
          vat_number: string | null;
        };
        Insert: {
          address?: string | null;
          code: string;
          cr_number?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name_ar?: string | null;
          name_en: string;
          phone?: string | null;
          vat_number?: string | null;
        };
        Update: {
          address?: string | null;
          code?: string;
          cr_number?: string | null;
          id?: string;
          is_active?: boolean;
          name_ar?: string | null;
          name_en?: string;
          phone?: string | null;
          vat_number?: string | null;
        };
        Relationships: [];
      };
      user_tbl: {
        Row: {
          account_created_at: string;
          email: string | null;
          first_name: string | null;
          id: string;
          is_active: boolean;
          is_admin: boolean;
          is_driver: boolean;
          is_gm: boolean;
          is_superadmin: boolean;
          last_name: string | null;
          phone: string | null;
          /** Derived from the is_* flags by a trigger. Never set by hand. */
          role: Database['public']['Enums']['user_role'];
        };
        Insert: {
          account_created_at?: string;
          email?: string | null;
          first_name?: string | null;
          id: string;
          is_active?: boolean;
          is_admin?: boolean;
          is_driver?: boolean;
          is_gm?: boolean;
          is_superadmin?: boolean;
          last_name?: string | null;
          phone?: string | null;
        };
        Update: {
          email?: string | null;
          first_name?: string | null;
          is_active?: boolean;
          is_admin?: boolean;
          is_driver?: boolean;
          is_gm?: boolean;
          is_superadmin?: boolean;
          last_name?: string | null;
          phone?: string | null;
        };
        Relationships: [];
      };
      warehouses: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          name_ar: string | null;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          name_ar?: string | null;
        };
        Update: {
          code?: string;
          is_active?: boolean;
          name?: string;
          name_ar?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      v_inventory_dashboard: {
        Row: {
          'Arrived Qty': number | null;
          Balance: number | null;
          delivery_note_id: string | null;
          'DN No': string | null;
          'In Qty': number | null;
          Item: string | null;
          item_number: string | null;
          'Missing Qty': number | null;
          'Out Qty': number | null;
          'PDF Qty': number | null;
          print_date: string | null;
          'SO No': string | null;
          Status: Database['public']['Enums']['dn_status'] | null;
          supplier: string | null;
          UOM: string | null;
        };
        Relationships: [];
      };
      v_item_stock: {
        Row: {
          available_qty: number | null;
          description_en: string | null;
          in_qty: number | null;
          item_id: string | null;
          item_number: string | null;
          out_qty: number | null;
          uom: string | null;
          warehouse_code: string | null;
          warehouse_id: string | null;
        };
        Relationships: [];
      };
      v_lot_balances: {
        Row: {
          arrived_qty: number | null;
          balance_qty: number | null;
          delivery_note_id: string | null;
          in_qty: number | null;
          item_description: string | null;
          item_id: string | null;
          item_number: string | null;
          lot_id: string | null;
          missing_qty: number | null;
          out_qty: number | null;
          pdf_qty: number | null;
          status: Database['public']['Enums']['dn_status'] | null;
          uom: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      issue_stock: {
        Args: {
          p_lot_id: string;
          p_movement_type: Database['public']['Enums']['movement_type'];
          p_notes?: string;
          p_qty: number;
          p_reference_no?: string;
          p_warehouse_id: string;
        };
        Returns: Database['public']['Tables']['stock_movements']['Row'];
      };
      receive_delivery_note_line: {
        Args: {
          p_arrived_qty: number;
          p_discrepancy_reason?: string;
          p_line_id: string;
          p_notes?: string;
          p_warehouse_id: string;
        };
        Returns: Database['public']['Tables']['delivery_note_lines']['Row'];
      };
      create_app_user: {
        Args: {
          p_email: string;
          p_password: string;
          p_first_name: string;
          p_last_name?: string;
          p_is_superadmin?: boolean;
          p_is_gm?: boolean;
          p_is_admin?: boolean;
          p_is_driver?: boolean;
        };
        Returns: string;
      };
      set_user_password: {
        Args: { p_email: string; p_password: string };
        Returns: undefined;
      };
      set_user_flags: {
        Args: {
          p_user_id: string;
          p_is_superadmin?: boolean;
          p_is_gm?: boolean;
          p_is_admin?: boolean;
          p_is_driver?: boolean;
        };
        Returns: Database['public']['Tables']['user_tbl']['Row'];
      };
      reverse_stock_movement: {
        Args: { p_movement_id: string; p_reason: string };
        Returns: Database['public']['Tables']['stock_movements']['Row'];
      };
    };
    Enums: {
      dn_status: 'not_arrived' | 'partial' | 'arrived' | 'cancelled';
      extraction_method: 'pdf_text' | 'vision' | 'manual';
      movement_direction: 'IN' | 'OUT';
      movement_type:
        | 'dn_receipt'
        | 'sale'
        | 'driver_allocation'
        | 'transfer_out'
        | 'transfer_in'
        | 'adjustment'
        | 'reversal';
      user_role:
        | 'ceo'
        | 'gm'
        | 'manager'
        | 'admin'
        | 'dispatcher'
        | 'warehouse'
        | 'driver'
        | 'viewer';
    };
    CompositeTypes: Record<never, never>;
  };
};

type PublicSchema = Database['public'];

/** Row type of any table or view — `Tables<'items'>` */
export type Tables<T extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])> =
  (PublicSchema['Tables'] & PublicSchema['Views'])[T] extends { Row: infer R } ? R : never;

/** Insert type of a table — `TablesInsert<'delivery_notes'>` */
export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T] extends { Insert: infer I } ? I : never;

/** Update type of a table — `TablesUpdate<'delivery_notes'>` */
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T] extends { Update: infer U } ? U : never;

/** Any enum — `Enums<'dn_status'>` */
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];

/** Enum values at runtime (for dropdowns and validation). */
export const DB_ENUMS = {
  dnStatus: ['not_arrived', 'partial', 'arrived', 'cancelled'],
  extractionMethod: ['pdf_text', 'vision', 'manual'],
  movementDirection: ['IN', 'OUT'],
  movementType: [
    'dn_receipt',
    'sale',
    'driver_allocation',
    'transfer_out',
    'transfer_in',
    'adjustment',
    'reversal',
  ],
  userRole: ['ceo', 'gm', 'manager', 'admin', 'dispatcher', 'warehouse', 'driver', 'viewer'],
} as const;
