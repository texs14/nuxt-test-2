export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      dictionary: {
        Row: {
          id: number;
          word_th: string;
          translation: string[];
          synonyms: string[] | null;
          links: string[] | null;
          transcription_en: string | null;
          examples: Json[] | null;
          antonyms: string[] | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          word_th: string;
          translation: string[];
          synonyms?: string[] | null;
          links?: string[] | null;
          transcription_en?: string | null;
          examples?: Json[] | null;
          antonyms?: string[] | null;
          created_at?: string | null;
        };
        Update: {
          id?: number;
          word_th?: string;
          translation?: string[];
          synonyms?: string[] | null;
          links?: string[] | null;
          transcription_en?: string | null;
          examples?: Json[] | null;
          antonyms?: string[] | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      new_dictionar: {
        Row: {
          entry_id: string;
          headword: Json;
          metadata: Json | null;
          senses: Json;
          related: Json | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          entry_id: string;
          headword: Json;
          metadata?: Json | null;
          senses: Json;
          related?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          entry_id?: string;
          headword?: Json;
          metadata?: Json | null;
          senses?: Json;
          related?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          username: string | null;
          age: number | null;
          first_name: string | null;
          last_name: string | null;
          avatar_url: string | null;
          city: string | null;
          vocabulary: number[];
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          username?: string | null;
          age?: number | null;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          city?: string | null;
          vocabulary?: number[];
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string | null;
          age?: number | null;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          city?: string | null;
          vocabulary?: number[];
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
