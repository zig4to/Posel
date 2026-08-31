// Ročno napisani tipi, ki ustrezajo supabase/migrations/0001_init.sql.
// Če imaš nameščen Supabase CLI, jih lahko kasneje nadomestiš z generiranimi:
//   supabase gen types typescript --project-id <id> > src/lib/types/database.types.ts

export type Database = {
  public: {
    Tables: {
      clients: {
        Relationships: [];
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          contact_person: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          company_name: string;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          color: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_name?: string;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      work_entries: {
        Relationships: [
          {
            foreignKeyName: "work_entries_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          }
        ];
        Row: {
          id: string;
          user_id: string;
          client_id: string;
          work_date: string;
          start_time: string | null;
          end_time: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          client_id: string;
          work_date: string;
          start_time?: string | null;
          end_time?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          client_id?: string;
          work_date?: string;
          start_time?: string | null;
          end_time?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
export type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];

export type WorkEntry = Database["public"]["Tables"]["work_entries"]["Row"];
export type WorkEntryInsert =
  Database["public"]["Tables"]["work_entries"]["Insert"];
export type WorkEntryUpdate =
  Database["public"]["Tables"]["work_entries"]["Update"];

export type WorkEntryWithClient = WorkEntry & {
  clients: Pick<Client, "id" | "company_name" | "color"> | null;
};
