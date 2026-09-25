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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          cidade: string | null
          cpf_cnpj: string | null
          created_at: string
          data_instalacao: string | null
          email: string | null
          endereco: string | null
          id: string
          marca_equipamento: string | null
          modelo_reservatorio: string | null
          nome: string
          observacoes: string | null
          origem_lead: string | null
          qtd_banheiros: number | null
          qtd_coletores: number | null
          qtd_pessoas: number | null
          status: string
          tamanho_piscina_m2: number | null
          tecnico_id: string | null
          tipo: string
          tipo_sistema: string
          tipo_telhado: string | null
          ultimo_contato: string | null
          valor_orcamento: number
          valor_pago: number | null
          whatsapp: string | null
        }
        Insert: {
          cidade?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          data_instalacao?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          marca_equipamento?: string | null
          modelo_reservatorio?: string | null
          nome: string
          observacoes?: string | null
          origem_lead?: string | null
          qtd_banheiros?: number | null
          qtd_coletores?: number | null
          qtd_pessoas?: number | null
          status?: string
          tamanho_piscina_m2?: number | null
          tecnico_id?: string | null
          tipo?: string
          tipo_sistema?: string
          tipo_telhado?: string | null
          ultimo_contato?: string | null
          valor_orcamento?: number
          valor_pago?: number | null
          whatsapp?: string | null
        }
        Update: {
          cidade?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          data_instalacao?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          marca_equipamento?: string | null
          modelo_reservatorio?: string | null
          nome?: string
          observacoes?: string | null
          origem_lead?: string | null
          qtd_banheiros?: number | null
          qtd_coletores?: number | null
          qtd_pessoas?: number | null
          status?: string
          tamanho_piscina_m2?: number | null
          tecnico_id?: string | null
          tipo?: string
          tipo_sistema?: string
          tipo_telhado?: string | null
          ultimo_contato?: string | null
          valor_orcamento?: number
          valor_pago?: number | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "tecnicos"
            referencedColumns: ["id"]
          },
        ]
      }
      gastos: {
        Row: {
          categoria: string
          cliente_id: string | null
          created_at: string
          data: string
          descricao: string
          id: string
          observacoes: string | null
          tecnico_id: string | null
          tipo: string
          valor: number
        }
        Insert: {
          categoria?: string
          cliente_id?: string | null
          created_at?: string
          data?: string
          descricao: string
          id?: string
          observacoes?: string | null
          tecnico_id?: string | null
          tipo?: string
          valor?: number
        }
        Update: {
          categoria?: string
          cliente_id?: string | null
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          observacoes?: string | null
          tecnico_id?: string | null
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "gastos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "tecnicos"
            referencedColumns: ["id"]
          },
        ]
      }
      interacoes: {
        Row: {
          cliente_id: string
          created_at: string
          data_interacao: string
          data_proximo_contato: string | null
          descricao: string
          id: string
          proximo_passo: string | null
          tipo: string
          usuario: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_interacao?: string
          data_proximo_contato?: string | null
          descricao: string
          id?: string
          proximo_passo?: string | null
          tipo?: string
          usuario?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_interacao?: string
          data_proximo_contato?: string | null
          descricao?: string
          id?: string
          proximo_passo?: string | null
          tipo?: string
          usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      manutencoes: {
        Row: {
          cliente_id: string
          created_at: string
          custo: number
          data_manutencao: string
          descricao: string | null
          id: string
          observacoes: string | null
          proxima_manutencao: string | null
          status: string
          tecnico_id: string | null
          tipo: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          custo?: number
          data_manutencao?: string
          descricao?: string | null
          id?: string
          observacoes?: string | null
          proxima_manutencao?: string | null
          status?: string
          tecnico_id?: string | null
          tipo?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          custo?: number
          data_manutencao?: string
          descricao?: string | null
          id?: string
          observacoes?: string | null
          proxima_manutencao?: string | null
          status?: string
          tecnico_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutencoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "tecnicos"
            referencedColumns: ["id"]
          },
        ]
      }
      tecnicos: {
        Row: {
          created_at: string
          custo_mensal: number | null
          especialidade: string
          id: string
          nome: string
          status: string
          telefone: string | null
        }
        Insert: {
          created_at?: string
          custo_mensal?: number | null
          especialidade?: string
          id?: string
          nome: string
          status?: string
          telefone?: string | null
        }
        Update: {
          created_at?: string
          custo_mensal?: number | null
          especialidade?: string
          id?: string
          nome?: string
          status?: string
          telefone?: string | null
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
