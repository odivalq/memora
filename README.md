# Memora - Sistema de Nichos Colaborativos

![Logo Memora](https://via.placeholder.com/100x100/007bff/ffffff?text=🏠)

**Memora** é um sistema de enciclopédia colaborativa organizada em nichos temáticos, permitindo que usuários criem, organizem e compartilhem conhecimento de forma estruturada e segura.

## 🎯 Visão Geral

O Memora é um projeto web completo que implementa:

- **Sistema de Nichos**: Organização temática do conhecimento
- **Autenticação Segura**: Login com Supabase Auth
- **Interface Moderna**: Design responsivo e intuitivo
- **Busca Inteligente**: Busca e filtragem avançada
- **Performance Otimizada**: Cache inteligente e carregamento rápido
- **Testes Completos**: Sistema de testes de integração

## 🚀 Principais Funcionalidades

### 🏠 Dashboard Pessoal
- Visualização de todos os nichos do usuário
- Criação e gerenciamento de nichos
- Controle de permissões e acesso
- Estatísticas e métricas

### 📚 Sistema de Nichos
- Nichos públicos e privados
- Categorias específicas por nicho
- Controle de acesso granular
- Organização temática do conteúdo

### ✏️ Editor de Conteúdo
- Criação e edição de entradas
- Formatação HTML simples
- Categorias por nicho
- Upload e organização de conteúdo

### 🔍 Busca e Descoberta
- Busca por termos e categorias
- Filtros avançados
- Resultados em tempo real
- Histórico de buscas

### 🔒 Segurança
- Autenticação JWT
- Validação de permissões
- Proteção contra ataques
- Auditoria de acessos

## 📋 Requisitos Técnicos

### Frontend
- **HTML5** - Estrutura semântica
- **CSS3** - Estilização moderna com Grid/Flexbox
- **JavaScript ES6+** - Lógica de aplicação
- **Fetch API** - Comunicação com APIs

### Backend (Supabase)
- **PostgreSQL** - Banco de dados relacional
- **Supabase Auth** - Autenticação e autorização
- **Row Level Security** - Segurança em nível de linha
- **Storage** - Armazenamento de arquivos (futuro)

### Dependências Externas
- **Supabase Client** - Conexão com Supabase
- **html2pdf.js** - Exportação PDF (editor)

## 🛠️ Estrutura de Arquivos

```
memora/
├── 📁 css/                    # Estilos CSS
│   ├── style.css             # Estilos principais
│   └── dashboard.css         # Estilos do dashboard
│
├── 📁 js/                     # Scripts JavaScript
│   ├── supabase-client.js    # Cliente Supabase
│   ├── auth.js              # Autenticação
│   ├── app-supabase.js      # Funções principais
│   ├── app-nicho.js         # Lógica de nichos
│   ├── editor-nicho.js      # Editor de conteúdo
│   ├── entrada-nicho.js     # Visualização de entradas
│   ├── dashboard.js         # Dashboard
│   ├── otimizacao-performance.js  # Performance
│   └── verificar-ambiente.js # Verificação de ambiente
│
├── 📁 memory-bank/           # Documentação do projeto
│   ├── projectbrief.md      # Briefing do projeto
│   ├── productContext.md    # Contexto do produto
│   ├── techContext.md       # Contexto técnico
│   ├── systemPatterns.md    # Padrões do sistema
│   ├── activeContext.md     # Contexto ativo
│   └── progress.md          # Progresso do projeto
│
├── 📄 handouts/              # Documentação por fase
│   ├── handout-fase-1.md    # Modelagem de dados
│   ├── handout-fase-2.md    # Backend Supabase
│   ├── handout-fase-3.md    # Dashboard
│   ├── handout-fase-4.md    # Página principal
│   ├── handout-fase-5.md    # Sistema de criação
│   └── handout-fase-6.md    # Testes e otimizações
│
├── 📄 páginas principais
│   ├── index.html           # Página inicial/nicho
│   ├── dashboard.html       # Dashboard pessoal
│   ├── editar.html          # Editor de conteúdo
│   └── entrada.html         # Visualização de entradas
│
├── 🧪 testes
│   └── testes-integracao.html  # Testes automatizados
│
├── ⚙️ configuração
│   ├── SETUP-SUPABASE.sql   # Configuração inicial
│   ├── SETUP-NICHOS-SUPABASE.sql  # Configuração de nichos
│   ├── iniciar-testes-local.bat   # Script Windows
│   └── README-TESTES-LOCAIS.md    # Guia de testes
│
└── 📋 documentação
    ├── README.md            # Este arquivo
    └── verificar-ambiente.js # Verificador de ambiente
```

## 🚀 Iniciando o Projeto

### 1. Requisitos
- Navegador moderno (Chrome, Firefox, Edge, Safari)
- Conexão com internet
- Node.js (opcional, para servidor local)

### 2. Iniciando o Servidor Local

#### Método 1: Node.js (Recomendado)
```bash
# Na pasta do projeto
node -e "
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  const extname = String(path.extname(filePath)).toLowerCase();
  
  const mimeTypes = {
    '.html': 'text/html', '.js': 'text/javascript',
    '.css': 'text/css', '.json': 'application/json',
    '.png': 'image/png', '.jpg': 'image/jpg',
    '.gif': 'image/gif', '.svg': 'image/svg+xml'
  };
  
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('Erro interno do servidor');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(8080, () => {
  console.log('Servidor rodando em http://localhost:8080');
});
"
```

#### Método 2: Python
```bash
# Na pasta do projeto
python -m http.server 8000
```

#### Método 3: Script Automático (Windows)
```bash
# Clique duas vezes no arquivo iniciar-testes-local.bat
```

### 3. Acessando o Sistema
- **Página Inicial**: http://localhost:8080/index.html
- **Dashboard**: http://localhost:8080/dashboard.html
- **Testes**: http://localhost:8080/testes-integracao.html

## 🧪 Testes e Verificação

### Testes Automatizados
Acesse `testes-integracao.html` para executar testes completos do sistema:

- **Testes de Autenticação**: Verificação de sessão e token
- **Testes de Nichos**: Criação, listagem e acesso
- **Testes de Conteúdo**: Criação e busca de entradas
- **Testes de Segurança**: Validação de permissões
- **Testes de Performance**: Tempo de resposta e carregamento

### Verificação de Ambiente
Use o script `verificar-ambiente.js` para validar o ambiente:

```javascript
// No console do navegador
verificarAmbiente()
```

### Métricas de Performance
O sistema inclui monitoramento de performance:
- Tempos de carregamento
- Uso de cache
- Resposta de APIs
- Métricas de paint

## 📊 Arquitetura do Sistema

### Camada de Dados (Supabase)
```
users (auth.users)          # Usuários do sistema
nichos                     # Nichos temáticos
categorias                 # Categorias por nicho
entradas                   # Conteúdo das entradas
nicho_usuarios             # Relacionamento usuários-nichos
```

### Camada de Serviço
```
Supabase Client           # Conexão com banco de dados
Auth System              # Autenticação e autorização
Cache System             # Cache inteligente
Performance Monitor      # Monitoramento de performance
```

### Camada de Apresentação
```
Dashboard               # Interface de gerenciamento
Nichos                  # Visualização de nichos
Editor                  # Criação e edição de conteúdo
Busca                   # Sistema de busca e filtragem
```

## 🔧 Configuração do Supabase

### 1. Crie uma conta no Supabase
- Acesse: https://supabase.com
- Crie um novo projeto

### 2. Configure o banco de dados
Execute os scripts SQL:
- `SETUP-SUPABASE.sql` - Estrutura básica
- `SETUP-NICHOS-SUPABASE.sql` - Estrutura de nichos

### 3. Configure as políticas de segurança
As políticas RLS (Row Level Security) já estão configuradas nos scripts.

### 4. Configure as credenciais
No arquivo `js/supabase-client.js`, atualize:
```javascript
const SUPABASE_URL = 'sua-url-aqui';
const SUPABASE_ANON_KEY = 'sua-chave-anon-aqui';
```

## 📈 Performance e Otimizações

### Cache Inteligente
- **Tempo de vida**: 5 minutos para dados frequentes
- **Tipos cacheáveis**: Nichos, categorias, entradas
- **Limpeza automática**: Remoção de itens expirados

### Lazy Loading
- **Imagens**: Carregamento sob demanda
- **Conteúdo**: Renderização progressiva
- **Módulos**: Carregamento sob demanda

### Monitoramento
- **Métricas de tempo**: Todas as operações principais
- **Observação de recursos**: Carregamento de assets
- **Paint timing**: Tempos de renderização

## 🔒 Segurança

### Autenticação
- **JWT Tokens**: Autenticação segura
- **Sessões**: Controle de sessões de usuário
- **Validação**: Verificação de tokens em todas as requisições

### Autorização
- **RLS**: Row Level Security no PostgreSQL
- **Permissões**: Controle granular por nicho
- **Validação**: Checagem de permissões antes de operações

### Proteção
- **Sanitização**: Limpeza de entradas de usuário
- **Validação**: Checagem de dados antes de processamento
- **Auditoria**: Registro de operações importantes

## 🚀 Deploy em Produção

### 1. Escolha da Plataforma
- **Vercel** - Recomendado para projetos estáticos
- **Netlify** - Alternativa com CI/CD
- **Heroku** - Para projetos com backend
- **AWS/GCP/Azure** - Para projetos enterprise

### 2. Configuração de Variáveis de Ambiente
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
```

### 3. Build e Deploy
```bash
# Para projetos estáticos
npm run build  # Se usar build process
# Ou simplesmente faça upload dos arquivos estáticos
```

### 4. Configuração de DNS
- Configure seu domínio
- Habilite HTTPS
- Configure redirecionamentos

## 📚 Documentação

### Handouts por Fase
- **[Fase 1](handout-fase-1.md)** - Modelagem de dados e backend
- **[Fase 2](handout-fase-2.md)** - Backend - Supabase client
- **[Fase 3](handout-fase-3.md)** - Página de dashboard pessoal
- **[Fase 4](handout-fase-4.md)** - Adaptar página principal
- **[Fase 5](handout-fase-5.md)** - Integrar sistema de criação de conteúdo
- **[Fase 6](handout-fase-6.md)** - Testes e otimizações

### Guia de Testes
- **[README-TESTES-LOCAIS.md](README-TESTES-LOCAIS.md)** - Guia completo de testes locais

## 🤝 Contribuição

### Como Contribuir
1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Faça commit das suas alterações
4. Push para a branch
5. Crie um Pull Request

### Diretrizes de Código
- Siga o padrão ESLint
- Mantenha a documentação atualizada
- Teste todas as funcionalidades
- Use commits descritivos

### Relatando Problemas
- Use o template de issues
- Forneça informações detalhadas
- Inclua prints de tela quando necessário
- Descreva passos para reproduzir

## 📞 Suporte

### Canais de Suporte
- **Issues do GitHub** - Para bugs e problemas
- **Discussions** - Para dúvidas e ideias
- **Email** - contato@exemplo.com

### Perguntas Frequentes

#### Como resetar a senha?
Use a funcionalidade de "Esqueci a senha" na página de login.

#### Como criar um nicho privado?
No dashboard, ao criar um nicho, selecione "Privado" no tipo de acesso.

#### Como convidar usuários para um nicho?
Atualmente, apenas o dono do nicho pode gerenciar permissões. Futuramente haverá sistema de convites.

#### Onde são armazenados os arquivos?
Atualmente apenas texto é suportado. Upload de arquivos será implementado futuramente.

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🙏 Agradecimentos

- **Supabase** - Por fornecer uma excelente plataforma de backend
- **Comunidade Open Source** - Por contribuir com bibliotecas e ferramentas
- **Usuários** - Por feedback e sugestões

## 📞 Contato

- **Email**: contato@memora.exemplo
- **Website**: https://memora.exemplo
- **GitHub**: [@seu-usuario](https://github.com/seu-usuario)

---

**Memora** - Organizando conhecimento, uma ideia de cada vez. 🏠📚