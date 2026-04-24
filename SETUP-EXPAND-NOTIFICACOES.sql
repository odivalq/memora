-- =====================================================
-- MEMORA - Expansão de Notificações
-- Pré-requisitos: SETUP-COMPARTILHAMENTO.sql + SETUP-COMENTARIOS.sql
-- Novos tipos: membro_saiu, nova_entrada, entrada_editada, novo_comentario
-- Expiração: notificações somem após 72 h
-- =====================================================

-- =====================================================
-- SEÇÃO 1: expires_at
-- =====================================================

ALTER TABLE notificacoes
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '72 hours');

-- Preenche registros existentes que ainda não possuem expires_at
UPDATE notificacoes
  SET expires_at = created_at + INTERVAL '72 hours'
  WHERE expires_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notificacoes_expires ON notificacoes(expires_at);


-- =====================================================
-- SEÇÃO 2: função helper — notificar todos os membros
-- =====================================================

CREATE OR REPLACE FUNCTION _notificar_membros_nicho(
  p_nicho_id    TEXT,
  p_excluir_uid UUID,     -- uid do ator (não receberá notificação)
  p_tipo        TEXT,
  p_payload     JSONB
)
RETURNS void AS $$
DECLARE
  v_owner_id UUID;
  v_membro   RECORD;
BEGIN
  -- Notifica o dono do nicho (se não for o ator)
  SELECT user_id INTO v_owner_id FROM nichos WHERE id = p_nicho_id;
  IF FOUND AND v_owner_id IS DISTINCT FROM p_excluir_uid THEN
    INSERT INTO notificacoes (user_id, tipo, payload, expires_at)
    VALUES (v_owner_id, p_tipo, p_payload, NOW() + INTERVAL '72 hours');
  END IF;

  -- Notifica cada membro (excluindo o ator)
  FOR v_membro IN
    SELECT user_id FROM nicho_membros
    WHERE nicho_id = p_nicho_id AND user_id IS DISTINCT FROM p_excluir_uid
  LOOP
    INSERT INTO notificacoes (user_id, tipo, payload, expires_at)
    VALUES (v_membro.user_id, p_tipo, p_payload, NOW() + INTERVAL '72 hours');
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- =====================================================
-- SEÇÃO 3: trigger — membro_saiu
-- DELETE em nicho_membros → notifica dono e demais membros
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_membro_saiu()
RETURNS TRIGGER AS $$
DECLARE
  v_nicho_nome  TEXT;
  v_user_email  TEXT;
BEGIN
  SELECT nome INTO v_nicho_nome FROM nichos WHERE id = OLD.nicho_id;
  SELECT email INTO v_user_email FROM auth.users WHERE id = OLD.user_id;

  PERFORM _notificar_membros_nicho(
    OLD.nicho_id,
    OLD.user_id,
    'membro_saiu',
    jsonb_build_object(
      'nicho_id',        OLD.nicho_id,
      'nicho_nome',      v_nicho_nome,
      'user_id_saiu',    OLD.user_id,
      'user_email_saiu', COALESCE(v_user_email, OLD.user_id::text)
    )
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_membro_saiu ON nicho_membros;
CREATE TRIGGER on_membro_saiu
  AFTER DELETE ON nicho_membros
  FOR EACH ROW
  EXECUTE FUNCTION trigger_membro_saiu();


-- =====================================================
-- SEÇÃO 4: trigger — nova_entrada
-- INSERT em entradas → notifica dono e membros do nicho
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_nova_entrada()
RETURNS TRIGGER AS $$
DECLARE
  v_nicho_nome TEXT;
BEGIN
  IF NEW.nicho_id IS NULL THEN RETURN NEW; END IF;

  SELECT nome INTO v_nicho_nome FROM nichos WHERE id = NEW.nicho_id;

  PERFORM _notificar_membros_nicho(
    NEW.nicho_id,
    NEW.user_id,
    'nova_entrada',
    jsonb_build_object(
      'nicho_id',       NEW.nicho_id,
      'nicho_nome',     v_nicho_nome,
      'entrada_id',     NEW.id,
      'entrada_titulo', NEW.titulo,
      'autor_id',       NEW.user_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_nova_entrada ON entradas;
CREATE TRIGGER on_nova_entrada
  AFTER INSERT ON entradas
  FOR EACH ROW
  EXECUTE FUNCTION trigger_nova_entrada();


-- =====================================================
-- SEÇÃO 5: trigger — entrada_editada
-- UPDATE de titulo/conteudo → notifica dono e membros
-- (exclui quem fez o UPDATE, identificado por updated_by)
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_entrada_editada()
RETURNS TRIGGER AS $$
DECLARE
  v_nicho_nome TEXT;
  v_editor_id  UUID;
BEGIN
  IF NEW.nicho_id IS NULL THEN RETURN NEW; END IF;

  SELECT nome INTO v_nicho_nome FROM nichos WHERE id = NEW.nicho_id;

  -- updated_by = quem editou; fallback para user_id (autor original)
  v_editor_id := COALESCE(NEW.updated_by, NEW.user_id);

  PERFORM _notificar_membros_nicho(
    NEW.nicho_id,
    v_editor_id,
    'entrada_editada',
    jsonb_build_object(
      'nicho_id',       NEW.nicho_id,
      'nicho_nome',     v_nicho_nome,
      'entrada_id',     NEW.id,
      'entrada_titulo', NEW.titulo,
      'editor_id',      v_editor_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_entrada_editada ON entradas;
CREATE TRIGGER on_entrada_editada
  AFTER UPDATE OF titulo, conteudo ON entradas
  FOR EACH ROW
  WHEN (OLD.titulo IS DISTINCT FROM NEW.titulo OR OLD.conteudo IS DISTINCT FROM NEW.conteudo)
  EXECUTE FUNCTION trigger_entrada_editada();


-- =====================================================
-- SEÇÃO 6: trigger — novo_comentario
-- INSERT em comentarios → notifica dono e membros do nicho
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_novo_comentario()
RETURNS TRIGGER AS $$
DECLARE
  v_entrada    RECORD;
  v_nicho_nome TEXT;
  v_preview    TEXT;
BEGIN
  SELECT id, titulo, nicho_id INTO v_entrada FROM entradas WHERE id = NEW.entrada_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT nome INTO v_nicho_nome FROM nichos WHERE id = v_entrada.nicho_id;

  v_preview := LEFT(NEW.conteudo, 120);

  PERFORM _notificar_membros_nicho(
    v_entrada.nicho_id,
    NEW.user_id,
    'novo_comentario',
    jsonb_build_object(
      'nicho_id',       v_entrada.nicho_id,
      'nicho_nome',     v_nicho_nome,
      'entrada_id',     v_entrada.id,
      'entrada_titulo', v_entrada.titulo,
      'comentario_id',  NEW.id,
      'autor_id',       NEW.user_id,
      'preview',        v_preview
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_novo_comentario ON comentarios;
CREATE TRIGGER on_novo_comentario
  AFTER INSERT ON comentarios
  FOR EACH ROW
  EXECUTE FUNCTION trigger_novo_comentario();


-- =====================================================
-- SEÇÃO 7: limpeza periódica (opcional — via pg_cron)
-- Descomente se pg_cron estiver habilitado no projeto:
-- =====================================================
-- SELECT cron.schedule(
--   'limpar-notif-expiradas',
--   '0 * * * *',
--   $$DELETE FROM notificacoes WHERE expires_at < NOW()$$
-- );
