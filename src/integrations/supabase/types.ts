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
      availability: {
        Row: {
          created_at: string
          date: string
          id: string
          photographer_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          photographer_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          photographer_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          amount: number | null
          commission_amount: number | null
          created_at: string
          customer_id: string | null
          delivery_status: string
          escrow_status: string
          event_date: string | null
          gig_id: string | null
          id: string
          inquiry_id: string | null
          photographer_id: string | null
          quote_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          commission_amount?: number | null
          created_at?: string
          customer_id?: string | null
          delivery_status?: string
          escrow_status?: string
          event_date?: string | null
          gig_id?: string | null
          id?: string
          inquiry_id?: string | null
          photographer_id?: string | null
          quote_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          commission_amount?: number | null
          created_at?: string
          customer_id?: string | null
          delivery_status?: string
          escrow_status?: string
          event_date?: string | null
          gig_id?: string | null
          id?: string
          inquiry_id?: string | null
          photographer_id?: string | null
          quote_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          popular: boolean
          slug: string
          state: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          popular?: boolean
          slug: string
          state?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          popular?: boolean
          slug?: string
          state?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string | null
          name: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          booking_id: string | null
          copyright_terms: string | null
          created_at: string
          gig_application_id: string | null
          gig_id: string | null
          id: string
          signed_at: string | null
          signed_by_a: boolean
          signed_by_b: boolean
          template_type: string | null
          terms_json: Json | null
          updated_at: string
          usage_terms: string | null
        }
        Insert: {
          booking_id?: string | null
          copyright_terms?: string | null
          created_at?: string
          gig_application_id?: string | null
          gig_id?: string | null
          id?: string
          signed_at?: string | null
          signed_by_a?: boolean
          signed_by_b?: boolean
          template_type?: string | null
          terms_json?: Json | null
          updated_at?: string
          usage_terms?: string | null
        }
        Update: {
          booking_id?: string | null
          copyright_terms?: string | null
          created_at?: string
          gig_application_id?: string | null
          gig_id?: string | null
          id?: string
          signed_at?: string | null
          signed_by_a?: boolean
          signed_by_b?: boolean
          template_type?: string | null
          terms_json?: Json | null
          updated_at?: string
          usage_terms?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_gig_application_id_fkey"
            columns: ["gig_application_id"]
            isOneToOne: false
            referencedRelation: "gig_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          participant_a: string
          participant_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          participant_a: string
          participant_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          participant_a?: string
          participant_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_participant_a_fkey"
            columns: ["participant_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_b_fkey"
            columns: ["participant_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_milestones: {
        Row: {
          approved_at: string | null
          booking_id: string
          created_at: string
          delivery_link: string | null
          description: string | null
          dispute_reason: string | null
          due_date: string | null
          id: string
          is_final: boolean | null
          note: string | null
          position: number | null
          status: string
          submitted_at: string | null
          title: string
        }
        Insert: {
          approved_at?: string | null
          booking_id: string
          created_at?: string
          delivery_link?: string | null
          description?: string | null
          dispute_reason?: string | null
          due_date?: string | null
          id?: string
          is_final?: boolean | null
          note?: string | null
          position?: number | null
          status?: string
          submitted_at?: string | null
          title: string
        }
        Update: {
          approved_at?: string | null
          booking_id?: string
          created_at?: string
          delivery_link?: string | null
          description?: string | null
          dispute_reason?: string | null
          due_date?: string | null
          id?: string
          is_final?: boolean | null
          note?: string | null
          position?: number | null
          status?: string
          submitted_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_milestones_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          id: string
          name: string
          slug: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      gig_applications: {
        Row: {
          applicant_id: string
          created_at: string
          gig_id: string
          id: string
          message: string | null
          quoted_rate: number | null
          status: string
          updated_at: string
        }
        Insert: {
          applicant_id: string
          created_at?: string
          gig_id: string
          id?: string
          message?: string | null
          quoted_rate?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          created_at?: string
          gig_id?: string
          id?: string
          message?: string | null
          quoted_rate?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gig_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gig_applications_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      gigs: {
        Row: {
          city: string | null
          created_at: string
          day_rate: number | null
          description: string | null
          event_date: string | null
          genre_id: string | null
          id: string
          posted_by: string
          role: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          day_rate?: number | null
          description?: string | null
          event_date?: string | null
          genre_id?: string | null
          id?: string
          posted_by: string
          role: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          day_rate?: number | null
          description?: string | null
          event_date?: string | null
          genre_id?: string | null
          id?: string
          posted_by?: string
          role?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gigs_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gigs_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      image_overrides: {
        Row: {
          alt: string | null
          created_at: string
          credit: string | null
          slot_key: string
          thumb: string | null
          updated_at: string
          updated_by: string | null
          url: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          credit?: string | null
          slot_key: string
          thumb?: string | null
          updated_at?: string
          updated_by?: string | null
          url: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          credit?: string | null
          slot_key?: string
          thumb?: string | null
          updated_at?: string
          updated_by?: string | null
          url?: string
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          budget: number | null
          city: string | null
          created_at: string
          customer_id: string
          event_date: string | null
          event_type: string | null
          id: string
          message: string | null
          photographer_id: string
          status: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          city?: string | null
          created_at?: string
          customer_id: string
          event_date?: string | null
          event_type?: string | null
          id?: string
          message?: string | null
          photographer_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          city?: string | null
          created_at?: string
          customer_id?: string
          event_date?: string | null
          event_type?: string | null
          id?: string
          message?: string | null
          photographer_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: string[]
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          read: boolean
          sender_id: string
        }
        Insert: {
          attachments?: string[]
          body?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id: string
        }
        Update: {
          attachments?: string[]
          body?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string | null
          type?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          created_at: string
          deliverables: string[] | null
          description: string | null
          duration: string | null
          id: string
          photographer_id: string
          price: number | null
          title: string
        }
        Insert: {
          created_at?: string
          deliverables?: string[] | null
          description?: string | null
          duration?: string | null
          id?: string
          photographer_id: string
          price?: number | null
          title: string
        }
        Update: {
          created_at?: string
          deliverables?: string[] | null
          description?: string | null
          duration?: string | null
          id?: string
          photographer_id?: string
          price?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number | null
          booking_id: string | null
          commission_amount: number | null
          created_at: string
          gateway: string | null
          gateway_ref: string | null
          id: string
          payout_status: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          booking_id?: string | null
          commission_amount?: number | null
          created_at?: string
          gateway?: string | null
          gateway_ref?: string | null
          id?: string
          payout_status?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          booking_id?: string | null
          commission_amount?: number | null
          created_at?: string
          gateway?: string | null
          gateway_ref?: string | null
          id?: string
          payout_status?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      photographer_genres: {
        Row: {
          genre_id: string
          photographer_id: string
        }
        Insert: {
          genre_id: string
          photographer_id: string
        }
        Update: {
          genre_id?: string
          photographer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photographer_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photographer_genres_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      photographers: {
        Row: {
          available_for_second_shoots: boolean | null
          base_city: string | null
          bio: string | null
          business_name: string
          claimed: boolean
          claimed_at: string | null
          cover_url: string | null
          created_at: string
          currency: string | null
          day_rate: number | null
          equipment: string[] | null
          featured: boolean | null
          featured_until: string | null
          id: string
          instagram_connected: boolean | null
          instagram_handle: string | null
          invite_status: string
          invited_at: string | null
          is_demo: boolean
          is_published: boolean
          kind: Database["public"]["Enums"]["photographer_kind"]
          languages: string[] | null
          profile_id: string
          rating_avg: number | null
          response_time_hours: number | null
          review_count: number | null
          service_cities: string[] | null
          slug: string
          starting_price: number | null
          team_size: number | null
          verification_source: string | null
          verified: boolean | null
          years_experience: number | null
        }
        Insert: {
          available_for_second_shoots?: boolean | null
          base_city?: string | null
          bio?: string | null
          business_name: string
          claimed?: boolean
          claimed_at?: string | null
          cover_url?: string | null
          created_at?: string
          currency?: string | null
          day_rate?: number | null
          equipment?: string[] | null
          featured?: boolean | null
          featured_until?: string | null
          id?: string
          instagram_connected?: boolean | null
          instagram_handle?: string | null
          invite_status?: string
          invited_at?: string | null
          is_demo?: boolean
          is_published?: boolean
          kind?: Database["public"]["Enums"]["photographer_kind"]
          languages?: string[] | null
          profile_id: string
          rating_avg?: number | null
          response_time_hours?: number | null
          review_count?: number | null
          service_cities?: string[] | null
          slug: string
          starting_price?: number | null
          team_size?: number | null
          verification_source?: string | null
          verified?: boolean | null
          years_experience?: number | null
        }
        Update: {
          available_for_second_shoots?: boolean | null
          base_city?: string | null
          bio?: string | null
          business_name?: string
          claimed?: boolean
          claimed_at?: string | null
          cover_url?: string | null
          created_at?: string
          currency?: string | null
          day_rate?: number | null
          equipment?: string[] | null
          featured?: boolean | null
          featured_until?: string | null
          id?: string
          instagram_connected?: boolean | null
          instagram_handle?: string | null
          invite_status?: string
          invited_at?: string | null
          is_demo?: boolean
          is_published?: boolean
          kind?: Database["public"]["Enums"]["photographer_kind"]
          languages?: string[] | null
          profile_id?: string
          rating_avg?: number | null
          response_time_hours?: number | null
          review_count?: number | null
          service_cities?: string[] | null
          slug?: string
          starting_price?: number | null
          team_size?: number | null
          verification_source?: string | null
          verified?: boolean | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "photographers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          commission_rate: number
          featured_price: number
          id: string
          updated_at: string
        }
        Insert: {
          commission_rate?: number
          featured_price?: number
          id?: string
          updated_at?: string
        }
        Update: {
          commission_rate?: number
          featured_price?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          media_url: string | null
          photographer_id: string
          position: number
          source: string
          thumbnail_url: string | null
          verified: boolean
          verified_at: string | null
          verified_booking_id: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          media_url?: string | null
          photographer_id: string
          position?: number
          source: string
          thumbnail_url?: string | null
          verified?: boolean
          verified_at?: string | null
          verified_booking_id?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          media_url?: string | null
          photographer_id?: string
          position?: number
          source?: string
          thumbnail_url?: string | null
          verified?: boolean
          verified_at?: string | null
          verified_booking_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_verified_booking_id_fkey"
            columns: ["verified_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_reports: {
        Row: {
          created_at: string
          id: string
          portfolio_item_id: string
          reason: string | null
          reporter_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          portfolio_item_id: string
          reason?: string | null
          reporter_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          portfolio_item_id?: string
          reason?: string | null
          reporter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_reports_portfolio_item_id_fkey"
            columns: ["portfolio_item_id"]
            isOneToOne: false
            referencedRelation: "portfolio_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author: string | null
          body: string | null
          category: string | null
          cover_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          body?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          body?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profile_views: {
        Row: {
          id: string
          photographer_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          photographer_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          photographer_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          state: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          state?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          state?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          amount: number
          created_at: string
          id: string
          inquiry_id: string
          notes: string | null
          package_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          inquiry_id: string
          notes?: string | null
          package_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          inquiry_id?: string
          notes?: string | null
          package_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      review_replies: {
        Row: {
          body: string
          created_at: string
          id: string
          review_id: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          review_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          review_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_reports: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          reporter_id: string
          review_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id: string
          review_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id?: string
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_reports_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string | null
          booking_id: string
          created_at: string
          hidden: boolean
          id: string
          photographer_id: string
          rating: number
          reviewer_id: string
          title: string | null
          updated_at: string
          verified: boolean
        }
        Insert: {
          body?: string | null
          booking_id: string
          created_at?: string
          hidden?: boolean
          id?: string
          photographer_id: string
          rating: number
          reviewer_id: string
          title?: string | null
          updated_at?: string
          verified?: boolean
        }
        Update: {
          body?: string | null
          booking_id?: string
          created_at?: string
          hidden?: boolean
          id?: string
          photographer_id?: string
          rating?: number
          reviewer_id?: string
          title?: string | null
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_photographers: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          photographer_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          photographer_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          photographer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_photographers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_photographers_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          gateway: string | null
          gateway_ref: string | null
          id: string
          photographer_id: string
          plan: string
          status: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          gateway?: string | null
          gateway_ref?: string | null
          id?: string
          photographer_id: string
          plan?: string
          status?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          gateway?: string | null
          gateway_ref?: string | null
          id?: string
          photographer_id?: string
          plan?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_or_create_conversation: { Args: { _other: string }; Returns: string }
      get_my_phone: { Args: never; Returns: string }
      get_my_profile: {
        Args: never
        Returns: {
          avatar_url: string | null
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          state: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_public_pricing: {
        Args: never
        Returns: {
          commission_rate: number
          featured_price: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_booking_party: { Args: { _booking_id: string }; Returns: boolean }
      is_conversation_participant: {
        Args: { _conversation_id: string }
        Returns: boolean
      }
      owns_photographer: { Args: { _pid: string }; Returns: boolean }
    }
    Enums: {
      photographer_kind: "freelancer" | "studio" | "both"
      user_role: "customer" | "photographer" | "admin"
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
      photographer_kind: ["freelancer", "studio", "both"],
      user_role: ["customer", "photographer", "admin"],
    },
  },
} as const
