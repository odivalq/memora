# 📚 WikiLocal + Supabase + Vercel

Guia completo para hospedar sua Wiki colaborativa gratuitamente usando Supabase (banco de dados) + Vercel (frontend).

---

## 🎯 O que você vai construir

Uma wiki acessível de qualquer lugar, onde **múltiplos usuários** podem:
- ✅ Criar, editar e excluir entradas
- ✅ Ver as mesmas informações em tempo real
- ✅ Acessar de qualquer dispositivo

**Custo: R$ 0,00** (plano gratuito do Supabase e Vercel)

---

## 📋 Pré-requisitos

1. Conta no GitHub (para Vercel)
2. Conta de email (para Supabase)

---

## 🚀 PASSO 1: Criar conta no Supabase

### 1.1 Acesse
- Vá para: https://supabase.com
- Clique em **"Start your project"**
- Faça login com GitHub ou email

### 1.2 Criar novo projeto
1. Clique em **"New project"**
2. Preencha:
   - **Organization:** Selecione sua organização (ou crie uma)
   - **Project name:** `wikilocal` (ou qualquer nome)
   - **Database Password:** Crie uma senha forte (guarde ela!)
   - **Region:** Selecione a mais próxima de você (ex: `South America`)
3. Clique em **"Create new project"**
4. Aguarde ~2 minutos (o banco está sendo criado)

---

## 🗄️ PASSO 2: Criar as tabelas no banco

### 2.1 Acesse o SQL Editor
1. No menu lateral, clique em **"SQL Editor"**
2. Clique em **"New query"**
3. Cole o código SQL abaixo:

```sql
-- ============================================
-- TABELA: categorias
-- ============================================
CREATE TABLE categorias (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  icone TEXT DEFAULT '📁',
  cor TEXT DEFAULT '#3366cc',
  descricao TEXT DEFAULT ''
);

-- ============================================
-- TABELA: entradas
-- ============================================
CREATE TABLE entradas (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  slug TEXT NOT NULL,
  categoria_id TEXT REFERENCES categorias(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL,
  data_criacao TIMESTAMPTZ DEFAULT NOW(),
  data_atualizacao TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA BUSCA
-- ============================================
CREATE INDEX idx_entradas_categoria ON entradas(categoria_id);
CREATE INDEX idx_entradas_titulo ON entradas(titulo);

-- ============================================
-- POLÍTICAS DE SEGURANÇA (RLS)
-- Permite leitura/escrita pública (para demo)
-- ============================================
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE entradas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON categorias
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all" ON entradas
  FOR ALL USING (true) WITH CHECK (true);
```

### 2.2 Execute o SQL
1. Clique no botão **"Run"** (ou pressione Ctrl+Enter)
2. Aguarde a confirmação: "Success. No rows returned"

### 2.3 Verifique as tabelas
1. No menu lateral, clique em **"Table Editor"**
2. Você deve ver duas tabelas: `categorias` e `entradas`

---

## 🔑 PASSO 3: Copiar as credenciais do Supabase

### 3.1 Acesse as configurações
1. No menu lateral, clique em **"Project Settings"** (ícone de engrenagem no final)
2. Clique em **"API"** no submenu

### 3.2 Copie as informações
Você verá dois campos importantes:

```
Project URL: https://xxxxxxxxxxxxxxxxxxxx.supabase.co
anon public: eyJhbGciOiJIUzI1NiIs... (chave longa)
```

**Guarde esses dois valores!** Você vai precisar deles.

---

## ⚙️ PASSO 4: Configurar o arquivo supabase-client.js

### 4.1 Abra o arquivo
Abra o arquivo `js/supabase-client.js` no seu editor de código.

### 4.2 Substitua as credenciais
Encontre estas linhas no início do arquivo:

```javascript
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'sua-chave-anon-publica-aqui';
```

Substitua pelos valores que você copiou no Passo 3:

```javascript
const SUPABASE_URL = 'https://xxxxxxxxxxxxxxxxxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIs...';
```

### 4.3 Salve o arquivo

---

## 🧪 PASSO 5: Testar localmente (opcional mas recomendado)

### 5.1 Abra o arquivo index.html
Abra o arquivo `index.html` diretamente no navegador (duplo clique).

### 5.2 Verifique o console
1. Pressione **F12** para abrir o console
2. Você deve ver as categorias sendo carregadas (ou vazio se não houver dados)

### 5.3 Crie uma entrada de teste
1. Clique em **"Nova Entrada"**
2. Crie uma categoria e uma entrada
3. Verifique se salvou corretamente

---

## 🌐 PASSO 6: Hospedar no Vercel

### 6.1 Criar conta no Vercel
1. Acesse: https://vercel.com
2. Clique em **"Sign Up"**
3. Escolha **"Continue with GitHub"**

