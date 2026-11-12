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
      configuracoes: {
        Row: {
          cadencia: Database["public"]["Enums"]["cadencia"]
          id: string
          quantidade: number
          updated_at: string
          user_id: string
          webhook_url: string | null
        }
        Insert: {
          cadencia?: Database["public"]["Enums"]["cadencia"]
          id?: string
          quantidade?: number
          updated_at?: string
          user_id: string
          webhook_url?: string | null
        }
        Update: {
          cadencia?: Database["public"]["Enums"]["cadencia"]
          id?: string
          quantidade?: number
          updated_at?: string
          user_id?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      notas: {
        Row: {
          atividade_comentario: string
          atividade_nota: number
          created_at: string
          experiencia_comentario: string
          experiencia_nota: number
          headline_comentario: string
          headline_nota: number
          id: string
          nota_geral: number
          resumo_comentario: string
          resumo_nota: number
          user_id: string
        }
        Insert: {
          atividade_comentario: string
          atividade_nota: number
          created_at?: string
          experiencia_comentario: string
          experiencia_nota: number
          headline_comentario: string
          headline_nota: number
          id?: string
          nota_geral: number
          resumo_comentario: string
          resumo_nota: number
          user_id: string
        }
        Update: {
          atividade_comentario?: string
          atividade_nota?: number
          created_at?: string
          experiencia_comentario?: string
          experiencia_nota?: number
          headline_comentario?: string
          headline_nota?: number
          id?: string
          nota_geral?: number
          resumo_comentario?: string
          resumo_nota?: number
          user_id?: string
        }
        Relationships: []
      }
      perfis_contexto: {
        Row: {
          concluido_em: string | null
          created_at: string
          id: string
          respostas: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          concluido_em?: string | null
          created_at?: string
          id?: string
          respostas?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          concluido_em?: string | null
          created_at?: string
          id?: string
          respostas?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          corpo: string
          created_at: string
          cta: string
          data_agendamento: string | null
          formato: Database["public"]["Enums"]["post_formato"]
          hook: string
          id: string
          status: Database["public"]["Enums"]["post_status"]
          tema: string
          updated_at: string
          user_id: string
          visual_sugestao: string | null
        }
        Insert: {
          corpo: string
          created_at?: string
          cta: string
          data_agendamento?: string | null
          formato?: Database["public"]["Enums"]["post_formato"]
          hook: string
          id?: string
          status?: Database["public"]["Enums"]["post_status"]
          tema: string
          updated_at?: string
          user_id: string
          visual_sugestao?: string | null
        }
        Update: {
          corpo?: string
          created_at?: string
          cta?: string
          data_agendamento?: string | null
          formato?: Database["public"]["Enums"]["post_formato"]
          hook?: string
          id?: string
          status?: Database["public"]["Enums"]["post_status"]
          tema?: string
          updated_at?: string
          user_id?: string
          visual_sugestao?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      cadencia: "semanal" | "quinzenal" | "mensal" | "personalizado"
      post_formato: "texto" | "carrossel" | "imagem"
      post_status:
        | "pendente_revisao"
        | "aprovado"
        | "rejeitado"
        | "aprovado_editado"
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
  public: {
    Enums: {
      cadencia: ["semanal", "quinzenal", "mensal", "personalizado"],
      post_formato: ["texto", "carrossel", "imagem"],
      post_status: [
        "pendente_revisao",
        "aprovado",
        "rejeitado",
        "aprovado_editado",
      ],
    },
  },
} as const
