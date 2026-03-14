/**
 * Editor Nicho - Lógica de Criação/Edição de Conteúdo em Nichos
 * Controla a interface do editor adaptado para nichos
 */

// ============================================
// ESTADO GLOBAL
// ============================================

let estado = {
  nichoId: null,
  nicho: null,
  categorias: [],
  entradaAtual: null,
  carregando: false,
  usuario: null
};

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async function () {
  try {
    // Verificar autenticação
    estado.usuario = await verificarAutenticacao();
    if (!estado.usuario) return;

    // Inicializar Supabase
    WikiSupabase.inicializarSupabase();

    // Obter parâmetro da URL
    const urlParams = new URLSearchParams(window.location.search);
    estado.nichoId = urlParams.get('nicho');
    const entradaId = urlParams.get('id');

    // Configurar event listeners
    configurarEventListeners();

    // Carregar dados iniciais
    await carregarEditor(entradaId);

  } catch (error) {
    console.error('Erro na inicialização do editor:', error);
    mostrarErro('Erro ao carregar editor. Tente recarregar a página.');
  }
});

// ============================================
// CARREGAMENTO DE DADOS
// ============================================

/**
 * Carrega o editor com os dados necessários
 */
async function carregarEditor(entradaId) {
  if (!estado.nichoId) {
    // Se não houver nicho na URL, redirecionar para dashboard
    window.location.href = 'dashboard.html';
    return;
  }

  estado.carregando = true;
  mostrarLoading(true);

  try {
    // Validar acesso ao nicho
    const temAcesso = await WikiSupabase.validarAcessoNicho(estado.nichoId);
    if (!temAcesso) {
      throw new Error('Acesso negado ao nicho ou nicho não encontrado.');
    }

    // Carregar nicho
    estado.nicho = await WikiSupabase.buscarNichoPorId(estado.nichoId);
    if (!estado.nicho) {
      throw new Error('Nicho não encontrado.');
    }

    // Atualizar interface do header
    atualizarHeader();

    // Carregar categorias do nicho
    estado.categorias = await WikiSupabase.buscarCategoriasPorNicho(estado.nichoId);

    // Carregar entrada se houver ID
    if (entradaId) {
      estado.entradaAtual = await WikiSupabase.buscarEntradaPorId(entradaId);
      if (!estado.entradaAtual) {
        throw new Error('Entrada não encontrada.');
      }
    }

    // Atualizar interface
    atualizarInterface();

  } catch (error) {
    console.error('Erro ao carregar editor:', error);
    mostrarErroAcessoNegado(error.message);
  } finally {
    estado.carregando = false;
    mostrarLoading(false);
  }
}

/**
 * Atualiza o header com informações do nicho
 */
function atualizarHeader() {
  if (!estado.nicho) return;

  // Atualizar título da página
  document.title = `Editor - ${estado.nicho.nome}`;

  // Atualizar botão de voltar para incluir o nicho
  const btnVoltar = document.getElementById('btnVoltar');
  if (btnVoltar) {
    btnVoltar.href = `index.html?nicho=${estado.nicho.id}`;
  }
}

// ============================================
// RENDERIZAÇÃO
// ============================================

/**
 * Atualiza a interface baseado no estado atual
 */
function atualizarInterface() {
  // Atualizar título do editor
  const editorTitulo = document.getElementById('editorTitulo');
  if (editorTitulo) {
    editorTitulo.textContent = estado.entradaAtual ? 'Editar Entrada' : 'Nova Entrada';
  }

  // Renderizar categorias
  renderizarCategorias();

  // Preencher formulário se houver entrada
  if (estado.entradaAtual) {
    preencherFormulario(estado.entradaAtual);
  }
}

/**
 * Renderiza as categorias no select
 */
function renderizarCategorias() {
  const selectCategoria = document.getElementById('categoria');
  if (!selectCategoria) return;

  // Limpar opções existentes (exceto a primeira)
  selectCategoria.innerHTML = '<option value="">Selecione uma categoria...</option>';

  if (estado.categorias.length === 0) {
    selectCategoria.innerHTML += '<option value="nova">Criar nova categoria</option>';
  } else {
    estado.categorias.forEach(categoria => {
      const option = document.createElement('option');
      option.value = categoria.id;
      option.textContent = categoria.nome;
      selectCategoria.appendChild(option);
    });
    selectCategoria.innerHTML += '<option value="nova">Criar nova categoria</option>';
  }
}

/**
 * Preenche o formulário com os dados da entrada
 */
function preencherFormulario(entrada) {
  document.getElementById('titulo').value = entrada.titulo;
  document.getElementById('categoria').value = entrada.categoria_id;
  document.getElementById('conteudo').value = entrada.conteudo;
  
  // Atualizar preview
  atualizarPreview();
}

// ============================================
// CONTROLE DE CATEGORIAS
// ============================================

/**
 * Controla a exibição dos campos de nova categoria
 */
