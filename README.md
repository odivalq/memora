# 📚 Memora

Um espaço digital seguro e modular para grupos pequenos colaborarem de forma lúdica, simples e eficiente.

Este app funciona como uma wikipédia local, privada. Uma espécie de base de conhecimento interna do grupo, onde membros podem postar "entradas" de diferentes tipos (Ideia, Tarefa, Receita, Fluxo, Meta) e organizá-las por categoria.

## ✨ Características

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

## 📱 Compatibilidade

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Edge 79+
- ✅ Safari 12+

## 📄 Licença

Este projeto é de código aberto. Sinta-se livre para usar, modificar e distribuir.

---

**Memora** - Sua enciclopédia local simples e eficiente! 🚀
