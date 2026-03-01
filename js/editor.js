/**
 * WikiLocal - Editor de Entradas
 * Gerencia criação e edição de entradas
 */

// ============================================
// ESTADO DO EDITOR
// ============================================

let estadoEditor = {
  modoEdicao: false,
  entradaId: null,
  categorias: [],
  entrada: null
};

// ============================================
// INICIALIZAÇÃO
// ============================================

/**
 * Inicializa o editor
 */
function inicializarEditor() {
  // Carrega categorias
  estadoEditor.categorias = WikiLocal.carregarCategorias();
  
  // Popula select de categorias
  popularSelectCategorias();
  
  // Verifica se está em modo de edição
  const urlParams = new URLSearchParams(window.location.search);
  const entradaId = urlParams.get('id');
  
  if (entradaId) {
    estadoEditor.modoEdicao = true;
    estadoEditor.entradaId = entradaId;
    carregarEntradaParaEdicao(entradaId);
  }
  
  // Configura event listeners
  configurarEventListenersEditor();
}

/**
 * Popula o select de categorias
 */
function popularSelectCategorias() {
  const select = document.getElementById('categoria');
  if (!select) return;
  
  // Mantém a opção padrão
  select.innerHTML = '<option value="">Selecione uma categoria...</option>';
  
  // Adiciona categorias existentes
  estadoEditor.categorias.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = `${cat.icone || '📁'} ${cat.nome}`;
    select.appendChild(option);
  });
  
  // Opção para criar nova categoria
  const optionNova = document.createElement('option');
  optionNova.value = 'nova';
  optionNova.textContent = '➕ Criar nova categoria...';
  select.appendChild(optionNova);
}

/**
 * Carrega uma entrada existente para edição
 */
function carregarEntradaParaEdicao(entradaId) {
  const entrada = WikiLocal.carregarEntrada(entradaId);
  
  if (!entrada) {
    alert('Entrada não encontrada!');
    window.location.href = 'index.html';
    return;
  }
  
  estadoEditor.entrada = entrada;
  
  // Atualiza título da página
  document.getElementById('editorTitulo').textContent = 'Editar Entrada';
  
  // Preenche campos
  document.getElementById('titulo').value = entrada.titulo;
  document.getElementById('categoria').value = entrada.categoriaId;
  document.getElementById('conteudo').value = entrada.conteudo;
  
  // Atualiza preview
  atualizarPreview();
}

// ============================================
// EVENT LISTENERS
// ============================================

/**
 * Configura os event listeners do editor
 */
function configurarEventListenersEditor() {
  // Formulário
  const form = document.getElementById('editorForm');
  if (form) {
    form.addEventListener('submit', handleSubmit);
  }
  
  // Select de categoria - mostra/esconde campos de nova categoria
  const selectCategoria = document.getElementById('categoria');
  if (selectCategoria) {
    selectCategoria.addEventListener('change', (e) => {
      const mostrarNova = e.target.value === 'nova';
      document.getElementById('novaCategoriaGroup').classList.toggle('hidden', !mostrarNova);
      document.getElementById('iconeCategoriaGroup').classList.toggle('hidden', !mostrarNova);
      document.getElementById('corCategoriaGroup').classList.toggle('hidden', !mostrarNova);
    });
  }
  
  // Toolbar de formatação
  const toolbarBtns = document.querySelectorAll('.editor-toolbar button');
  toolbarBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tag = btn.dataset.tag;
      inserirTag(tag);
    });
  });
  
  // Preview em tempo real
  const textarea = document.getElementById('conteudo');
  if (textarea) {
    textarea.addEventListener('input', atualizarPreview);
  }
  
  // Busca (mesma da página principal)
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  
  if (searchInput && searchBtn) {
    searchBtn.addEventListener('click', () => {
      if (searchInput.value.trim()) {
        window.location.href = `index.html?busca=${encodeURIComponent(searchInput.value)}`;
      }
    });
    
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && searchInput.value.trim()) {
        window.location.href = `index.html?busca=${encodeURIComponent(searchInput.value)}`;
      }
    });
  }
}

// ============================================
// FORMATAÇÃO
// ============================================

/**
 * Insere uma tag HTML no textarea na posição do cursor
 */
