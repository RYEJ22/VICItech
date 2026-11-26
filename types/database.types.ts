export type Json =
  | string
  | number
  | boolean
  | null
  | { readonly [key: string]: Json | undefined }
  | readonly Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          role: 'user' | 'admin' | string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          role?: 'user' | 'admin' | string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          display_name?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          role?: 'user' | 'admin' | string;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          user_id: string | null;
          order_type: 'direct_buy' | 'preset_builder' | 'trade_in_refurbished';
          items: Json;
          total_price: number;
          customer_info: Json;
          status: string;
          created_at: string;
          order_number: string | null;
          user_role: string;
          product_name: string;
          base_price: number | null;
          jit_buffer: number;
          order_summary: Json;
          serial_number: string | null;
          payment_status: string;
          payment_reference: string | null;
          payment_method: string | null;
          paid_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          order_type?: 'direct_buy' | 'preset_builder' | 'trade_in_refurbished';
          items?: Json;
          total_price?: number;
          customer_info?: Json;
          status?: string;
          created_at?: string;
          order_number?: string | null;
          user_role?: string;
          product_name?: string;
          base_price?: number | null;
          jit_buffer?: number;
          order_summary?: Json;
          serial_number?: string | null;
          payment_status?: string;
          payment_reference?: string | null;
          payment_method?: string | null;
          paid_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          order_type?: 'direct_buy' | 'preset_builder' | 'trade_in_refurbished';
          items?: Json;
          total_price?: number;
          customer_info?: Json;
          status?: string;
          created_at?: string;
          order_number?: string | null;
          user_role?: string;
          product_name?: string;
          base_price?: number | null;
          jit_buffer?: number;
          order_summary?: Json;
          serial_number?: string | null;
          payment_status?: string;
          payment_reference?: string | null;
          payment_method?: string | null;
          paid_at?: string | null;
        };
        Relationships: [];
      };
      qc_logs: {
        Row: {
          id: string;
          serial_number: string;
          device_name: string;
          status: string;
          burnin_hours: number;
          score: number | null;
          created_at: string;
          order_id: string | null;
          stress_test_status: string;
          cpu_temp_c: number | null;
          gpu_temp_c: number | null;
          stability_score: number | null;
          shipping_status: string;
          certificate_id: string | null;
          shipped_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          serial_number: string;
          device_name: string;
          status: string;
          burnin_hours?: number;
          score?: number | null;
          created_at?: string;
          order_id?: string | null;
          stress_test_status?: string;
          cpu_temp_c?: number | null;
          gpu_temp_c?: number | null;
          stability_score?: number | null;
          shipping_status?: string;
          certificate_id?: string | null;
          shipped_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          serial_number?: string;
          device_name?: string;
          status?: string;
          burnin_hours?: number;
          score?: number | null;
          created_at?: string;
          order_id?: string | null;
          stress_test_status?: string;
          cpu_temp_c?: number | null;
          gpu_temp_c?: number | null;
          stability_score?: number | null;
          shipping_status?: string;
          certificate_id?: string | null;
          shipped_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      telemetry_logs: {
        Row: {
          id: string;
          serial_number: string;
          order_id: string | null;
          cpu_temp_c: number | null;
          gpu_temp_c: number | null;
          fan_rpm: number | null;
          voltage_stability: number | null;
          stability_score: number | null;
          stress_test_status: string;
          burnin_hours: number;
          source: 'esp32' | 'admin_simulation';
          created_at: string;
        };
        Insert: {
          id?: string;
          serial_number: string;
          order_id?: string | null;
          cpu_temp_c?: number | null;
          gpu_temp_c?: number | null;
          fan_rpm?: number | null;
          voltage_stability?: number | null;
          stability_score?: number | null;
          stress_test_status?: string;
          burnin_hours?: number;
          source?: 'esp32' | 'admin_simulation';
          created_at?: string;
        };
        Update: {
          id?: string;
          serial_number?: string;
          order_id?: string | null;
          cpu_temp_c?: number | null;
          gpu_temp_c?: number | null;
          fan_rpm?: number | null;
          voltage_stability?: number | null;
          stability_score?: number | null;
          stress_test_status?: string;
          burnin_hours?: number;
          source?: 'esp32' | 'admin_simulation';
          created_at?: string;
        };
        Relationships: [];
      };
      hardware_components: {
        Row: {
          id: string;
          name: string;
          brand: string;
          category: 'cpu' | 'gpu' | 'ram' | 'storage' | 'motherboard' | 'psu' | 'case' | 'cooling';
          architecture: string | null;
          base_price: number;
          stock_quantity: number;
          condition: 'brand_new' | 'refurbished_qc_passed' | 'used';
          specs: Json;
          performance_score: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          brand: string;
          category: 'cpu' | 'gpu' | 'ram' | 'storage' | 'motherboard' | 'psu' | 'case' | 'cooling';
          architecture?: string | null;
          base_price?: number;
          stock_quantity?: number;
          condition?: 'brand_new' | 'refurbished_qc_passed' | 'used';
          specs?: Json;
          performance_score?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          brand?: string;
          category?: 'cpu' | 'gpu' | 'ram' | 'storage' | 'motherboard' | 'psu' | 'case' | 'cooling';
          architecture?: string | null;
          base_price?: number;
          stock_quantity?: number;
          condition?: 'brand_new' | 'refurbished_qc_passed' | 'used';
          specs?: Json;
          performance_score?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      community_posts: {
        Row: {
          id: string;
          user_id: string;
          idempotency_key: string | null;
          title: string;
          content: string;
          category: string;
          tags: string[];
          media_urls: string[];
          media_type: 'image' | 'video' | null;
          audio_url: string | null;
          audio_title: string | null;
          is_lfg: boolean;
          lfg_details: Json | null;
          youtube_url: string | null;
          hardware_specs: Json;
          likes_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          idempotency_key?: string | null;
          title: string;
          content: string;
          category?: string;
          tags?: string[];
          media_urls?: string[];
          media_type?: 'image' | 'video' | null;
          audio_url?: string | null;
          audio_title?: string | null;
          is_lfg?: boolean;
          lfg_details?: Json | null;
          youtube_url?: string | null;
          hardware_specs?: Json;
          likes_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          idempotency_key?: string | null;
          title?: string;
          content?: string;
          category?: string;
          tags?: string[];
          media_urls?: string[];
          media_type?: 'image' | 'video' | null;
          audio_url?: string | null;
          audio_title?: string | null;
          is_lfg?: boolean;
          lfg_details?: Json | null;
          youtube_url?: string | null;
          hardware_specs?: Json;
          likes_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          actor_id: string | null;
          type: 'like' | 'comment' | 'dm' | 'system';
          entity_id: string | null;
          title: string | null;
          body: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          actor_id?: string | null;
          type: 'like' | 'comment' | 'dm' | 'system';
          entity_id?: string | null;
          title?: string | null;
          body?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          actor_id?: string | null;
          type?: 'like' | 'comment' | 'dm' | 'system';
          entity_id?: string | null;
          title?: string | null;
          body?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string;
          price: number;
          category: 'pc-build' | 'laptop' | 'smartphone' | 'console' | 'handheld' | 'component' | 'accessory';
          seller_type: 'vicitech' | 'partner';
          specs: Json;
          metadata?: Json;
          images: string[];
          stock_status: 'ready' | 'preorder' | 'sold_out';
          is_preset: boolean;
          preset_components: Json;
          reviewed_by_name: string | null;
          reviewed_by_avatar: string | null;
          review_quote: string | null;
          review_video_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description?: string;
          price?: number;
          category: 'pc-build' | 'laptop' | 'smartphone' | 'console' | 'handheld' | 'component' | 'accessory';
          seller_type?: 'vicitech' | 'partner';
          specs?: Json;
          metadata?: Json;
          images?: string[];
          stock_status?: 'ready' | 'preorder' | 'sold_out';
          is_preset?: boolean;
          preset_components?: Json;
          reviewed_by_name?: string | null;
          reviewed_by_avatar?: string | null;
          review_quote?: string | null;
          review_video_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          description?: string;
          price?: number;
          category?: 'pc-build' | 'laptop' | 'smartphone' | 'console' | 'handheld' | 'component' | 'accessory';
          seller_type?: 'vicitech' | 'partner';
          specs?: Json;
          metadata?: Json;
          images?: string[];
          stock_status?: 'ready' | 'preorder' | 'sold_out';
          is_preset?: boolean;
          preset_components?: Json;
          reviewed_by_name?: string | null;
          reviewed_by_avatar?: string | null;
          review_quote?: string | null;
          review_video_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      partners: {
        Row: {
          id: string;
          name: string;
          type: 'toko_komponen' | 'service_center';
          address: string;
          city: string;
          gmaps_url: string | null;
          latitude: number | null;
          longitude: number | null;
          is_verified: boolean;
          whatsapp_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: 'toko_komponen' | 'service_center';
          address: string;
          city: string;
          gmaps_url?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          is_verified?: boolean;
          whatsapp_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: 'toko_komponen' | 'service_center';
          address?: string;
          city?: string;
          gmaps_url?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          is_verified?: boolean;
          whatsapp_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      qc_test_reports: {
        Row: {
          id: string;
          user_id: string;
          overall_status: 'pass' | 'fail' | 'in_progress';
          results: Json;
          environment: 'simulated' | 'device';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          overall_status: 'pass' | 'fail' | 'in_progress';
          results: Json;
          environment?: 'simulated' | 'device';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          overall_status?: 'pass' | 'fail' | 'in_progress';
          results?: Json;
          environment?: 'simulated' | 'device';
          created_at?: string;
        };
        Relationships: [];
      };
      direct_messages: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          receiver_id?: string;
          content?: string;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      user_presets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          role: string;
          parts: Json;
          qty: number;
          unit_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          role?: string;
          parts?: Json;
          qty?: number;
          unit_total?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          role?: string;
          parts?: Json;
          qty?: number;
          unit_total?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      shared_builds: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      publish_community_post: {
        Args: {
          p_title: string;
          p_content: string;
          p_category?: string;
          p_record_shared_build?: boolean;
        };
        Returns: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          category: string;
          likes_count: number;
          created_at: string;
        }[];
      };
      get_admin_order_stats: {
        Args: Record<string, never>;
        Returns: {
          total_orders: number;
          total_revenue: number;
          pending_qc_count: number;
        }[];
      };
      send_direct_message_with_notification: {
        Args: {
          p_receiver_id: string;
          p_content: string;
        };
        Returns: string;
      };
      get_public_profile_stats: {
        Args: {
          profile_user_id: string;
        };
        Returns: {
          saved_presets: number;
          shared_builds: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
