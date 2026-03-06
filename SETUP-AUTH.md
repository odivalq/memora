# 🔐 Memora - Guia de Configuração de Autenticação

Este guia explica como configurar o sistema de autenticação do Memora usando Supabase.

## 📋 Resumo do que foi implementado

✅ **Login e Registro**: Páginas completas de autenticação
✅ **Verificação de Email**: Sistema de confirmação de conta
✅ **Recuperação de Senha**: Reset seguro de senha
✅ **Sessão Persistente**: Login permanece após recarregar a página
✅ **Menu de Usuário**: Exibição do perfil e botão de logout
✅ **Senhas Criptografadas**: Bcrypt (Supabase Auth nativo)

---

## 🚀 PASSO 1: Configurar Supabase Auth

### 1.1 Acessar as Configurações de Auth

1. Vá ao painel do seu projeto Supabase
2. No menu lateral, clique em **Authentication**
3. Clique em **Providers**

### 1.2 Configurar Email/Password Auth

Os providers devem estar **HABILITADOS**:
- ✅ **Email** (já vem habilitado por padrão)

**Não habilite sinais sociais** por enquanto (GitHub, Google, etc).

### 1.3 Configurações de Email

1. Ainda em **Authentication > Providers**
2. Procure por **Email**
3. Garanta que as opções abaixo estão configuradas:
   - `Enable email confirmations` - **HABILITADO**
   - `Secure email change` - **HABILITADO**

### 1.4 Configurar URLs de Redirect

1. Em **Authentication > URL Configuration**
2. Configure os **Redirect URLs**:

```
http://localhost/verify-email.html
http://localhost/password-reset.html
```

Se está usando um domínio real (ex: memora.com):

```
https://memora.com/verify-email.html
https://memora.com/password-reset.html
```

---

## 🗄️ PASSO 2: Criar Tabela de Usuários Adicionais

O Supabase Auth cria automaticamente a tabela `auth.users`. Mas precisamos de uma tabela adicional para armazenar informações extras (como nickname).

### 2.1 Criar a Tabela `users`

1. Acesse **SQL Editor** no Supabase
2. Clique em **New query**
3. Cole este SQL:

```sql
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
```

4. Clique em **Run** (ou Ctrl+Enter)
5. Você deve ver: **"Success. No rows returned"**

### 2.2 Verificar a Tabela Criada

1. No menu lateral, clique em **Table Editor**
2. Procure por `users` na lista (deve estar lá)
3. Clique para visualizar os campos criados

---

## 🔑 PASSO 3: Obter suas Credenciais do Supabase

### 3.1 Pegar URL e API Key

1. No painel do Supabase, clique em **Settings** (ícone de engrenagem)
2. Em **API**, você verá:
   - **Project URL**: `https://xxxx.supabase.co`
   - **anon key** (Public): `eyJh...` (chave pública)

### 3.2 Atualizar o arquivo `js/supabase-client.js`

1. Abra o arquivo `js/supabase-client.js` no seu projeto
2. Encontre estas linhas (ou similares):

```javascript
// variáveis que o restante do app espera encontrar globalmente
window.SUPABASE_URL = 'https://wuxceywvrrxpjcwqncpn.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_89C9xeXVNWVBdKjr7qT2Tw_yJlKZBOX';

// (o arquivo também declara `const SUPABASE_URL`/`ANON_KEY` localmente)
```

> ⚠️ **Importante:** em um `<script>` normal, declarar `const` ou `let`
> não copia a variável para `window`; por isso utilizamos `window.SUPABASE_URL`
> para torná‑la disponível aos demais scripts (`auth.js`, páginas de verificação
> etc.). Se você esquecer essa etapa, verá o aviso "Configure suas credenciais
> do Supabase" no console e nada funcionará.

3. **SUBSTITUA** os valores pelos seus próprios:

```javascript
window.SUPABASE_URL = 'https://seu-projeto.supabase.co';
window.SUPABASE_ANON_KEY = 'sua-chave-publica-aqui';
```

4. Salve o arquivo


---

## ✅ TESTE A AUTENTICAÇÃO

