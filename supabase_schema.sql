-- ============================================================================
-- SCHEMA SQL PARA SUPABASE — BANCO DE DADOS DE PERÍCIAS SOCIOECONÔMICAS
-- Visum Social / BPC / LOAS — Justiça Federal do Amapá (TRF1)
-- ============================================================================
-- Instruções:
--   1. Crie uma conta gratuita em https://supabase.com
--   2. Crie um novo projeto (escolha região São Paulo - sa-east-1)
--   3. Vá em SQL Editor e cole este script inteiro, depois clique em "Run"
--   4. Copie a URL do projeto e a chave anon (Settings > API) e cole no db.js
-- ============================================================================

-- Tabela principal de perícias
CREATE TABLE IF NOT EXISTS pericias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Campos de identificação rápida (indexados para busca)
  numero_processo TEXT DEFAULT '',
  nome_periciado TEXT DEFAULT '',
  cpf_periciado TEXT DEFAULT '',
  municipio TEXT DEFAULT '',
  uf TEXT DEFAULT 'AP',

  -- Status do laudo
  status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'concluido', 'enviado', 'arquivado')),

  -- Dados completos do formulário (JSONB = busca flexível e eficiente)
  form_data JSONB NOT NULL DEFAULT '{}',

  -- Metadados do perito
  perito_nome TEXT DEFAULT 'Ivonete Ferreira Maciel',
  perito_cress TEXT DEFAULT 'CRESS 104 24ª Região-AP',

  -- Valores calculados (para busca e relatórios rápidos)
  renda_total NUMERIC(12,2) DEFAULT 0,
  renda_per_capita NUMERIC(12,2) DEFAULT 0,
  parecer_favoravel BOOLEAN DEFAULT true,

  -- Observações livres
  observacoes TEXT DEFAULT ''
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_pericias_processo ON pericias (numero_processo);
CREATE INDEX IF NOT EXISTS idx_pericias_cpf ON pericias (cpf_periciado);
CREATE INDEX IF NOT EXISTS idx_pericias_nome ON pericias USING gin (nome_periciado gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_pericias_status ON pericias (status);
CREATE INDEX IF NOT EXISTS idx_pericias_created ON pericias (created_at DESC);

-- Extensão para busca por similaridade de nomes (necessária para o índice GIN acima)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Recria o índice GIN após a extensão estar habilitada
DROP INDEX IF EXISTS idx_pericias_nome;
CREATE INDEX IF NOT EXISTS idx_pericias_nome ON pericias USING gin (nome_periciado gin_trgm_ops);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pericias ON pericias;
CREATE TRIGGER trigger_update_pericias
  BEFORE UPDATE ON pericias
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) — Acesso público para leitura e escrita
-- (Para um ambiente de produção, restrinja via auth.uid() ou roles)
-- ============================================================================
ALTER TABLE pericias ENABLE ROW LEVEL SECURITY;

-- Política: qualquer pessoa pode ler todas as perícias
CREATE POLICY "Leitura pública de perícias"
  ON pericias FOR SELECT
  USING (true);

-- Política: qualquer pessoa pode inserir novas perícias
CREATE POLICY "Inserção pública de perícias"
  ON pericias FOR INSERT
  WITH CHECK (true);

-- Política: qualquer pessoa pode atualizar perícias
CREATE POLICY "Atualização pública de perícias"
  ON pericias FOR UPDATE
  USING (true);

-- Política: qualquer pessoa pode deletar perícias
CREATE POLICY "Deleção pública de perícias"
  ON pericias FOR DELETE
  USING (true);
