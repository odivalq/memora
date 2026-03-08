# 🔧 Solução: Configurar Supabase - Passo a Passo

## ⚠️ Problema

Você está recebendo erro `NetworkError when attempting to fetch resource` ao tentar carregar as categorias. Isso acontece porque as tabelas do Supabase não estão configuradas corretamente com as políticas de segurança (RLS).

## ✅ Solução em 3 passos

### Passo 1: Abrir SQL Editor no Supabase

1. Vá para https://app.supabase.com
2. Selecione seu projeto
3. No menu lateral esquerdo, clique em **"SQL Editor"**
4. Clique no botão **"+ New query"**

---

### Passo 2: Copiar e Executar o Script

1. Abra o arquivo `SETUP-SUPABASE.sql` neste repositório
2. Copie TODO o conteúdo do arquivo
3. Cole no SQL Editor do Supabase
4. Clique no botão **"Run"** (ou pressione `Ctrl+Enter`)
5. Aguarde até aparecer: ✅ **"Success"**

---

### Passo 3: Verificar as Tabelas

1. No menu lateral, clique em **"Table Editor"**
2. Você deve ver:
   - ✅ `users`
   - ✅ `categorias`
   - ✅ `entradas`

Se as tabelas aparecerem, está tudo correto! 

---

## 🧪 Testar o Acesso

Após executar o script:

1. Faça logout do site (se estiver logado)
2. Recarregue a página (`F5`)
3. Faça login/crie uma conta
4. Agora você deve conseguir ver categorias na página inicial

---

## 📋 O que o script faz

✅ Cria a tabela `users` (perfis de usuário)  
✅ Cria a tabela `categorias` (para armazenar categorias)  
✅ Cria a tabela `entradas` (para armazenar artigos)  
✅ Configura **políticas de segurança (RLS)** corretamente  
✅ Cria **triggers** para atualizar timestamps automaticamente  
✅ Cria uma **função** que auto-cria um registro de user quando alguém faz signup  

---

## ⚡ Próximos Passos

Depois que o script rodar com sucesso, faça um **refresh completo** do navegador:
- Windows/Linux: `Ctrl+Shift+R`
- Mac: `Cmd+Shift+R`

Isso limpa o cache e força o navegador a recarregar tudo.

---

## 🆘 Se ainda não funcionar

1. Verifique no console (F12) se ainda há erros
2. Vá para Supabase > "Table Editor" e veja se as tabelas existem
3. Vá para Supabase > "Authentication" > "Users" e veja se seu usuário está lá
4. Tente fazer logout e login novamente