function controlarNovaCategoria() {
  const selectCategoria = document.getElementById('categoria');
  const novaCategoriaGroup = document.getElementById('novaCategoriaGroup');
  const iconeCategoriaGroup = document.getElementById('iconeCategoriaGroup');
  const corCategoriaGroup = document.getElementById('corCategoriaGroup');

  if (selectCategoria.value === 'nova') {
    novaCategoriaGroup.classList.remove('hidden');
    iconeCategoriaGroup.classList.remove('hidden');
    corCategoriaGroup.classList.remove('hidden');
  } else {
    novaCategoriaGroup.classList.add('hidden');
    iconeCategoriaGroup.classList.add('hidden');
    corCategoriaGroup.classList.add('hidden');
  }
}

// ============================================
// SALVAMENTO DE DADOS
// ============================================

/**
 * Salva a entrada (criar ou editar)
 */
async function salvarEntrada() {
  const form = document.getElementById('editorForm');
  const formData = new FormData(form);

  // Obter dados do formulário
  const titulo = document.getElementById('titulo').value.trim();
  const categoriaId = document.getElementById('categoria').value;
  const conteudo = document.getElementById('conteudo').value.trim();
  const novaCategoria = document.getElementById('novaCategoria').value.trim();
  const iconeCategoria = document.getElementById('iconeCategoria').value.trim() || '📁';
  const corCategoria = document.getElementById('corCategoria').value;

  // Validar dados
  if (!titulo) {
    mostrarErro('Título é obrigatório.');
    return;
  }

  if (!categoriaId) {
    mostrarErro('Categoria é obrigatória.');
    return;
  }

  if (!conteudo) {
    mostrarErro('Conteúdo é obrigatório.');
    return;
  }

  let categoriaFinalId = categoriaId;

  // Se for criar nova categoria
  if (categoriaId === 'nova') {
    if (!novaCategoria) {
      mostrarErro('Nome da nova categoria é obrigatório.');
      return;
    }

    // Criar nova categoria
    const novaCategoriaData = {
      nome: novaCategoria,
      icone: iconeCategoria,
      cor: corCategoria,
      descricao: ''
    };

    const categoriaCriada = await WikiSupabase.criarCategoriaEmNicho(estado.nichoId, novaCategoriaData);
    if (!categoriaCriada) {
      mostrarErro('Erro ao criar categoria. Tente novamente.');
      return;
    }

    categoriaFinalId = categoriaCriada.id;
    estado.categorias.push(categoriaCriada);
    renderizarCategorias();
  }

  // Preparar dados da entrada
  const dadosEntrada = {
    titulo,
    slug: gerarSlug(titulo),
    categoria_id: categoriaFinalId,
    conteudo,
    nicho_id: estado.nichoId
  };

  try {
    let resultado;

    if (estado.entradaAtual) {
      // Editar entrada existente
      resultado = await WikiSupabase.atualizarEntradaEmNicho(estado.nichoId, estado.entradaAtual.id, dadosEntrada);
    } else {
      // Criar nova entrada
      resultado = await WikiSupabase.criarEntradaEmNicho(estado.nichoId, dadosEntrada);
    }

    if (resultado) {
      mostrarSucesso(estado.entradaAtual ? 'Entrada atualizada com sucesso!' : 'Entrada criada com sucesso!');
      window.location.href = `index.html?nicho=${estado.nichoId}`;
    } else {
      throw new Error('Erro ao salvar entrada.');
    }

  } catch (error) {
    console.error('Erro ao salvar entrada:', error);
    mostrarErro(error.message || 'Erro ao salvar entrada. Tente novamente.');
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

function configurarEventListeners() {
  // Controle de nova categoria
  document.getElementById('categoria')?.addEventListener('change', controlarNovaCategoria);

  // Formulário de salvamento
  document.getElementById('editorForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await salvarEntrada();
  });

  // Preview do conteúdo
  document.getElementById('conteudo')?.addEventListener('input', atualizarPreview);

  // Toolbar do editor
  configurarToolbar();
}

/**
 * Configura a toolbar de formatação
 */
function configurarToolbar() {
  const toolbar = document.querySelector('.editor-toolbar');
  const textarea = document.getElementById('conteudo');

  if (!toolbar || !textarea) return;

  toolbar.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag;
      inserirTag(tag, textarea);
    });
  });
}

/**
 * Insere tags HTML no textarea
 */
