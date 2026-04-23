-- =====================================================
-- MEMORA - Ocultação de entradas por usuário
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- Tabela de ocultações: cada linha representa uma entrada
-- que um usuário optou por não ver mais no seu dashboard.
-- A entrada continua existindo e visível para todos os outros.
CREATE TABLE IF NOT EXISTS entrada_ocultacoes (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entrada_id TEXT NOT NULL REFERENCES entradas(id)   ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, entrada_id)
);

CREATE INDEX IF NOT EXISTS idx_ocultacoes_user    ON entrada_ocultacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_ocultacoes_entrada ON entrada_ocultacoes(entrada_id);

-- RLS
ALTER TABLE entrada_ocultacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário vê suas próprias ocultações"  ON entrada_ocultacoes;
DROP POLICY IF EXISTS "Usuário insere suas próprias ocultações" ON entrada_ocultacoes;
DROP POLICY IF EXISTS "Usuário remove suas próprias ocultações" ON entrada_ocultacoes;

CREATE POLICY "Usuário vê suas próprias ocultações"
  ON entrada_ocultacoes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuário insere suas próprias ocultações"
  ON entrada_ocultacoes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário remove suas próprias ocultações"
  ON entrada_ocultacoes FOR DELETE
  USING (auth.uid() = user_id);
