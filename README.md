# 📚 WikiLocal

Uma Wikipedia local simples, leve e fácil de usar. Crie, edite e consulte informações organizadas por categorias.

## ✨ Características

- **100% Local**: Todos os dados são armazenados no navegador (LocalStorage)
- **Fácil de Editar**: Interface intuitiva para criar e editar entradas
- **Busca Rápida**: Encontre informações instantaneamente
- **Organizado por Categorias**: Mantenha tudo organizado
- **Formatação HTML**: Suporte a textos, links, tabelas, listas e mais
- **Responsivo**: Funciona em desktop e mobile

## 🚀 Como Usar

### 1. Abrir a Aplicação

Simplesmente abra o arquivo `index.html` em qualquer navegador moderno:

```bash
# No Windows
start index.html

# No Mac
open index.html

# No Linux
xdg-open index.html
```

Ou arraste o arquivo `index.html` para uma janela do navegador.

### 2. Criar uma Nova Entrada

1. Clique no botão **"Nova Entrada"** no topo da página
2. Preencha o **título** da entrada
3. Escolha uma **categoria** existente ou crie uma nova
4. Digite o **conteúdo** usando HTML simples (ou use a toolbar de formatação)
5. Clique em **"Salvar Entrada"**

### 3. Editar uma Entrada

1. Abra a entrada que deseja editar
2. Clique no botão **"Editar"** no topo da página
3. Faça as alterações necessárias
4. Clique em **"Salvar Entrada"**

### 4. Excluir uma Entrada

1. Abra a entrada que deseja excluir
2. Clique no botão **"Excluir"** no topo da página
3. Confirme a exclusão no modal

### 5. Buscar Informações

- Use a **barra de busca** no topo para encontrar entradas
- A busca procura no título e no conteúdo das entradas

## 📝 Formatação de Conteúdo

O editor suporta HTML simples. Use a toolbar para inserir formatações comuns:

| Botão | Tag | Resultado |
|-------|-----|-----------|
| H2 | `<h2>` | Título grande |
| H3 | `<h3>` | Subtítulo |
| B | `<strong>` | **Negrito** |
| I | `<em>` | *Itálico* |
| 🔗 | `<a>` | [Link](https://exemplo.com) |
| • Lista | `<ul>` | Lista com bullets |
| 1. Lista | `<ol>` | Lista numerada |
| ⊞ Tabela | `<table>` | Tabela |
| { } | `<code>` | `Código inline` |
| " Citação | `<blockquote>` | Bloco de citação |
| ℹ Info | `<div class="info-box">` | Caixa de informação |
| ⚠ Alerta | `<div class="alert alert-warning">` | Alerta de atenção |

### Exemplo de Tabela

```html
<table>
  <tr>
    <th>Coluna 1</th>
    <th>Coluna 2</th>
  </tr>
  <tr>
    <td>Dado 1</td>
    <td>Dado 2</td>
  </tr>
</table>
```

### Exemplo de Info Box

```html
<div class="info-box">
  <div class="info-box-titulo">💡 Dica</div>
  <p>Texto informativo aqui...</p>
</div>
```

### Exemplo de Alerta

```html
<div class="alert alert-warning">
  <strong>⚠️ Atenção:</strong> Mensagem importante!
</div>
```

## 📁 Estrutura de Arquivos

```
wikilocal/
├── index.html          # Página principal (lista de categorias)
├── entrada.html        # Visualização de uma entrada
├── editar.html         # Editor de entradas
├── css/
│   └── style.css       # Estilos da aplicação
├── js/
│   ├── app.js          # Lógica principal
│   └── editor.js       # Lógica do editor
├── data/
│   ├── categorias.json # Estrutura de exemplo (categorias)
│   └── entradas.json   # Estrutura de exemplo (entradas)
└── README.md           # Este arquivo
```

## 💾 Backup e Restauração

### Exportar Dados

Os dados são armazenados no LocalStorage do navegador. Para fazer backup:

1. Abra o console do navegador (F12 → Console)
2. Execute:

```javascript
// Backup de categorias
const categorias = localStorage.getItem('wikilocal_categorias');
console.log('Categorias:', categorias);

// Backup de entradas
const entradas = localStorage.getItem('wikilocal_entradas');
console.log('Entradas:', entradas);
```

3. Copie os valores e salve em arquivos JSON

### Importar Dados

Para restaurar dados de um backup:

```javascript
// Restaurar categorias
localStorage.setItem('wikilocal_categorias', 'COLE_AQUI_O_JSON_DE_CATEGORIAS');

// Restaurar entradas
localStorage.setItem('wikilocal_entradas', 'COLE_AQUI_O_JSON_DE_ENTRADAS');
```

## 🎨 Personalização

### Cores das Categorias

Ao criar uma nova categoria, você pode escolher uma cor. As cores são armazenadas no formato hexadecimal (ex: `#4CAF50`).

### Ícones das Categorias

Use emojis como ícones para as categorias. Alguns exemplos:

- 📋 Documentação
- ⚙️ Procedimentos
- 👥 Pessoas
- 💻 Tecnologia
- 🏢 Empresa
- 📊 Dados
- 🔒 Segurança
- 💰 Financeiro

## 🔧 Solução de Problemas

### Dados sumiram

Os dados do LocalStorage podem ser limpos se:
- O usuário limpar os dados de navegação
- O navegador estiver em modo privado/anônimo
- O espaço de armazenamento estiver cheio

**Recomendação**: Faça backups regulares dos seus dados.

### Aplicação não carrega

- Verifique se todos os arquivos estão na mesma pasta
- Certifique-se de abrir via `http://` ou `file:///` (não funciona em servidores restritos)
- Use navegadores modernos (Chrome, Firefox, Edge, Safari)

## 📱 Compatibilidade

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Edge 79+
- ✅ Safari 12+

## 📄 Licença

Este projeto é de código aberto. Sinta-se livre para usar, modificar e distribuir.

---

**WikiLocal** - Sua enciclopédia local simples e eficiente! 🚀