function inserirTag(tag, textarea) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  let tagOpen = '';
  let tagClose = '';
  let placeholder = '';

  switch (tag) {
    case 'h2':
      tagOpen = '<h2>';
      tagClose = '</h2>';
      placeholder = 'Título H2';
      break;
    case 'h3':
      tagOpen = '<h3>';
      tagClose = '</h3>';
      placeholder = 'Título H3';
      break;
    case 'b':
      tagOpen = '<strong>';
      tagClose = '</strong>';
      placeholder = 'texto em negrito';
      break;
    case 'i':
      tagOpen = '<em>';
      tagClose = '</em>';
      placeholder = 'texto em itálico';
      break;
    case 'a':
      tagOpen = '<a href="URL">';
      tagClose = '</a>';
      placeholder = 'texto do link';
      break;
    case 'ul':
      tagOpen = '<ul>\n  <li>';
      tagClose = '</li>\n</ul>';
      placeholder = 'Item da lista';
      break;
    case 'ol':
      tagOpen = '<ol>\n  <li>';
      tagClose = '</li>\n</ol>';
      placeholder = 'Item da lista numerada';
      break;
    case 'table':
      tagOpen = '<table>\n  <tr>\n    <th>Cabeçalho</th>\n  </tr>\n  <tr>\n    <td>Conteúdo</td>\n  </tr>\n</table>';
      tagClose = '';
      placeholder = '';
      break;
    case 'code':
      tagOpen = '<code>';
      tagClose = '</code>';
      placeholder = 'código';
      break;
    case 'quote':
      tagOpen = '<blockquote>';
      tagClose = '</blockquote>';
      placeholder = 'Citação...';
      break;
    case 'info':
      tagOpen = '<div class="info-box">';
      tagClose = '</div>';
      placeholder = 'Informação importante...';
      break;
    case 'warning':
      tagOpen = '<div class="warning-box">';
      tagClose = '</div>';
      placeholder = 'Atenção...';
      break;
  }

  if (placeholder && !tagClose) {
    // Para tags que não têm fechamento (como table)
    const newText = text.substring(0, start) + tagOpen + text.substring(end);
    textarea.value = newText;
  } else {
    const selectedText = text.substring(start, end) || placeholder;
    const newText = text.substring(0, start) + tagOpen + selectedText + tagClose + text.substring(end);
    textarea.value = newText;
  }

  // Posicionar cursor no final da tag aberta
  const newPos = start + tagOpen.length + selectedText.length;
  textarea.selectionStart = newPos;
  textarea.selectionEnd = newPos;
  textarea.focus();

  // Atualizar preview
  atualizarPreview();
}

/**
 * Atualiza a pré-visualização do conteúdo
 */
function atualizarPreview() {
  const conteudo = document.getElementById('conteudo').value;
  const preview = document.getElementById('previewContent');

  if (!preview) return;

  if (!conteudo) {
    preview.innerHTML = '<p style="color: #999; font-style: italic;">O preview aparecerá aqui...</p>';
    return;
  }

  // Processar conteúdo para preview
  let processedContent = conteudo;

  // Adicionar classes para estilização de boxes
  processedContent = processedContent.replace(/<div class="info-box">/g, '<div class="info-box" style="background: #e7f3ff; border-left: 4px solid #2196f3; padding: 15px; margin: 10px 0; border-radius: 4px;">');
  processedContent = processedContent.replace(/<div class="warning-box">/g, '<div class="warning-box" style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 10px 0; border-radius: 4px;">');

  preview.innerHTML = processedContent;
}

// ============================================
// FUNÇÕES DE UTILIDADE
// ============================================

/**
 * Gera slug a partir do título
 */
function gerarSlug(titulo) {
  return titulo
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

/**
 * Mostra mensagem de erro de acesso negado
 */
function mostrarErroAcessoNegado(mensagem) {
  const mainContent = document.querySelector('.main-content');
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div class="container">
      <div style="text-align: center; padding: 60px 20px;">
        <div style="font-size: 4rem; margin-bottom: 20px;">🔒</div>
        <h2>Acesso Negado</h2>
        <p style="color: var(--cor-texto-claro); margin-bottom: 30px;">${mensagem}</p>
        <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
          <a href="dashboard.html" class="btn btn-primary">Voltar ao Dashboard</a>
          <a href="index.html" class="btn btn-secondary">Ver Nichos Públicos</a>
        </div>
      </div>
    </div>
  `;
}

/**
 * Mostra mensagem de erro
 */
function mostrarErro(mensagem) {
  // Implementar sistema de notificações
  alert('❌ ' + mensagem);
}

/**
 * Mostra mensagem de sucesso
 */
function mostrarSucesso(mensagem) {
  // Implementar sistema de notificações
  alert('✅ ' + mensagem);
}

/**
 * Mostra/oculta loading
 */
function mostrarLoading(show) {
  // Implementar loading global se necessário
  console.log(show ? 'Carregando editor...' : 'Carregamento concluído');
}

// ============================================
// INTEGRAÇÃO COM ARQUIVOS EXISTENTES
// ============================================

// Se houver funções globais de editor-supabase.js que precisamos, podemos reutilizar
if (typeof window.Editor !== 'undefined') {
  // Reutilizar funções de editor se já existirem
  window.Editor.atualizarPreview = atualizarPreview;
} else {
  window.Editor = {
    atualizarPreview
  };
}