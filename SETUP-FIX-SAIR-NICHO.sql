-- =====================================================
-- MEMORA - Fix: política DELETE em nicho_membros
-- Execute este SQL no Supabase SQL Editor
-- Pré-requisito: SETUP-COMPARTILHAMENTO.sql já executado
-- =====================================================
--
-- O setup original não criou política FOR DELETE em
-- nicho_membros porque todas as mutações eram feitas via
-- stored procedures SECURITY DEFINER. A feature "Sair do
-- nicho" faz um DELETE direto pelo cliente, então precisa
-- desta política.
--
-- Escopo: cada membro só pode remover sua própria linha.
-- O dono do nicho não está em nicho_membros, portanto
-- esta política não afeta a posse do nicho.
-- =====================================================

DROP POLICY IF EXISTS "Membros podem sair do nicho" ON nicho_membros;

CREATE POLICY "Membros podem sair do nicho"
  ON nicho_membros FOR DELETE
  USING (user_id = auth.uid());
