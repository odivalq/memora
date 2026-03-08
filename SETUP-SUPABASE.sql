-- =====================================================
-- MEMORA - Script de Inicialização do Supabase
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. Desabilitar RLS temporariamente (para criar as tabelas)
ALTER TABLE IF EXISTS categorias DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS entradas DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;

-- 2. Deletar tabelas antigas se existirem
DROP TABLE IF EXISTS entradas CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- TABELA: users
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nickname TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: categorias
-- =====================================================
CREATE TABLE categorias (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nome TEXT NOT NULL,
  icone TEXT DEFAULT '📁',
  cor TEXT DEFAULT '#3366cc',
  descricao TEXT DEFAULT '',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: entradas
-- =====================================================
CREATE TABLE entradas (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  titulo TEXT NOT NULL,
  slug TEXT NOT NULL,
  categoria_id TEXT REFERENCES categorias(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  data_criacao TIMESTAMPTZ DEFAULT NOW(),
  data_atualizacao TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX idx_categorias_user ON categorias(user_id);
CREATE INDEX idx_entradas_categoria ON entradas(categoria_id);
CREATE INDEX idx_entradas_user ON entradas(user_id);
CREATE INDEX idx_entradas_titulo ON entradas(titulo);

-- =====================================================
-- ATIVAR RLS (Row Level Security)
-- =====================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE entradas ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS: Users
-- Cada usuário PODE ver seu próprio registro
-- =====================================================
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- =====================================================
-- POLÍTICAS RLS: Categorias
-- Usuários autenticados PODEM ler todas as categorias
-- Usuários PODEM criar/editar/deletar suas próprias categorias
-- =====================================================
CREATE POLICY "Authenticated users can view all categories" ON categorias
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own categories" ON categorias
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories" ON categorias
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories" ON categorias
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- POLÍTICAS RLS: Entradas
-- Usuários autenticados PODEM ler todas as entradas
-- Usuários PODEM criar/editar/deletar suas próprias entradas
-- =====================================================
CREATE POLICY "Authenticated users can view all entries" ON entradas
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own entries" ON entradas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries" ON entradas
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries" ON entradas
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- Triggers para atualizar timestamps
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER categorias_updated_at BEFORE UPDATE ON categorias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- Função para criar usuário quando nova conta é criada
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, nickname)
  VALUES (new.id, new.email, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- Fim do script
-- =====================================================
-- ✅ Tudo pronto! Agora seu banco está configurado.
