-- ============================================
-- SCRIPT DE CORREÇÃO: Tabela Users
-- ============================================
-- Este script verifica e corrige problemas na tabela users

-- 1. Verificar colunas da tabela users
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY column_name;

-- 2. Verificar se a coluna email_verified existe
-- Se não existir, vamos adicioná-la
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email_verified'
    ) THEN
        ALTER TABLE public.users ADD COLUMN email_verified BOOLEAN DEFAULT false;
        RAISE NOTICE 'Coluna email_verified adicionada à tabela users';
    ELSE
        RAISE NOTICE 'Coluna email_verified já existe na tabela users';
    END IF;
END $$;

-- 3. Verificar constraints da tabela users
SELECT conname, contype, pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass;

-- 4. Verificar índices da tabela users
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'users';

-- 5. Verificar permissões da tabela users
SELECT relname, relacl 
FROM pg_class 
WHERE relname = 'users';

-- 6. Testar inserção na tabela users (sem trigger)
-- Vamos testar se conseguimos inserir manualmente
INSERT INTO public.users (id, email, nickname, email_verified)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'test@example.com', 'testuser', false)
ON CONFLICT (id) DO NOTHING;

-- 7. Verificar se a inserção funcionou
SELECT * FROM public.users 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 8. Remover o registro de teste
DELETE FROM public.users 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- ============================================
-- FIM - Execute este script e verifique os resultados
-- ============================================