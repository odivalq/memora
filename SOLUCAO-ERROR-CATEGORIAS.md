# 🚨 SOLUÇÃO DO ERRO: NetworkError ao buscar categorias

## O Problema
```
Sessão inicial: usuário logado ✅
Erro ao buscar categorias: TypeError: NetworkError ❌
```

O banco de dados do Supabase não estava configurado com as **políticas de segurança (RLS)** corretas.

---

## ✅ Solução Rápida (3 Minutos)

### 1️⃣ Abra o SQL Editor do Supabase
- Vá para: https://app.supabase.com → Seu Projeto
- Menu lateral → **SQL Editor** → **New Query**

### 2️⃣ Cole Este Código
```sql
-- Copie TODO o conteúdo do arquivo SETUP-SUPABASE.sql
-- e cole aqui no SQL Editor
```

**Arquivo a copiar:** `SETUP-SUPABASE.sql` (neste repositório)

### 3️⃣ Execute
- Clique em **"Run"** ou pressione `Ctrl+Enter`
- Aguarde aparecer: ✅ **"Success"**

### 4️⃣ Teste
- Recarregue o site: `Ctrl+Shift+R`
- Faça login/crie uma conta
- As categorias devem aparecer! ✅

---

## 🔍 O que foi configurado

| Item | Status |
|------|--------|
| Tabela `users` | ✅ Criada |
| Tabela `categorias` | ✅ Criada |
| Tabela `entradas` | ✅ Criada |
| Políticas de RLS | ✅ Configuradas |
| Autenticação | ✅ Vinculada |
| Triggers de updated_at | ✅ Criadas |

---

## 📝 Detalhes Técnicos

### Antes (Não Funcionava)
- ❌ Tabelas criadas manualmente sem RLS
- ❌ Dois clientes Supabase diferentes
- ❌ Sem vínculo user_id nas tabelas

### Depois (Funciona Perfeitamente)
- ✅ Tabelas com RLS (Row Level Security) configurada
- ✅ Um único cliente Supabase compartilhado
- ✅ Cada categoria/entrada vinculada ao usuário (user_id)
- ✅ Triggers automáticos para timestamps
- ✅ Auto-criação de perfil de usuário no registro

---

## 🆘 Se ainda não funcionar

**Opção 1:** Limpe o cache do navegador
```
Windows/Linux: Ctrl+Shift+Delete
Mac: Cmd+Shift+Delete
```

**Opção 2:** Verifique as tabelas no Supabase
- Table Editor → Deve mostrar 3 tabelas (users, categorias, entradas)

**Opção 3:** Verifique os logs
- Abra o console (F12)
- Procure por mensagens de erro específicas
- Cole aqui se precisar de ajuda

---

## 📚 Arquivos Importantes

| Arquivo | Descrição |
|---------|-----------|
| `SETUP-SUPABASE.sql` | Script SQL para configurar o banco ⭐ |
| `INSTRUCOES-SETUP-SUPABASE.md` | Instruções detalhadas |
| `js/supabase-client.js` | Cliente Supabase atualizado |
| `js/auth.js` | Autenticação com cliente compartilhado |

---

## ✨ Pronto!

Depois de executar o script SQL, tudo deve funcionar perfeitamente. Se tiver dúvidas, consulte `INSTRUCOES-SETUP-SUPABASE.md` para um guia mais detalhado.
