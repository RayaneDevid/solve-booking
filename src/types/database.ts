export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          role: 'admin' | 'user'
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          username: string
          role?: 'admin' | 'user'
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          role?: 'admin' | 'user'
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          id: string
          user_id: string
          date: string
          start_time: string
          end_time: string
          note: string | null
          status: 'pending' | 'accepted' | 'refused'
          assigned_server: number | null
          server_password: string | null
          refusal_reason: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          start_time: string
          end_time: string
          note?: string | null
          status?: 'pending' | 'accepted' | 'refused'
          assigned_server?: number | null
          server_password?: string | null
          refusal_reason?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          start_time?: string
          end_time?: string
          note?: string | null
          status?: 'pending' | 'accepted' | 'refused'
          assigned_server?: number | null
          server_password?: string | null
          refusal_reason?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Reservation = Database['public']['Tables']['reservations']['Row']
export type ReservationInsert = Database['public']['Tables']['reservations']['Insert']
export type ReservationUpdate = Database['public']['Tables']['reservations']['Update']
