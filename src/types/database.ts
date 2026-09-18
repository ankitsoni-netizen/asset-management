export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      allocation_images: {
        Row: {
          allocation_id: string;
          created_at: string;
          filename: string;
          id: string;
          mime_type: string;
          storage_path: string;
        };
        Insert: {
          allocation_id: string;
          created_at?: string;
          filename: string;
          id?: string;
          mime_type: string;
          storage_path: string;
        };
        Update: {
          allocation_id?: string;
          created_at?: string;
          filename?: string;
          id?: string;
          mime_type?: string;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "allocation_images_allocation_id_fkey";
            columns: ["allocation_id"];
            isOneToOne: false;
            referencedRelation: "allocations";
            referencedColumns: ["id"];
          },
        ];
      };
      asset_images: {
        Row: {
          asset_id: string;
          created_at: string;
          filename: string;
          id: string;
          mime_type: string;
          storage_path: string;
        };
        Insert: {
          asset_id: string;
          created_at?: string;
          filename: string;
          id?: string;
          mime_type: string;
          storage_path: string;
        };
        Update: {
          asset_id?: string;
          created_at?: string;
          filename?: string;
          id?: string;
          mime_type?: string;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "asset_images_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          },
        ];
      };
      allocations: {
        Row: {
          action: Database["public"]["Enums"]["allocation_action"];
          allocated_at: string;
          asset_id: string;
          confirmation_note: string | null;
          created_at: string;
          department: string;
          email_attempt_count: number;
          email_delivery_status: "pending" | "sent" | "failed" | "not_configured";
          email_error: string | null;
          email_last_attempted_at: string | null;
          email_message_id: string | null;
          email_sent: boolean;
          email_sent_at: string | null;
          employee_email: string;
          employee_id: string;
          employee_name: string;
          ended_at: string | null;
          id: string;
          is_current: boolean;
          position: string;
          updated_at: string;
        };
        Insert: {
          action?: Database["public"]["Enums"]["allocation_action"];
          allocated_at?: string;
          asset_id: string;
          confirmation_note?: string | null;
          created_at?: string;
          department: string;
          email_attempt_count?: number;
          email_delivery_status?: "pending" | "sent" | "failed" | "not_configured";
          email_error?: string | null;
          email_last_attempted_at?: string | null;
          email_message_id?: string | null;
          email_sent?: boolean;
          email_sent_at?: string | null;
          employee_email: string;
          employee_id: string;
          employee_name: string;
          ended_at?: string | null;
          id?: string;
          is_current?: boolean;
          position: string;
          updated_at?: string;
        };
        Update: {
          action?: Database["public"]["Enums"]["allocation_action"];
          allocated_at?: string;
          asset_id?: string;
          confirmation_note?: string | null;
          created_at?: string;
          department?: string;
          email_attempt_count?: number;
          email_delivery_status?: "pending" | "sent" | "failed" | "not_configured";
          email_error?: string | null;
          email_last_attempted_at?: string | null;
          email_message_id?: string | null;
          email_sent?: boolean;
          email_sent_at?: string | null;
          employee_email?: string;
          employee_id?: string;
          employee_name?: string;
          ended_at?: string | null;
          id?: string;
          is_current?: boolean;
          position?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "allocations_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "allocations_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
        ];
      };
      assets: {
        Row: {
          active: boolean;
          asset_type_id: string;
          brand: string | null;
          created_at: string;
          id: string;
          model: string | null;
          notes: string | null;
          serial_number: string | null;
          status: Database["public"]["Enums"]["asset_status"];
          uid: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          asset_type_id: string;
          brand?: string | null;
          created_at?: string;
          id?: string;
          model?: string | null;
          notes?: string | null;
          serial_number?: string | null;
          status?: Database["public"]["Enums"]["asset_status"];
          uid?: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          asset_type_id?: string;
          brand?: string | null;
          created_at?: string;
          id?: string;
          model?: string | null;
          notes?: string | null;
          serial_number?: string | null;
          status?: Database["public"]["Enums"]["asset_status"];
          uid?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assets_asset_type_id_fkey";
            columns: ["asset_type_id"];
            isOneToOne: false;
            referencedRelation: "asset_types";
            referencedColumns: ["id"];
          },
        ];
      };
      asset_types: {
        Row: {
          created_at: string;
          id: string;
          is_custom: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_custom?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_custom?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_event"];
          actor_email: string;
          allocation_id: string | null;
          asset_id: string | null;
          created_at: string;
          employee_id: string | null;
          entity_id: string | null;
          entity_type: string;
          id: string;
          payload: Json;
        };
        Insert: {
          action: Database["public"]["Enums"]["audit_event"];
          actor_email: string;
          allocation_id?: string | null;
          asset_id?: string | null;
          created_at?: string;
          employee_id?: string | null;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          payload?: Json;
        };
        Update: {
          action?: Database["public"]["Enums"]["audit_event"];
          actor_email?: string;
          allocation_id?: string | null;
          asset_id?: string | null;
          created_at?: string;
          employee_id?: string | null;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          payload?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_allocation_id_fkey";
            columns: ["allocation_id"];
            isOneToOne: false;
            referencedRelation: "allocations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
        ];
      };
      employees: {
        Row: {
          code: string | null;
          created_at: string;
          department: string;
          disabled: boolean;
          email: string;
          id: string;
          name: string;
          position: string;
          updated_at: string;
        };
        Insert: {
          code?: string | null;
          created_at?: string;
          department: string;
          disabled?: boolean;
          email: string;
          id?: string;
          name: string;
          position: string;
          updated_at?: string;
        };
        Update: {
          code?: string | null;
          created_at?: string;
          department?: string;
          disabled?: boolean;
          email?: string;
          id?: string;
          name?: string;
          position?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      allocate_asset: {
        Args: {
          p_employee_id: string;
          p_uid: string;
        };
        Returns: Json;
      };
      assert_cloutflow_admin: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      is_cloutflow_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      register_asset: {
        Args: {
          p_active?: boolean;
          p_asset_type_id: string;
          p_brand?: string | null;
          p_model?: string | null;
          p_notes?: string | null;
          p_serial_number?: string | null;
          p_uid: string;
        };
        Returns: Json;
      };
      claim_acknowledgement_send: {
        Args: {
          p_allocation_id: string;
          p_min_interval_seconds?: number;
        };
        Returns: Json;
      };
      return_asset: {
        Args: {
          p_uid: string;
        };
        Returns: Json;
      };
      upsert_employee: {
        Args: {
          p_department: string;
          p_email: string;
          p_name: string;
          p_position: string;
        };
        Returns: Database["public"]["Tables"]["employees"]["Row"];
      };
    };
    Enums: {
      allocation_action: "allocated" | "reallocated" | "returned";
      asset_status: "allocated" | "available";
      audit_event:
        | "asset_type_created"
        | "asset_created"
        | "employee_upserted"
        | "allocated"
        | "reallocated"
        | "returned"
        | "acknowledgement_email_sent"
        | "acknowledgement_email_failed"
        | "acknowledgement_email_retried";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type AssetStatus = Database["public"]["Enums"]["asset_status"];
export type AllocationAction = Database["public"]["Enums"]["allocation_action"];
