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
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["app_role"] | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          module: string
          new_value: Json | null
          old_value: Json | null
          summary: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          module: string
          new_value?: Json | null
          old_value?: Json | null
          summary?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          module?: string
          new_value?: Json | null
          old_value?: Json | null
          summary?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      backup_snapshots: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          size_bytes: number | null
          status: string
          storage_path: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
        }
        Relationships: []
      }
      branches: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          delivery_available: boolean
          delivery_charges: number | null
          delivery_radius_km: number | null
          email: string | null
          estimated_delivery_minutes: number | null
          google_maps_link: string | null
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          manager_name: string | null
          minimum_order: number | null
          name: string
          opening_hours: Json
          phone: string | null
          pickup_available: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          delivery_available?: boolean
          delivery_charges?: number | null
          delivery_radius_km?: number | null
          email?: string | null
          estimated_delivery_minutes?: number | null
          google_maps_link?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          manager_name?: string | null
          minimum_order?: number | null
          name: string
          opening_hours?: Json
          phone?: string | null
          pickup_available?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          delivery_available?: boolean
          delivery_charges?: number | null
          delivery_radius_km?: number | null
          email?: string | null
          estimated_delivery_minutes?: number | null
          google_maps_link?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          manager_name?: string | null
          minimum_order?: number | null
          name?: string
          opening_hours?: Json
          phone?: string | null
          pickup_available?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          created_at: string
          discount_pkr: number
          id: string
          order_id: string | null
          user_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          discount_pkr: number
          id?: string
          order_id?: string | null
          user_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          discount_pkr?: number
          id?: string
          order_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          branch_id: string | null
          code: string
          created_at: string
          description: string | null
          discount_type: string
          expires_at: string | null
          flat_pkr: number | null
          id: string
          is_active: boolean
          label: string
          max_discount_pkr: number | null
          min_subtotal_pkr: number
          per_user_limit: number
          percent: number | null
          starts_at: string | null
          updated_at: string
          usage_count: number
          usage_limit: number | null
        }
        Insert: {
          branch_id?: string | null
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          expires_at?: string | null
          flat_pkr?: number | null
          id?: string
          is_active?: boolean
          label: string
          max_discount_pkr?: number | null
          min_subtotal_pkr?: number
          per_user_limit?: number
          percent?: number | null
          starts_at?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Update: {
          branch_id?: string | null
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          expires_at?: string | null
          flat_pkr?: number | null
          id?: string
          is_active?: boolean
          label?: string
          max_discount_pkr?: number | null
          min_subtotal_pkr?: number
          per_user_limit?: number
          percent?: number | null
          starts_at?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_html: string
          body_text: string
          created_at: string
          enabled: boolean
          id: string
          key: string
          name: string
          subject: string
          updated_at: string
          updated_by: string | null
          variables: Json
        }
        Insert: {
          body_html?: string
          body_text?: string
          created_at?: string
          enabled?: boolean
          id?: string
          key: string
          name: string
          subject?: string
          updated_at?: string
          updated_by?: string | null
          variables?: Json
        }
        Update: {
          body_html?: string
          body_text?: string
          created_at?: string
          enabled?: boolean
          id?: string
          key?: string
          name?: string
          subject?: string
          updated_at?: string
          updated_by?: string | null
          variables?: Json
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          level: string
          message: string
          source: string
          stack: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          level?: string
          message: string
          source: string
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          level?: string
          message?: string
          source?: string
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      integration_configs: {
        Row: {
          category: string
          config: Json
          created_at: string
          enabled: boolean
          id: string
          key: string
          last_test_result: Json | null
          last_tested_at: string | null
          mode: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          key: string
          last_test_result?: Json | null
          last_tested_at?: string | null
          mode?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          key?: string
          last_test_result?: Json | null
          last_tested_at?: string | null
          mode?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          label: string
          sort_order: number
          tagline: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id: string
          image_url?: string | null
          is_active?: boolean
          label: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          label?: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      menu_item_sizes: {
        Row: {
          id: string
          item_id: string
          label: string
          price_pkr: number
          size_key: string
          sort_order: number
        }
        Insert: {
          id?: string
          item_id: string
          label: string
          price_pkr: number
          size_key: string
          sort_order?: number
        }
        Update: {
          id?: string
          item_id?: string
          label?: string
          price_pkr?: number
          size_key?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_sizes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          allergens: string[]
          calories: number
          category_id: string
          created_at: string
          gallery_urls: string[]
          id: string
          image_url: string | null
          ingredients: string[]
          is_available: boolean
          is_bestseller: boolean
          is_featured: boolean
          is_hidden: boolean
          long_description: string | null
          name: string
          prep_time_min: number
          price_pkr: number
          rating: number
          reviews_count: number
          short_description: string | null
          sort_order: number
          tags: string[]
          updated_at: string
        }
        Insert: {
          allergens?: string[]
          calories?: number
          category_id: string
          created_at?: string
          gallery_urls?: string[]
          id: string
          image_url?: string | null
          ingredients?: string[]
          is_available?: boolean
          is_bestseller?: boolean
          is_featured?: boolean
          is_hidden?: boolean
          long_description?: string | null
          name: string
          prep_time_min?: number
          price_pkr?: number
          rating?: number
          reviews_count?: number
          short_description?: string | null
          sort_order?: number
          tags?: string[]
          updated_at?: string
        }
        Update: {
          allergens?: string[]
          calories?: number
          category_id?: string
          created_at?: string
          gallery_urls?: string[]
          id?: string
          image_url?: string | null
          ingredients?: string[]
          is_available?: boolean
          is_bestseller?: boolean
          is_featured?: boolean
          is_hidden?: boolean
          long_description?: string | null
          name?: string
          prep_time_min?: number
          price_pkr?: number
          rating?: number
          reviews_count?: number
          short_description?: string | null
          sort_order?: number
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      option_choices: {
        Row: {
          choice_key: string
          group_id: string
          id: string
          label: string
          price_delta_pkr: number
          sort_order: number
        }
        Insert: {
          choice_key: string
          group_id: string
          id?: string
          label: string
          price_delta_pkr?: number
          sort_order?: number
        }
        Update: {
          choice_key?: string
          group_id?: string
          id?: string
          label?: string
          price_delta_pkr?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "option_choices_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "option_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      option_groups: {
        Row: {
          category_id: string | null
          group_key: string
          id: string
          is_required: boolean
          item_id: string | null
          label: string
          selection_type: string
          sort_order: number
        }
        Insert: {
          category_id?: string | null
          group_key: string
          id?: string
          is_required?: boolean
          item_id?: string | null
          label: string
          selection_type: string
          sort_order?: number
        }
        Update: {
          category_id?: string | null
          group_key?: string
          id?: string
          is_required?: boolean
          item_id?: string | null
          label?: string
          selection_type?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "option_groups_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "option_groups_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          name: string
          options: Json | null
          order_id: string
          product_id: string
          qty: number
          unit_price_pkr: number
        }
        Insert: {
          id?: string
          name: string
          options?: Json | null
          order_id: string
          product_id: string
          qty?: number
          unit_price_pkr?: number
        }
        Update: {
          id?: string
          name?: string
          options?: Json | null
          order_id?: string
          product_id?: string
          qty?: number
          unit_price_pkr?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_snapshot: Json | null
          branch_id: string | null
          coupon_code: string | null
          created_at: string
          delivery_fee_pkr: number
          discount_pkr: number
          estimated_delivery_minutes: number | null
          fulfillment_method: string
          id: string
          notes: string | null
          order_number: string
          payment_method: string
          schedule_at: string | null
          special_instructions: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal_pkr: number
          tax_pkr: number
          total_pkr: number
          updated_at: string
          user_id: string
        }
        Insert: {
          address_snapshot?: Json | null
          branch_id?: string | null
          coupon_code?: string | null
          created_at?: string
          delivery_fee_pkr?: number
          discount_pkr?: number
          estimated_delivery_minutes?: number | null
          fulfillment_method?: string
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string
          schedule_at?: string | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_pkr?: number
          tax_pkr?: number
          total_pkr?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          address_snapshot?: Json | null
          branch_id?: string | null
          coupon_code?: string | null
          created_at?: string
          delivery_fee_pkr?: number
          discount_pkr?: number
          estimated_delivery_minutes?: number | null
          fulfillment_method?: string
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string
          schedule_at?: string | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_pkr?: number
          tax_pkr?: number
          total_pkr?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin_notes: string | null
          avatar_url: string | null
          birthday: string | null
          created_at: string
          daddy_pass_renews_at: string | null
          daddy_pass_status: string
          favorite_category: string | null
          full_name: string | null
          id: string
          loyalty_tier: string
          marketing_opt_in: boolean
          phone: string | null
          referral_code: string | null
          referral_count: number
          reward_points: number
          total_orders: number
          total_spend_pkr: number
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          daddy_pass_renews_at?: string | null
          daddy_pass_status?: string
          favorite_category?: string | null
          full_name?: string | null
          id: string
          loyalty_tier?: string
          marketing_opt_in?: boolean
          phone?: string | null
          referral_code?: string | null
          referral_count?: number
          reward_points?: number
          total_orders?: number
          total_spend_pkr?: number
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          daddy_pass_renews_at?: string | null
          daddy_pass_status?: string
          favorite_category?: string | null
          full_name?: string | null
          id?: string
          loyalty_tier?: string
          marketing_opt_in?: boolean
          phone?: string | null
          referral_code?: string | null
          referral_count?: number
          reward_points?: number
          total_orders?: number
          total_spend_pkr?: number
          updated_at?: string
        }
        Relationships: []
      }
      promo_banners: {
        Row: {
          branch_id: string | null
          created_at: string
          cta_link: string | null
          cta_text: string | null
          desktop_image_url: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          mobile_image_url: string | null
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          desktop_image_url?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          mobile_image_url?: string | null
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          desktop_image_url?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          mobile_image_url?: string | null
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      restaurant_settings: {
        Row: {
          brand_assets: Json
          business_hours: Json
          contact_info: Json
          created_at: string
          delivery_settings: Json
          id: string
          maintenance_mode: Json
          restaurant_info: Json
          seo_settings: Json
          singleton: boolean
          social_media: Json
          tax_settings: Json
          updated_at: string
        }
        Insert: {
          brand_assets?: Json
          business_hours?: Json
          contact_info?: Json
          created_at?: string
          delivery_settings?: Json
          id?: string
          maintenance_mode?: Json
          restaurant_info?: Json
          seo_settings?: Json
          singleton?: boolean
          social_media?: Json
          tax_settings?: Json
          updated_at?: string
        }
        Update: {
          brand_assets?: Json
          business_hours?: Json
          contact_info?: Json
          created_at?: string
          delivery_settings?: Json
          id?: string
          maintenance_mode?: Json
          restaurant_info?: Json
          seo_settings?: Json
          singleton?: boolean
          social_media?: Json
          tax_settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          branch_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          branch_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          branch_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          full_name: string | null
          invited_by: string | null
          last_login_at: string | null
          notes: string | null
          phone: string | null
          status: string
          suspended_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          full_name?: string | null
          invited_by?: string | null
          last_login_at?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          suspended_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          full_name?: string | null
          invited_by?: string | null
          last_login_at?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          suspended_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_addresses: {
        Row: {
          address_line: string
          area: string | null
          city: string
          created_at: string
          id: string
          is_default: boolean
          label: string
          notes: string | null
          phone: string | null
          recipient_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line: string
          area?: string | null
          city: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          notes?: string | null
          phone?: string | null
          recipient_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line?: string
          area?: string | null
          city?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          notes?: string | null
          phone?: string | null
          recipient_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          branch_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          branch_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          branch_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempt: number
          created_at: string
          endpoint_id: string | null
          error: string | null
          event: string
          id: string
          payload: Json | null
          provider: string
          response_body: string | null
          response_code: number | null
          status: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          endpoint_id?: string | null
          error?: string | null
          event: string
          id?: string
          payload?: Json | null
          provider: string
          response_body?: string | null
          response_code?: number | null
          status?: string
        }
        Update: {
          attempt?: number
          created_at?: string
          endpoint_id?: string | null
          error?: string | null
          event?: string
          id?: string
          payload?: Json | null
          provider?: string
          response_body?: string | null
          response_code?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          created_at: string
          enabled: boolean
          events: string[]
          id: string
          label: string
          last_delivered_at: string | null
          last_status: string | null
          provider: string
          secret_hint: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          events?: string[]
          id?: string
          label: string
          last_delivered_at?: string | null
          last_status?: string | null
          provider: string
          secret_hint?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          events?: string[]
          id?: string
          label?: string
          last_delivered_at?: string | null
          last_status?: string | null
          provider?: string
          secret_hint?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_top_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      generate_referral_code: { Args: never; Returns: string }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "owner"
        | "admin"
        | "manager"
        | "kitchen"
        | "cashier"
        | "rider"
        | "support"
        | "customer"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
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
      app_role: [
        "owner",
        "admin",
        "manager",
        "kitchen",
        "cashier",
        "rider",
        "support",
        "customer",
      ],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
    },
  },
} as const
