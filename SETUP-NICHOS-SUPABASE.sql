-- =====================================================
-- MEMORA - Script de Implementação de Nichos
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. Desabilitar RLS temporariamente para fazer alterações
ALTER TABLE IF EXISTS categorias DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS entradas DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS nichos DISABLE ROW LEVEL SECURITY;

-- 2. Criar tabela de nichos (se ainda não existir)
CREATE TABLE IF NOT EXISTS nichos (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nome TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  icone TEXT DEFAULT '🏠',
  cor TEXT DEFAULT '#3366cc',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Adicionar coluna nicho_id às tabelas existentes (se ainda não existir)
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS nicho_id TEXT REFERENCES nichos(id) ON DELETE CASCADE;
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS nicho_id TEXT REFERENCES nichos(id) ON DELETE CASCADE;

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_nichos_user ON nichos(user_id);
CREATE INDEX IF NOT EXISTS idx_categorias_nicho ON categorias(nicho_id);
CREATE INDEX IF NOT EXISTS idx_entradas_nicho ON entradas(nicho_id);

-- 5. Atualizar políticas RLS para incluir nicho_id

-- Políticas RLS: Nichos
DROP POLICY IF EXISTS "Users can view own nichos" ON nichos;
DROP POLICY IF EXISTS "Users can insert own nichos" ON nichos;
DROP POLICY IF EXISTS "Users can update own nichos" ON nichos;
DROP POLICY IF EXISTS "Users can delete own nichos" ON nichos;

CREATE POLICY "Users can view own nichos" ON nichos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own nichos" ON nichos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own nichos" ON nichos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own nichos" ON nichos
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS: Categorias (atualizadas para incluir nicho)
DROP POLICY IF EXISTS "Authenticated users can view all categories" ON categorias;
DROP POLICY IF EXISTS "Users can insert own categories" ON categorias;
DROP POLICY IF EXISTS "Users can update own categories" ON categorias;
DROP POLICY IF EXISTS "Users can delete own categories" ON categorias;

CREATE POLICY "Users can view categories from own nichos" ON categorias
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nichos 
      WHERE nichos.id = categorias.nicho_id 
      AND nichos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert categories in own nichos" ON categorias
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM nichos 
      WHERE nichos.id = categorias.nicho_id 
      AND nichos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update categories in own nichos" ON categorias
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM nichos 
      WHERE nichos.id = categorias.nicho_id 
      AND nichos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete categories in own nichos" ON categorias
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM nichos 
      WHERE nichos.id = categorias.nicho_id 
      AND nichos.user_id = auth.uid()
    )
  );

-- Políticas RLS: Entradas (atualizadas para incluir nicho)
DROP POLICY IF EXISTS "Authenticated users can view all entries" ON entradas;
DROP POLICY IF EXISTS "Users can insert own entries" ON entradas;
DROP POLICY IF EXISTS "Users can update own entries" ON entradas;
DROP POLICY IF EXISTS "Users can delete own entries" ON entradas;

CREATE POLICY "Users can view entries from own nichos" ON entradas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nichos 
      WHERE nichos.id = entradas.nicho_id 
      AND nichos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert entries in own nichos" ON entradas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM nichos 
      WHERE nichos.id = entradas.nicho_id 
      AND nichos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update entries in own nichos" ON entradas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM nichos 
      WHERE nichos.id = entradas.nicho_id 
      AND nichos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete entries in own nichos" ON entradas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM nichos 
      WHERE nichos.id = entradas.nicho_id 
      AND nichos.user_id = auth.uid()
    )
  );

-- 6. Ativar RLS nas tabelas
ALTER TABLE nichos ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE entradas ENABLE ROW LEVEL SECURITY;

-- 7. Trigger para atualizar timestamps
DROP TRIGGER IF EXISTS nichos_updated_at ON nichos;
CREATE TRIGGER nichos_updated_at BEFORE UPDATE ON nichos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 8. Função de migração de dados existentes
CREATE OR REPLACE FUNCTION migrar_dados_para_nichos()
RETURNS void AS $$
DECLARE
  usuario_id UUID;
  nicho_id TEXT;
BEGIN
  -- Obter o ID do primeiro usuário cadastrado
  SELECT id INTO usuario_id FROM auth.users LIMIT 1;
  
  IF usuario_id IS NOT NULL THEN
    -- Criar nicho padrão "Geral" para o usuário
    nicho_id := gen_random_uuid()::text;
    
    INSERT INTO nichos (id, nome, descricao, icone, cor, user_id)
    VALUES (nicho_id, 'Geral', 'Nicho padrão com dados migrados', '📚', '#3366cc', usuario_id);
    
    -- Migrar categorias existentes para o nicho
    UPDATE categorias 
    SET nicho_id = nicho_id 
    WHERE nicho_id IS NULL;
    
    -- Migrar entradas existentes para o nicho
    UPDATE entradas 
    SET nicho_id = nicho_id 
    WHERE nicho_id IS NULL;
    
    RAISE NOTICE 'Dados migrados para nicho % do usuário %', nicho_id, usuario_id;
  ELSE
    RAISE NOTICE 'Nenhum usuário encontrado para migração';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 9. Executar migração (comentado para executar manualmente)
-- SELECT migrar_dados_para_nichos();

-- =====================================================
-- Fim do script
-- =====================================================
-- ✅ Estrutura de nichos configurada!
-- ⚠️ Execute manualmente: SELECT migrar_dados_para_nichos();