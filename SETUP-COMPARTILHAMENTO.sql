-- =====================================================
-- MEMORA - Fase 1: Sistema de Compartilhamento de Nichos
-- Execute no Supabase SQL Editor
-- Pré-requisito: SETUP-SUPABASE.sql + SETUP-NICHOS-SUPABASE.sql
-- =====================================================


-- =====================================================
-- SEÇÃO 1: NOVAS COLUNAS EM TABELAS EXISTENTES
-- Rastreia quem fez a última edição — base para o
-- "last edited by [nickname]" que será exibido na Fase 5
-- =====================================================

ALTER TABLE categorias ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE entradas    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;


-- =====================================================
-- SEÇÃO 2: NOVAS TABELAS
-- =====================================================

-- Membros de nichos compartilhados.
-- `role` está pronta para o sistema de permissões futuro;
-- por ora todos os membros são 'editor'.
CREATE TABLE IF NOT EXISTS nicho_membros (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nicho_id      TEXT        NOT NULL REFERENCES nichos(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT        NOT NULL DEFAULT 'editor',
  convidado_por UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nicho_id, user_id)
);

-- Convites pendentes e histórico de convites.
-- O índice parcial abaixo garante que exista no máximo
-- um convite PENDENTE por par (nicho, destinatário).
CREATE TABLE IF NOT EXISTS convites (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nicho_id      TEXT        NOT NULL REFERENCES nichos(id) ON DELETE CASCADE,
  de_user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  para_user_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        TEXT        NOT NULL DEFAULT 'pendente'
                            CHECK (status IN ('pendente', 'aceito', 'recusado')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Apenas um convite pendente por (nicho, destinatário)
CREATE UNIQUE INDEX IF NOT EXISTS idx_convites_pending_unique
  ON convites(nicho_id, para_user_id)
  WHERE status = 'pendente';

-- Notificações in-app.
-- `payload` é JSONB para acomodar diferentes tipos de notificação
-- sem precisar de colunas específicas por tipo.
CREATE TABLE IF NOT EXISTS notificacoes (
  id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo       TEXT        NOT NULL,
  payload    JSONB       NOT NULL DEFAULT '{}',
  lida       BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- =====================================================
-- SEÇÃO 3: ÍNDICES DE PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_nicho_membros_user  ON nicho_membros(user_id);
CREATE INDEX IF NOT EXISTS idx_nicho_membros_nicho ON nicho_membros(nicho_id);
CREATE INDEX IF NOT EXISTS idx_convites_para_user  ON convites(para_user_id);
CREATE INDEX IF NOT EXISTS idx_convites_de_user    ON convites(de_user_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_user   ON notificacoes(user_id);
-- Índice filtrado: acelera a contagem de não-lidas para o badge do sino
CREATE INDEX IF NOT EXISTS idx_notificacoes_unread ON notificacoes(user_id) WHERE lida = false;


-- =====================================================
-- SEÇÃO 4: TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS convites_updated_at ON convites;
CREATE TRIGGER convites_updated_at BEFORE UPDATE ON convites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =====================================================
-- SEÇÃO 5: ATIVAR RLS NAS NOVAS TABELAS
-- =====================================================

ALTER TABLE nicho_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE convites      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes  ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- SEÇÃO 6: POLÍTICAS RLS — NOVAS TABELAS
-- Todas as mutações nessas tabelas ocorrem via stored
-- procedures SECURITY DEFINER, então políticas de
-- SELECT, UPDATE e DELETE para o cliente são suficientes.
-- =====================================================

-- nicho_membros: membro vê sua própria membresia;
-- dono do nicho vê todos os membros do seu nicho.
DROP POLICY IF EXISTS "Membros podem ver suas próprias membresias" ON nicho_membros;
CREATE POLICY "Membros podem ver suas próprias membresias" ON nicho_membros
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM nichos
      WHERE nichos.id = nicho_membros.nicho_id
      AND nichos.user_id = auth.uid()
    )
  );

-- convites: remetente e destinatário podem ler.
DROP POLICY IF EXISTS "Usuários podem ver seus convites" ON convites;
CREATE POLICY "Usuários podem ver seus convites" ON convites
  FOR SELECT USING (
    de_user_id = auth.uid() OR para_user_id = auth.uid()
  );

-- notificacoes: somente o destinatário lê, atualiza e deleta.
DROP POLICY IF EXISTS "Usuários podem ver suas notificações" ON notificacoes;
CREATE POLICY "Usuários podem ver suas notificações" ON notificacoes
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuários podem atualizar suas notificações" ON notificacoes;
CREATE POLICY "Usuários podem atualizar suas notificações" ON notificacoes
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuários podem deletar suas notificações" ON notificacoes;
CREATE POLICY "Usuários podem deletar suas notificações" ON notificacoes
  FOR DELETE USING (user_id = auth.uid());


-- =====================================================
-- SEÇÃO 7: ATUALIZAR POLÍTICA RLS — USERS
-- Adiciona leitura para todos os usuários autenticados,
-- necessária para o autocomplete de busca por nickname.
-- (A política existente de UPDATE permanece inalterada.)
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can search other users" ON users;
CREATE POLICY "Authenticated users can search other users" ON users
  FOR SELECT USING (auth.role() = 'authenticated');


-- =====================================================
-- SEÇÃO 8: ATUALIZAR POLÍTICAS RLS — NICHOS
-- Membros agora enxergam nichos compartilhados com eles.
-- UPDATE e DELETE permanecem exclusivos do dono.
--
-- IMPORTANTE: a política de nichos NÃO pode usar um EXISTS
-- direto em nicho_membros, pois a política de nicho_membros
-- faz o caminho inverso (nichos → nicho_membros → nichos),
-- causando recursão infinita (código 42P17).
-- A solução é uma função SECURITY DEFINER que acessa
-- nicho_membros sem passar por RLS, quebrando o ciclo.
-- =====================================================

-- Helper: verifica membresia diretamente, sem RLS (quebra a dependência circular)
CREATE OR REPLACE FUNCTION _check_nicho_membership(p_nicho_id TEXT, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM nicho_membros
    WHERE nicho_id = p_nicho_id AND user_id = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "Users can view own nichos" ON nichos;
DROP POLICY IF EXISTS "Users can view own nichos and shared" ON nichos;
CREATE POLICY "Users can view own nichos and shared" ON nichos
  FOR SELECT USING (
    user_id = auth.uid()
    OR _check_nicho_membership(id, auth.uid())
  );


-- =====================================================
-- SEÇÃO 9: ATUALIZAR POLÍTICAS RLS — CATEGORIAS
-- Donos e membros têm acesso completo de edição.
-- =====================================================

DROP POLICY IF EXISTS "Users can view categories from own nichos" ON categorias;
DROP POLICY IF EXISTS "Users can insert categories in own nichos" ON categorias;
DROP POLICY IF EXISTS "Users can update categories in own nichos" ON categorias;
DROP POLICY IF EXISTS "Users can delete categories in own nichos" ON categorias;

CREATE POLICY "Acesso a categorias de nichos acessíveis" ON categorias
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nichos
      WHERE nichos.id = categorias.nicho_id
      AND (
        nichos.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM nicho_membros
          WHERE nicho_membros.nicho_id = nichos.id
          AND nicho_membros.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Inserir categorias em nichos acessíveis" ON categorias
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM nichos
      WHERE nichos.id = categorias.nicho_id
      AND (
        nichos.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM nicho_membros
          WHERE nicho_membros.nicho_id = nichos.id
          AND nicho_membros.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Atualizar categorias em nichos acessíveis" ON categorias
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM nichos
      WHERE nichos.id = categorias.nicho_id
      AND (
        nichos.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM nicho_membros
          WHERE nicho_membros.nicho_id = nichos.id
          AND nicho_membros.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Deletar categorias em nichos acessíveis" ON categorias
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM nichos
      WHERE nichos.id = categorias.nicho_id
      AND (
        nichos.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM nicho_membros
          WHERE nicho_membros.nicho_id = nichos.id
          AND nicho_membros.user_id = auth.uid()
        )
      )
    )
  );


-- =====================================================
-- SEÇÃO 10: ATUALIZAR POLÍTICAS RLS — ENTRADAS
-- Donos e membros têm acesso completo de edição.
-- =====================================================

DROP POLICY IF EXISTS "Users can view entries from own nichos" ON entradas;
DROP POLICY IF EXISTS "Users can insert entries in own nichos" ON entradas;
DROP POLICY IF EXISTS "Users can update entries in own nichos" ON entradas;
DROP POLICY IF EXISTS "Users can delete entries in own nichos" ON entradas;

CREATE POLICY "Acesso a entradas de nichos acessíveis" ON entradas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nichos
      WHERE nichos.id = entradas.nicho_id
      AND (
        nichos.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM nicho_membros
          WHERE nicho_membros.nicho_id = nichos.id
          AND nicho_membros.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Inserir entradas em nichos acessíveis" ON entradas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM nichos
      WHERE nichos.id = entradas.nicho_id
      AND (
        nichos.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM nicho_membros
          WHERE nicho_membros.nicho_id = nichos.id
          AND nicho_membros.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Atualizar entradas em nichos acessíveis" ON entradas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM nichos
      WHERE nichos.id = entradas.nicho_id
      AND (
        nichos.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM nicho_membros
          WHERE nicho_membros.nicho_id = nichos.id
          AND nicho_membros.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Deletar entradas em nichos acessíveis" ON entradas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM nichos
      WHERE nichos.id = entradas.nicho_id
      AND (
        nichos.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM nicho_membros
          WHERE nicho_membros.nicho_id = nichos.id
          AND nicho_membros.user_id = auth.uid()
        )
      )
    )
  );


-- =====================================================
-- SEÇÃO 11: STORED PROCEDURES (SECURITY DEFINER)
-- Operações que tocam múltiplas tabelas ou criam
-- registros para outros usuários rodam via funções
-- SECURITY DEFINER para contornar RLS com segurança.
-- =====================================================

-- ----------------------------------------------------
-- buscar_usuarios_por_nickname
-- Autocomplete de usuários para o modal de compartilhar.
-- Retorna nickname + email mascarado para diferenciar
-- usuários com o mesmo nickname.
-- Exclui o próprio usuário dos resultados.
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION buscar_usuarios_por_nickname(p_termo TEXT)
RETURNS TABLE(id UUID, nickname TEXT, email_masked TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.nickname,
    CONCAT(
      LEFT(split_part(u.email, '@', 1), 1),
      '***@',
      split_part(u.email, '@', 2)
    )::TEXT AS email_masked
  FROM users u
  WHERE
    u.nickname ILIKE '%' || p_termo || '%'
    AND u.id != auth.uid()
  ORDER BY u.nickname ASC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ----------------------------------------------------
-- enviar_convite
-- Cria um convite e a notificação para o destinatário.
-- Valida: dono do nicho, não-duplicata, não membro já.
-- Retorna o ID do convite criado.
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION enviar_convite(p_nicho_id TEXT, p_para_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_nicho      RECORD;
  v_convite_id TEXT := gen_random_uuid()::text;
BEGIN
  SELECT * INTO v_nicho FROM nichos WHERE id = p_nicho_id AND user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Acesso negado: você não é o dono deste nicho';
  END IF;

  IF p_para_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode convidar a si mesmo';
  END IF;

  IF EXISTS (
    SELECT 1 FROM nicho_membros
    WHERE nicho_id = p_nicho_id AND user_id = p_para_user_id
  ) THEN
    RAISE EXCEPTION 'Este usuário já é membro do nicho';
  END IF;

  IF EXISTS (
    SELECT 1 FROM convites
    WHERE nicho_id = p_nicho_id AND para_user_id = p_para_user_id AND status = 'pendente'
  ) THEN
    RAISE EXCEPTION 'Já existe um convite pendente para este usuário neste nicho';
  END IF;

  INSERT INTO convites (id, nicho_id, de_user_id, para_user_id)
  VALUES (v_convite_id, p_nicho_id, auth.uid(), p_para_user_id);

  INSERT INTO notificacoes (user_id, tipo, payload)
  VALUES (
    p_para_user_id,
    'convite_nicho',
    jsonb_build_object(
      'convite_id',      v_convite_id,
      'nicho_id',        p_nicho_id,
      'nicho_nome',      v_nicho.nome,
      'nicho_descricao', v_nicho.descricao,
      'nicho_icone',     v_nicho.icone,
      'de_user_id',      auth.uid()
    )
  );

  RETURN v_convite_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ----------------------------------------------------
-- responder_convite
-- Aceitar: adiciona à nicho_membros e notifica o remetente.
-- Recusar: apenas atualiza o status do convite.
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION responder_convite(p_convite_id TEXT, p_aceitar BOOLEAN)
RETURNS void AS $$
DECLARE
  v_convite RECORD;
  v_nicho   RECORD;
BEGIN
  SELECT * INTO v_convite
  FROM convites
  WHERE id = p_convite_id AND para_user_id = auth.uid() AND status = 'pendente';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite não encontrado ou já respondido';
  END IF;

  SELECT * INTO v_nicho FROM nichos WHERE id = v_convite.nicho_id;

  IF p_aceitar THEN
    UPDATE convites SET status = 'aceito', updated_at = NOW() WHERE id = p_convite_id;

    INSERT INTO nicho_membros (nicho_id, user_id, role, convidado_por)
    VALUES (v_convite.nicho_id, auth.uid(), 'editor', v_convite.de_user_id)
    ON CONFLICT (nicho_id, user_id) DO NOTHING;

    INSERT INTO notificacoes (user_id, tipo, payload)
    VALUES (
      v_convite.de_user_id,
      'convite_aceito',
      jsonb_build_object(
        'nicho_id',   v_convite.nicho_id,
        'nicho_nome', v_nicho.nome,
        'de_user_id', auth.uid()
      )
    );
  ELSE
    UPDATE convites SET status = 'recusado', updated_at = NOW() WHERE id = p_convite_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ----------------------------------------------------
-- transferir_ou_excluir_nicho
-- Chamada quando o DONO tenta excluir o nicho.
-- Se houver membros: transfere posse para o membro mais
--   antigo (por joined_at) e notifica o novo dono.
-- Se não houver membros: exclui (cascade apaga tudo).
-- Retorna: 'transferred' ou 'deleted'.
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION transferir_ou_excluir_nicho(p_nicho_id TEXT)
RETURNS TEXT AS $$
DECLARE
  v_proximo_dono_id UUID;
  v_nicho_nome      TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM nichos WHERE id = p_nicho_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: você não é o dono deste nicho';
  END IF;

  SELECT user_id INTO v_proximo_dono_id
  FROM nicho_membros
  WHERE nicho_id = p_nicho_id
  ORDER BY joined_at ASC
  LIMIT 1;

  IF FOUND THEN
    SELECT nome INTO v_nicho_nome FROM nichos WHERE id = p_nicho_id;

    UPDATE nichos
    SET user_id = v_proximo_dono_id, updated_at = NOW()
    WHERE id = p_nicho_id;

    -- Novo dono sai da tabela de membros (agora é o owner)
    DELETE FROM nicho_membros
    WHERE nicho_id = p_nicho_id AND user_id = v_proximo_dono_id;

    INSERT INTO notificacoes (user_id, tipo, payload)
    VALUES (
      v_proximo_dono_id,
      'ownership_recebida',
      jsonb_build_object(
        'nicho_id',   p_nicho_id,
        'nicho_nome', v_nicho_nome
      )
    );

    RETURN 'transferred';
  ELSE
    DELETE FROM nichos WHERE id = p_nicho_id;
    RETURN 'deleted';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ----------------------------------------------------
-- revogar_membro_e_forkar
-- Remove o acesso de um membro e entrega a ele uma
-- cópia independente do nicho (fork completo).
-- O fork preserva: nicho, todas as categorias e todas
-- as entradas, com IDs novos e user_id do removido.
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION revogar_membro_e_forkar(p_nicho_id TEXT, p_user_id_remover UUID)
RETURNS void AS $$
DECLARE
  v_nicho         RECORD;
  v_novo_nicho_id TEXT := gen_random_uuid()::text;
  v_cat           RECORD;
  v_novo_cat_id   TEXT;
  v_cat_id_map    JSONB := '{}';
  v_entrada       RECORD;
BEGIN
  SELECT * INTO v_nicho FROM nichos WHERE id = p_nicho_id AND user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Acesso negado: você não é o dono deste nicho';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM nicho_membros
    WHERE nicho_id = p_nicho_id AND user_id = p_user_id_remover
  ) THEN
    RAISE EXCEPTION 'Usuário não é membro deste nicho';
  END IF;

  -- 1. Fork do nicho
  INSERT INTO nichos (id, nome, descricao, icone, cor, user_id)
  VALUES (v_novo_nicho_id, v_nicho.nome, v_nicho.descricao, v_nicho.icone, v_nicho.cor, p_user_id_remover);

  -- 2. Fork das categorias; monta mapa old_id → new_id para referenciar nas entradas
  FOR v_cat IN SELECT * FROM categorias WHERE nicho_id = p_nicho_id LOOP
    v_novo_cat_id := gen_random_uuid()::text;
    INSERT INTO categorias (id, nome, icone, cor, descricao, user_id, nicho_id)
    VALUES (v_novo_cat_id, v_cat.nome, v_cat.icone, v_cat.cor, v_cat.descricao, p_user_id_remover, v_novo_nicho_id);
    v_cat_id_map := v_cat_id_map || jsonb_build_object(v_cat.id, v_novo_cat_id);
  END LOOP;

  -- 3. Fork das entradas com categoria_id re-mapeada
  FOR v_entrada IN SELECT * FROM entradas WHERE nicho_id = p_nicho_id LOOP
    INSERT INTO entradas (id, titulo, slug, categoria_id, conteudo, user_id, nicho_id)
    VALUES (
      gen_random_uuid()::text,
      v_entrada.titulo,
      v_entrada.slug,
      (v_cat_id_map->>(v_entrada.categoria_id))::text,
      v_entrada.conteudo,
      p_user_id_remover,
      v_novo_nicho_id
    );
  END LOOP;

  -- 4. Notifica o usuário removido
  INSERT INTO notificacoes (user_id, tipo, payload)
  VALUES (
    p_user_id_remover,
    'acesso_revogado',
    jsonb_build_object(
      'nicho_nome',    v_nicho.nome,
      'novo_nicho_id', v_novo_nicho_id,
      'de_user_id',    auth.uid()
    )
  );

  -- 5. Remove o membro
  DELETE FROM nicho_membros
  WHERE nicho_id = p_nicho_id AND user_id = p_user_id_remover;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- =====================================================
-- FIM DO SCRIPT — FASE 1 CONCLUÍDA
-- =====================================================
-- ✅ Execute este script no Supabase SQL Editor.
-- Próximo passo: Fase 2 — funções JS em supabase-client.js