### 6.2 Criar novo projeto
1. No dashboard, clique em **"Add New..."** → **"Project"**
2. Você verá seus repositórios GitHub (se tiver)
3. Como queremos subir arquivos locais, clique em **"Import Git Repository"** (ou use outra opção)

### 6.3 Upload dos arquivos (Método 1: GitHub)

#### 6.3.1 Crie um repositório no GitHub
1. Acesse: https://github.com/new
2. Nome: `wikilocal`
3. Deixe público
4. Clique **"Create repository"**

#### 6.3.2 Envie os arquivos
No terminal (na pasta do seu projeto):

```bash
# Inicializa o git
git init

# Adiciona todos os arquivos
git add .

# Faz o commit
git commit -m "Primeira versão da WikiLocal"

# Conecta ao GitHub (substitua SEU-USUARIO)
git remote add origin https://github.com/SEU-USUARIO/wikilocal.git

# Envia os arquivos
git push -u origin main
```

#### 6.3.3 Importe no Vercel
1. No Vercel, clique em **"Import Git Repository"**
2. Selecione o repositório `wikilocal`
3. Clique **"Import"**
4. Mantenha as configurações padrão
5. Clique **"Deploy"**

### 6.4 Upload dos arquivos (Método 2: Vercel CLI)

#### 6.4.1 Instale o Vercel CLI
```bash
npm i -g vercel
```

#### 6.4.2 Faça login
```bash
vercel login
```

#### 6.4.3 Deploy
Na pasta do projeto:
```bash
vercel
```

Siga as instruções:
- Set up and deploy? **Y**
- Link to existing project? **N**
- What's your project name? `wikilocal`
- In which directory? **.** (ponto = pasta atual)

### 6.5 Aguarde o deploy
O Vercel vai:
1. Fazer upload dos arquivos
2. Processar
3. Gerar uma URL (ex: `https://wikilocal.vercel.app`)

---

## 🎉 PASSO 7: Acessar sua Wiki!

1. Copie a URL gerada pelo Vercel
2. Abra no navegador
3. **Pronto!** Sua wiki está online! 🚀

---

## 📤 PASSO 8: Importar dados dos JSONs (opcional)

Se você já tinha dados nos arquivos JSON e quer importá-los:

### 8.1 Abra o console do navegador
Na sua wiki online, pressione **F12** → aba **Console**

### 8.2 Execute a migração
```javascript
await WikiSupabase.migrarDadosDoJSON();
```

Isso vai ler os arquivos `data/categorias.json` e `data/entradas.json` e enviar para o Supabase.

---

## 🔒 PASSO 9: Segurança (opcional mas recomendado)

Por padrão, qualquer pessoa pode editar. Para adicionar autenticação:

### 9.1 Ative a autenticação no Supabase
1. No Supabase, vá em **"Authentication"** → **"Providers"**
2. Ative **"Email"**
3. Configure conforme necessário

### 9.2 Modifique as políticas de segurança
No SQL Editor, execute:

```sql
-- Remove políticas antigas
DROP POLICY IF EXISTS "Allow all" ON categorias;
DROP POLICY IF EXISTS "Allow all" ON entradas;

-- Nova política: apenas usuários autenticados podem editar
CREATE POLICY "Allow read for all" ON categorias
  FOR SELECT USING (true);

CREATE POLICY "Allow write for authenticated" ON categorias
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read for all" ON entradas
  FOR SELECT USING (true);

CREATE POLICY "Allow write for authenticated" ON entradas
  FOR ALL USING (auth.role() = 'authenticated');
```

---

## 📝 Resumo dos arquivos

```
wikilocal/
├── index.html              ← Página principal
├── entrada.html            ← Visualização de entrada
├── editar.html             ← Editor de entradas
├── css/
│   └── style.css           ← Estilos
├── js/
│   ├── supabase-client.js  ← ← CONFIGURE AQUI!
│   ├── app-supabase.js     ← Lógica principal
│   └── editor-supabase.js  ← Lógica do editor
├── data/
│   ├── categorias.json     ← Dados iniciais (opcional)
│   └── entradas.json       ← Dados iniciais (opcional)
└── README-SUPABASE.md      ← Este arquivo
```

---

## ❓ Solução de Problemas

### "Não consigo conectar ao Supabase"
- Verifique se copiou a URL e a chave corretamente
- Certifique-se de que não há espaços extras

### "As tabelas não aparecem"
- Volte ao Passo 2 e execute o SQL novamente
- Verifique se não houve erros de sintaxe

### "O deploy no Vercel falhou"
- Verifique se todos os arquivos foram enviados
- Certifique-se de que o `index.html` está na raiz

---

## 💡 Dicas

- **Backup:** Exporte os dados do Supabase periodicamente (Menu → Database → Backups)
- **Custom domain:** No Vercel, você pode adicionar seu próprio domínio
- **Analytics:** Ambos Supabase e Vercel têm dashboards de uso

---

**Pronto!** Sua WikiLocal está no ar! 🎉📚
