-- ============================================
-- CORREÇÃO: Foreign Key Constraint Error
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- ============================================
-- PASSO 1: Dropar políticas antigas
-- ============================================
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Enable insert for signup" ON users;

-- ============================================
-- PASSO 2: Criar trigger automático
-- ============================================
-- Este trigger cria automaticamente um registro na tabela users
-- quando um novo usuário é criado em auth.users

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- nickname é NOT NULL na tabela, então precisamos inserir algum valor
  -- padrão para que a inserção não falhe. usamos o email como placeholder;
  -- o usuário poderá atualizar depois via front-end.
  INSERT INTO public.users (id, email, email_verified, nickname)
  VALUES (new.id, new.email, false, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PASSO 3: Recriar políticas de RLS
-- ============================================

-- Permitir que usuários leiam seu próprio perfil
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Permitir que usuários atualizem seu próprio perfil
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- OBSERVAÇÃO: INSERT não é mais necessário porque o trigger cuida disso

-- ============================================
-- PASSO 4: Opcional - Popular usuários existentes
-- ============================================
-- Se você já tem usuários criados anterior a este fix,
-- descomente a linha abaixo para populá-los:

-- INSERT INTO public.users (id, email, email_verified)
-- SELECT id, email, false FROM auth.users
-- ON CONFLICT (id) DO NOTHING;

-- ============================================
-- FIM - Agora tente criar uma conta novamente!
-- ============================================