function inserirTag(tag) {
  const textarea = document.getElementById('conteudo');
  const inicio = textarea.selectionStart;
  const fim = textarea.selectionEnd;
  const texto = textarea.value;
  const selecao = texto.substring(inicio, fim);
  
  let antes, depois, conteudo;
  
  switch (tag) {
    case 'h2':
      antes = '<h2>';
      depois = '</h2>';
      conteudo = selecao || 'Título';
      break;
    case 'h3':
      antes = '<h3>';
      depois = '</h3>';
      conteudo = selecao || 'Subtítulo';
      break;
    case 'b':
      antes = '<strong>';
      depois = '</strong>';
      conteudo = selecao || 'texto em negrito';
      break;
    case 'i':
      antes = '<em>';
      depois = '</em>';
      conteudo = selecao || 'texto em itálico';
      break;
    case 'a':
      antes = '<a href="https://">';
      depois = '</a>';
      conteudo = selecao || 'link';
      break;
    case 'ul':
      antes = '<ul>\n  <li>';
      depois = '</li>\n</ul>';
      conteudo = selecao || 'Item da lista';
      break;
    case 'ol':
      antes = '<ol>\n  <li>';
      depois = '</li>\n</ol>';
      conteudo = selecao || 'Item numerado';
      break;
    case 'table':
      antes = `<table>
  <tr>
    <th>Coluna 1</th>
    <th>Coluna 2</th>
  </tr>
  <tr>
    <td>`;
      depois = `</td>
    <td>Dado 2</td>
  </tr>
</table>`;
      conteudo = selecao || 'Dado 1';
      break;
    case 'code':
      antes = '<code>';
      depois = '</code>';
      conteudo = selecao || 'código';
      break;
    case 'quote':
      antes = '<blockquote>';
      depois = '</blockquote>';
      conteudo = selecao || 'Citação importante';
      break;
    case 'info':
      antes = '<div class="info-box">\n  <div class="info-box-titulo">ℹ️ Informação</div>\n  <p>';
      depois = '</p>\n</div>';
      conteudo = selecao || 'Texto informativo';
      break;
    case 'warning':
      antes = '<div class="alert alert-warning">\n  <strong>⚠️ Atenção:</strong> ';
      depois = '\n</div>';
      conteudo = selecao || 'Alerta importante';
      break;
    default:
      return;
  }
  
  const novoTexto = texto.substring(0, inicio) + antes + conteudo + depois + texto.substring(fim);
  textarea.value = novoTexto;
  
  // Reposiciona cursor
  const novaPosicao = inicio + antes.length + conteudo.length;
  textarea.setSelectionRange(novaPosicao, novaPosicao);
  textarea.focus();
  
  // Atualiza preview
  atualizarPreview();
}

/**
 * Atualiza o preview do conteúdo
 */
function atualizarPreview() {
  const conteudo = document.getElementById('conteudo').value;
  const preview = document.getElementById('previewContent');
  
  if (!conteudo.trim()) {
    preview.innerHTML = '<p style="color: #999; font-style: italic;">O preview aparecerá aqui...</p>';
    return;
  }
  
  preview.innerHTML = conteudo;
}

// ============================================
// SUBMISSÃO
// ============================================

/**
 * Processa o envio do formulário
 */
function handleSubmit(e) {
  e.preventDefault();
  
  // Validação
  const titulo = document.getElementById('titulo').value.trim();
  const categoriaId = document.getElementById('categoria').value;
  const conteudo = document.getElementById('conteudo').value.trim();
  
  if (!titulo) {
    alert('Por favor, informe o título da entrada.');
    document.getElementById('titulo').focus();
    return;
  }
  
  if (!categoriaId) {
    alert('Por favor, selecione uma categoria.');
    document.getElementById('categoria').focus();
    return;
  }
  
  if (!conteudo) {
    alert('Por favor, informe o conteúdo da entrada.');
    document.getElementById('conteudo').focus();
    return;
  }
  
  // Processa nova categoria se necessário
  let categoriaFinalId = categoriaId;
  
  if (categoriaId === 'nova') {
    const novaCategoriaNome = document.getElementById('novaCategoria').value.trim();
    
    if (!novaCategoriaNome) {
      alert('Por favor, informe o nome da nova categoria.');
      document.getElementById('novaCategoria').focus();
      return;
    }
    
    // Cria nova categoria
    const novaCategoria = {
      id: 'cat-' + Date.now(),
      nome: novaCategoriaNome,
      icone: document.getElementById('iconeCategoria').value || '📁',
      cor: document.getElementById('corCategoria').value,
      descricao: ''
    };
    
    const categorias = WikiLocal.carregarCategorias();
    categorias.push(novaCategoria);
    WikiLocal.salvarCategorias(categorias);
    
    categoriaFinalId = novaCategoria.id;
  }
  
  // Prepara dados da entrada
  const agora = new Date().toISOString();
  const entradaData = {
    id: estadoEditor.modoEdicao ? estadoEditor.entradaId : 'ent-' + Date.now(),
    titulo: titulo,
    slug: WikiLocal.slugify(titulo),
    categoriaId: categoriaFinalId,
    conteudo: conteudo,
    dataAtualizacao: agora
  };
  
  // Mantém data de criação original se estiver editando
  if (estadoEditor.modoEdicao && estadoEditor.entrada) {
    entradaData.dataCriacao = estadoEditor.entrada.dataCriacao;
  } else {
    entradaData.dataCriacao = agora;
  }
  
  // Salva entrada
  const entradas = WikiLocal.carregarEntradas();
  
  if (estadoEditor.modoEdicao) {
    // Atualiza entrada existente
    const index = entradas.findIndex(e => e.id === estadoEditor.entradaId);
    if (index !== -1) {
      entradas[index] = entradaData;
    }
  } else {
    // Adiciona nova entrada
    entradas.push(entradaData);
  }
  
  WikiLocal.salvarEntradas(entradas);
  
  // Redireciona para a entrada
  window.location.href = `entrada.html?id=${entradaData.id}`;
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Verifica se WikiLocal está disponível
  if (typeof WikiLocal === 'undefined') {
    console.error('WikiLocal não está disponível. Carregando app.js...');
    // Tenta carregar app.js dinamicamente
    const script = document.createElement('script');
    script.src = 'js/app.js';
    script.onload = inicializarEditor;
    document.head.appendChild(script);
  } else {
    inicializarEditor();
  }
});