### 4.1 Testar Registro

1. Abra `login.html` no seu navegador
2. Clique em **"Criar Conta"**
3. Preencha:
   - **Nickname**: seu_apelido
   - **Email**: seu_email@exemplo.com
   - **Senha**: Aleatoriaaa123!
4. Clique em **"Criar Conta"**

**O que deve acontecer:**
- Mensagem: "Conta criada com sucesso! Verifique seu email."
- Redirecionado para `verify-email.html`

### 4.2 Verificar Email

**No Supabase:**
1. Vá em **Authentication > Users**
2. Procure pelo email que registrou
3. Clique nele para ver os detalhes
4. Você deve ver um campo **Auth** com informações de sessão

**Para simular o email (Desenvolvimento):**
- Na página de verificação, procure por um link de confirmação
- Ou clique em **"Reenviar Email"** para testar

### 4.3 Testar Login

1. Volte à `login.html`
2. Clique em **"Login"**
3. Insira o email e senha
4. Clique em **"Entrar"**

**O que deve acontecer:**
- Redirecionado para `index.html`
- No topo direito, você vê seu nickname e email
- Botão **"Sair"** disponível no menu de usuário

### 4.4 Testar Logout

1. Clique no menu do usuário (👤 seu_apelido)
2. Clique em **"Sair"**

**O que deve acontecer:**
- Redirecionado para `login.html`
- Sessão encerrada

### 4.5 Testar Recuperação de Senha

1. Na página de login, clique em **"Esqueci minha senha"**
2. Insira o email
3. Clique em **"Enviar Email de Recuperação"**

**O que deve acontecer:**
- Mensagem: "Email de recuperação enviado"
- Um link será enviado ao email (em desenvolvimento, pode estar nos logs do Supabase)

---

## 🔒 Segurança - Como as Senhas são Protegidas

### Bcrypt Hashing (Supabase Auth)
- As senhas são automaticamente codificadas com **bcrypt**
- Nem mesmo o admin do Supabase consegue ver as senhas
- Cada login usa a senha em texto (HTTPS) e compara com o hash armazenado

### Sugestões Extras
- Use **HTTPS** em produção (Vercel, Netlify, etc)
- Não compartilhe suas credenciais do Supabase publicamente
- Revise as políticas de segurança (RLS) regularmente

---

## 📝 Estrutura de Arquivos Criados

```
├── login.html              # Página de login e registro
├── verify-email.html       # Verificação de email
├── password-reset.html     # Recuperação de senha
├── js/auth.js              # Funções de autenticação
├── editar.html             # (ATUALIZADO) Menu de usuário
├── entrada.html            # (ATUALIZADO) Menu de usuário
├── index.html              # (ATUALIZADO) Menu de usuário
└── css/style.css           # (ATUALIZADO) Estilos para auth
```

---

## 🐛 Troubleshooting

### "Biblioteca do Supabase não carregada"
- Verifique se o `<script>` do Supabase está no `<head>` antes de auth.js
- Certifique-se de que tem internet (CDN do Supabase)

### "Configure suas credenciais do Supabase"
- Você não atualizou o `js/supabase-client.js`
- Siga o **PASSO 3.2** acima

### "Email ou senha incorretos" ao fazer login
- Verifique se confirmou o email primeiro (clique no link de confirmação)
- Certifique-se de que digitou corretamente

### Usuários podem ver a senha de outro?
- **Não!** As senhas são sempre criptografadas no servidor
- O site admin não consegue descriptografar

---

## 🚀 Próximos Passos

1. **Deploy**: Coloque seu app no Vercel/Netlify (gratuitamente)
2. **Domínio**: Configure um domínio customizado
3. **Email em Produção**: Configure um serviço de email real (SendGrid, Mailgun, etc)
4. **Social Auth**: Adicione login com GitHub/Google
5. **2FA**: Implemente autenticação de dois fatores

---

## 📞 Suporte

- **Documentação Supabase**: https://supabase.com/docs/guides/auth
- **Forum**: https://github.com/supabase/supabase/discussions

---

**Criado em**: 5 de Março de 2026
**Versão**: 1.0
