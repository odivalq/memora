# 🔧 SOLUÇÃO: Erro de Foreign Key ao Criar Conta

## ❌ O Problema que você está recebendo:

```
Erro ao criar perfil do usuário: insert or update on table "users" 
violates foreign key constraint "users_id_fkey"
```

**HTTP 409 Conflict** na requisição POST

---

## 🎯 A Causa:

A tabela `users` tem uma chave estrangeira que referencia `auth.users(id)`. Quando você tenta inserir manualmente um novo usuário, há um problema de timing:

1. Você chama `supabaseAuth.auth.signUp()` → cria usuário em `auth.users`
2. Você tenta inserir na tabela `users` com RLS ativado
3. RLS rejeita a inserção porque:
   - O filme não está inicializado corretamente
   - Ou o arquivo `created_at` está com formato inválido

---

## ✅ SOLUÇÃO (3 passos):

### PASSO 1: Atualizar o código JavaScript ✅ PRONTO

Já atualizamos [js/auth.js](../js/auth.js) para remover o campo `created_at` (que deve ser gerenciado pelo banco).

### PASSO 2: Executar SQL no Supabase (FAÇA AGORA)

1. Vá para seu painel do **Supabase** → **SQL Editor**
2. Clique em **"New query"**
3. Copie todo o conteúdo do arquivo [CORRECAO-AUTH.sql](../CORRECAO-AUTH.sql)
4. Cole no SQL Editor
5. Clique em **"Run"** ou pressione **Ctrl+Enter**
6. Aguarde: "Success. No rows returned"

**O que esse SQL faz:**
- ✅ Cria um **TRIGGER automático** que cria a linha em `users` quando um novo usuário é criado
- ✅ Reconfiguração das políticas de RLS corretamente
- ✅ Remove a necessidade de INSERT manual

### PASSO 3: Testar 🧪

1. Vá para a página de **Login** do seu site
2. Clique em **"Criar Conta"**
3. Preencha:
   - Email: seu-email@gmail.com
   - Senha: mínimo 8 caracteres
   - Nickname: seu-apelido
4. Clique em **"Registrar"**

**Resultado esperado:**
- ✅ Mensagem: "Conta criada com sucesso! Verifique seu email para ativar a conta."
- ✅ Email de confirmação recebido
- ✅ Sem erro de foreign key

---

## 🆘 Se o erro persistir:

1. **Verifique o console do navegador:**
   - Abra DevTools (F12)
   - Vá em **Console**
   - Veja a mensagem de erro exata

2. **Verificar trigger no Supabase:**
   - Vá em **SQL Editor** → **New query**
   - Digite e execute:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```
   - Deve retornar um resultado

3. **Reiniciar a página:**
   - Limpe o cache (Ctrl+Shift+Delete)
   - Recarregue a página

4. **Verificar RLS:**
   - Em **Authentication** → **Policies**
   - Verifique se as políticas estão corretas

---

## 📋 Resumo das Mudanças:

| O que mudou | Por quê |
|------------|--------|
| Removido `created_at` do INSERT | Deve usar DEFAULT NOW() do banco |
| Criado TRIGGER SQL | Automatiza criação de registro em `users` |
| Reconfigurado RLS | Permite operações corretas com segurança |

---

✨ **Pronto!** Agora suas contas serão criadas sem erros de chave estrangeira.
