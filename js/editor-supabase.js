/**
 * WikiLocal - Editor de Entradas (Versão Supabase)
 * Gerencia criação e edição de entradas usando Supabase
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

async function inicializarEditor() {
  // Inicializa Supabase
  WikiSupabase.inicializarSupabase();
  
  // Carrega categorias
  estadoEditor.categorias = await WikiSupabase.buscarCategorias();
  
  // Popula select de categorias
  popularSelectCategorias();
  
  // Verifica se está em modo de edição
  const urlParams = new URLSearchParams(window.location.search);
  const entradaId = urlParams.get('id');
  
  if (entradaId) {
    estadoEditor.modoEdicao = true;
    estadoEditor.entradaId = entradaId;
    await carregarEntradaParaEdicao(entradaId);
  }
  
  // Configura event listeners
  configurarEventListenersEditor();
}

function popularSelectCategorias() {
  const select = document.getElementById('categoria');
  if (!select) return;
  
  select.innerHTML = '<option value="">Selecione uma categoria...</option>';
  
  estadoEditor.categorias.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = `${cat.icone || '📁'} ${cat.nome}`;
    select.appendChild(option);
  });
  
  const optionNova = document.createElement('option');
  optionNova.value = 'nova';
  optionNova.textContent = '➕ Criar nova categoria...';
  select.appendChild(optionNova);
}

async function carregarEntradaParaEdicao(entradaId) {
  const entrada = await WikiSupabase.buscarEntradaPorId(entradaId);
  
  if (!entrada) {
    alert('Entrada não encontrada!');
    window.location.href = 'index.html';
    return;
  }
  
  estadoEditor.entrada = entrada;
  
  document.getElementById('editorTitulo').textContent = 'Editar Entrada';
  document.getElementById('titulo').value = entrada.titulo;
  document.getElementById('categoria').value = entrada.categoria_id;
  document.getElementById('conteudo').value = entrada.conteudo;
  
  atualizarPreview();
}

// ============================================
// EVENT LISTENERS
// ============================================

function configurarEventListenersEditor() {
  const form = document.getElementById('editorForm');
  if (form) {
    form.addEventListener('submit', handleSubmit);
  }
  
  const selectCategoria = document.getElementById('categoria');
  if (selectCategoria) {
    selectCategoria.addEventListener('change', (e) => {
      const mostrarNova = e.target.value === 'nova';
      document.getElementById('novaCategoriaGroup').classList.toggle('hidden', !mostrarNova);
      document.getElementById('iconeCategoriaGroup').classList.toggle('hidden', !mostrarNova);
      document.getElementById('corCategoriaGroup').classList.toggle('hidden', !mostrarNova);
    });
  }
  
  const toolbarBtns = document.querySelectorAll('.editor-toolbar button');
  toolbarBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tag = btn.dataset.tag;
      inserirTag(tag);
    });
  });
  
  const textarea = document.getElementById('conteudo');
  if (textarea) {
    textarea.addEventListener('input', atualizarPreview);
  }
  
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
  
  const novaPosicao = inicio + antes.length + conteudo.length;
  textarea.setSelectionRange(novaPosicao, novaPosicao);
  textarea.focus();
  
  atualizarPreview();
}

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

async function handleSubmit(e) {
  e.preventDefault();
  
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
  
  let categoriaFinalId = categoriaId;
  
  if (categoriaId === 'nova') {
    const novaCategoriaNome = document.getElementById('novaCategoria').value.trim();
    
    if (!novaCategoriaNome) {
      alert('Por favor, informe o nome da nova categoria.');
      document.getElementById('novaCategoria').focus();
      return;
    }
    
    const novaCategoria = {
      id: 'cat-' + Date.now(),
      nome: novaCategoriaNome,
      icone: document.getElementById('iconeCategoria').value || '📁',
      cor: document.getElementById('corCategoria').value,
      descricao: ''
    };
    
    const categoriaCriada = await WikiSupabase.criarCategoria(novaCategoria);
    if (!categoriaCriada) {
      alert('Erro ao criar categoria. Tente novamente.');
      return;
    }
    
    categoriaFinalId = categoriaCriada.id;
  }
  
  const agora = new Date().toISOString();
  
  if (estadoEditor.modoEdicao) {
    // Atualiza entrada existente
    const dadosAtualizados = {
      titulo: titulo,
      slug: WikiLocal.slugify(titulo),
      categoria_id: categoriaFinalId,
      conteudo: conteudo,
      data_atualizacao: agora
    };
    
    const entradaAtualizada = await WikiSupabase.atualizarEntrada(estadoEditor.entradaId, dadosAtualizados);
    if (entradaAtualizada) {
      window.location.href = `entrada.html?id=${entradaAtualizada.id}`;
    } else {
      alert('Erro ao atualizar entrada. Tente novamente.');
    }
  } else {
    // Cria nova entrada
    const novaEntrada = {
      id: 'ent-' + Date.now(),
      titulo: titulo,
      slug: WikiLocal.slugify(titulo),
      categoria_id: categoriaFinalId,
      conteudo: conteudo,
      data_criacao: agora,
      data_atualizacao: agora
    };
    
    const entradaCriada = await WikiSupabase.criarEntrada(novaEntrada);
    if (entradaCriada) {
      window.location.href = `entrada.html?id=${entradaCriada.id}`;
    } else {
      alert('Erro ao criar entrada. Tente novamente.');
    }
  }
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  inicializarEditor();
});
