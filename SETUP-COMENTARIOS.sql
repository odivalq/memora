-- =====================================================
-- MEMORA - Comentários em Entradas
-- Execute no Supabase SQL Editor
-- Pré-requisito: SETUP-SUPABASE.sql + SETUP-NICHOS-SUPABASE.sql + SETUP-COMPARTILHAMENTO.sql
-- =====================================================


-- =====================================================
-- SEÇÃO 1: TABELA DE COMENTÁRIOS
-- entradas.id e nichos.id são TEXT (não UUID) neste projeto
-- parent_id NULL = comentário raiz; não-nulo = resposta
-- =====================================================

CREATE TABLE IF NOT EXISTS comentarios (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  entrada_id TEXT NOT NULL REFERENCES entradas(id) ON DELETE CASCADE,
  nicho_id   TEXT NOT NULL REFERENCES nichos(id)   ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id  TEXT REFERENCES comentarios(id)         ON DELETE CASCADE,
  conteudo   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comentarios_entrada  ON comentarios(entrada_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_parent   ON comentarios(parent_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_user     ON comentarios(user_id);


-- REPLICA IDENTITY FULL: garante que payloads de DELETE via Realtime
-- incluam todas as colunas (parent_id, user_id, etc.), não apenas o PK.
ALTER TABLE comentarios REPLICA IDENTITY FULL;


-- =====================================================
-- SEÇÃO 2: TRIGGER updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS comentarios_updated_at ON comentarios;
CREATE TRIGGER comentarios_updated_at
  BEFORE UPDATE ON comentarios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =====================================================
-- SEÇÃO 3: ROW LEVEL SECURITY
-- Acesso espelhado nas políticas de entradas:
--   nicho owner OU membro da tabela nicho_membros
-- =====================================================

ALTER TABLE comentarios ENABLE ROW LEVEL SECURITY;

-- Helper reutilizado pelas políticas abaixo
-- (mesmo padrão já usado em entradas / categorias)
CREATE OR REPLACE FUNCTION _pode_acessar_nicho(p_nicho_id TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM nichos
    WHERE nichos.id = p_nicho_id
      AND (
        nichos.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM nicho_membros
          WHERE nicho_membros.nicho_id = nichos.id
            AND nicho_membros.user_id  = auth.uid()
        )
      )
  );
$$;

-- SELECT: owner ou membro do nicho
DROP POLICY IF EXISTS "Ler comentários de nichos acessíveis" ON comentarios;
CREATE POLICY "Ler comentários de nichos acessíveis"
  ON comentarios FOR SELECT
  USING (_pode_acessar_nicho(nicho_id));

-- INSERT: owner ou membro do nicho
DROP POLICY IF EXISTS "Inserir comentários em nichos acessíveis" ON comentarios;
CREATE POLICY "Inserir comentários em nichos acessíveis"
  ON comentarios FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND _pode_acessar_nicho(nicho_id)
  );

-- UPDATE: apenas o próprio autor
DROP POLICY IF EXISTS "Atualizar próprios comentários" ON comentarios;
CREATE POLICY "Atualizar próprios comentários"
  ON comentarios FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: apenas o próprio autor
DROP POLICY IF EXISTS "Deletar próprios comentários" ON comentarios;
CREATE POLICY "Deletar próprios comentários"
  ON comentarios FOR DELETE
  USING (auth.uid() = user_id);
