-- ============================================
-- TABELA: users (Dados Adicionais)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nickname TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  email_verified BOOLEAN DEFAULT FALSE
);

-- Criar índices para busca rápida
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_nickname ON users(nickname);

-- ============================================
-- POLÍTICAS DE SEGURANÇA (RLS)
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Usuários podem ler seu próprio perfil
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Usuários podem atualizar seu próprio perfil
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Ao criar novos usuários (via signup), permitir insert
CREATE POLICY "Enable insert for signup" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

 -- ============================================
-- ACRESCENTANDO NOVAS POLITICAS
-- ============================================ 
-- Replace the restrictive policy
DROP POLICY IF EXISTS "Enable insert for signup" ON users;
CREATE POLICY "Enable insert for signup" ON users
  FOR INSERT WITH CHECK (true);  -- Allow during signup process