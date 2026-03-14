/**
 * Entrada Nicho - Lógica de Visualização de Entradas em Nichos
 * Controla a visualização de entradas específicas de um nicho
 */

// ============================================
// ESTADO GLOBAL
// ============================================

let estado = {
  nichoId: null,
  nicho: null,
  entrada: null,
  categorias: [],
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

    if (!entradaId) {
      // Se não houver ID da entrada, redirecionar para o nicho
      if (estado.nichoId) {
        window.location.href = `index.html?nicho=${estado.nichoId}`;
      } else {
        window.location.href = 'index.html';
      }
      return;
    }

    // Configurar event listeners
    configurarEventListeners();

    // Carregar dados iniciais
    await carregarEntrada(entradaId);

  } catch (error) {
    console.error('Erro na inicialização da entrada:', error);
    mostrarErro('Erro ao carregar entrada. Tente recarregar a página.');
  }
});

// ============================================
// CARREGAMENTO DE DADOS
// ============================================

/**
 * Carrega a entrada com os dados necessários
 */
async function carregarEntrada(entradaId) {
  if (!estado.nichoId) {
    // Se não houver nicho na URL, tentar obter o nicho da entrada
    estado.entrada = await WikiSupabase.buscarEntradaPorId(entradaId);
    if (!estado.entrada) {
      throw new Error('Entrada não encontrada.');
    }
    estado.nichoId = estado.entrada.nicho_id;
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

    // Carregar entrada (se ainda não estiver carregada)
    if (!estado.entrada) {
      estado.entrada = await WikiSupabase.buscarEntradaPorId(entradaId);
      if (!estado.entrada) {
        throw new Error('Entrada não encontrada.');
      }
    }

    // Carregar categorias do nicho
    estado.categorias = await WikiSupabase.buscarCategoriasPorNicho(estado.nichoId);

    // Atualizar interface
    atualizarInterface();

  } catch (error) {
    console.error('Erro ao carregar entrada:', error);
    mostrarErroAcessoNegado(error.message);
  } finally {
    estado.carregando = false;
    mostrarLoading(false);
  }
}

// ============================================
// RENDERIZAÇÃO
// ============================================

/**
 * Atualiza a interface baseado no estado atual
 */
function atualizarInterface() {
  // Atualizar título da página
  document.title = `${estado.entrada.titulo} - ${estado.nicho.nome}`;

  // Atualizar header
  atualizarHeader();

  // Renderizar entrada
  renderizarEntrada();

  // Renderizar categorias no sidebar
  renderizarCategoriasSidebar();

  // Configurar botões de ação
  configurarBotoesAcao();
}

/**
 * Atualiza o header com informações do nicho
 */
function atualizarHeader() {
  // Atualizar botão de voltar para incluir o nicho
  const btnVoltar = document.getElementById('btnVoltar');
  if (btnVoltar) {
    btnVoltar.href = `index.html?nicho=${estado.nicho.id}`;
  }
}

/**
 * Renderiza a entrada no conteúdo principal
 */
function renderizarEntrada() {
  const loading = document.getElementById('entradaLoading');
  const content = document.getElementById('entradaContent');
  const erro = document.getElementById('entradaErro');

  if (loading) loading.classList.add('hidden');
  if (content) content.classList.remove('hidden');
  if (erro) erro.classList.add('hidden');

  // Atualizar título
  const titulo = document.getElementById('entradaTitulo');
  if (titulo) {
    titulo.textContent = estado.entrada.titulo;
  }

  // Atualizar categoria
  const categoria = document.getElementById('entradaCategoria');
  if (categoria) {
    const categoriaNome = obterNomeCategoria(estado.entrada.categoria_id);
    const categoriaCor = obterCorCategoria(estado.entrada.categoria_id);
    const categoriaIcone = obterIconeCategoria(estado.entrada.categoria_id);
    
    categoria.innerHTML = `
      <span class="categoria-tag" style="background-color: ${categoriaCor}">
        ${categoriaIcone} ${categoriaNome}
      </span>
    `;
  }

  // Atualizar data
  const data = document.getElementById('entradaData');
  if (data) {
    const dataFormatada = formatarData(estado.entrada.created_at);
    data.textContent = `Publicado em ${dataFormatada}`;
  }

  // Atualizar conteúdo
  const body = document.getElementById('entradaBody');
  if (body) {
    // Processar conteúdo para estilização de boxes
    let processedContent = estado.entrada.conteudo;
    processedContent = processedContent.replace(/<div class="info-box">/g, '<div class="info-box" style="background: #e7f3ff; border-left: 4px solid #2196f3; padding: 15px; margin: 10px 0; border-radius: 4px;">');
    processedContent = processedContent.replace(/<div class="warning-box">/g, '<div class="warning-box" style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 10px 0; border-radius: 4px;">');
    body.innerHTML = processedContent;
  }
}

/**
 * Renderiza as categorias no sidebar
 */
function renderizarCategoriasSidebar() {
  const sidebarCategorias = document.getElementById('sidebarCategorias');
  if (!sidebarCategorias) return;

  sidebarCategorias.innerHTML = '';

  if (estado.categorias.length === 0) {
    sidebarCategorias.innerHTML = '<li><span style="color: #999; font-style: italic;">Nenhuma categoria</span></li>';
  } else {
    estado.categorias.forEach(categoria => {
      const li = document.createElement('li');
      const isActive = categoria.id === estado.entrada.categoria_id;
      const activeClass = isActive ? 'active' : '';
      
      li.innerHTML = `
        <a href="index.html?nicho=${estado.nichoId}&categoria=${categoria.id}" class="${activeClass}">
          ${categoria.icone} ${categoria.nome}
        </a>
      `;
      sidebarCategorias.appendChild(li);
    });
  }
}

/**
 * Configura os botões de ação (Editar, Excluir, Download)
 */
function configurarBotoesAcao() {
  // Botão de editar
  const btnEditar = document.getElementById('btnEditar');
  if (btnEditar) {
    btnEditar.href = `editar.html?nicho=${estado.nichoId}&id=${estado.entrada.id}`;
  }

  // Botão de download PDF
  const btnDownloadPDF = document.getElementById('btnDownloadPDF');
  if (btnDownloadPDF) {
    btnDownloadPDF.addEventListener('click', () => {
      gerarPDF();
    });
  }

  // Botão de excluir
  const btnExcluir = document.getElementById('btnExcluir');
  if (btnExcluir) {
    btnExcluir.addEventListener('click', () => {
      abrirModalExcluir();
    });
  }

  // Modal de exclusão
  configurarModalExcluir();
}

// ============================================
// FUNCIONALIDADES ADICIONAIS
// ============================================

/**
 * Gera PDF da entrada
 */
function gerarPDF() {
  const element = document.querySelector('.entrada-content');
  const options = {
    margin: 1,
    filename: `${estado.entrada.titulo.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'cm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(options).from(element).save();
}

/**
 * Abre o modal de exclusão
 */
function abrirModalExcluir() {
  const modal = document.getElementById('modalExcluir');
  if (modal) {
    modal.style.display = 'flex';
  }
}

/**
 * Configura o modal de exclusão
 */
function configurarModalExcluir() {
  const modal = document.getElementById('modalExcluir');
  const btnCancelar = document.getElementById('btnCancelarExcluir');
  const btnConfirmar = document.getElementById('btnConfirmarExcluir');

  if (!modal || !btnCancelar || !btnConfirmar) return;

  // Fechar modal ao clicar fora
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  // Cancelar exclusão
  btnCancelar.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // Confirmar exclusão
  btnConfirmar.addEventListener('click', async () => {
    await excluirEntrada();
  });
}

/**
 * Exclui a entrada
 */
async function excluirEntrada() {
  const modal = document.getElementById('modalExcluir');
  const btnExcluir = document.getElementById('btnExcluir');

  try {
    // Desabilitar botões
    if (btnExcluir) btnExcluir.disabled = true;
    if (modal) modal.style.display = 'none';

    // Excluir entrada
    const resultado = await WikiSupabase.excluirEntradaEmNicho(estado.nichoId, estado.entrada.id);
    
    if (resultado) {
      mostrarSucesso('Entrada excluída com sucesso!');
      // Redirecionar para o nicho
      window.location.href = `index.html?nicho=${estado.nichoId}`;
    } else {
      throw new Error('Erro ao excluir entrada.');
    }

  } catch (error) {
    console.error('Erro ao excluir entrada:', error);
    mostrarErro(error.message || 'Erro ao excluir entrada. Tente novamente.');
  } finally {
    // Reabilitar botão
    if (btnExcluir) btnExcluir.disabled = false;
  }
}

// ============================================
// FUNÇÕES DE UTILIDADE
// ============================================

/**
 * Obtém o nome da categoria pelo ID
 */
function obterNomeCategoria(categoriaId) {
  const categoria = estado.categorias.find(c => c.id === categoriaId);
  return categoria ? categoria.nome : 'Sem categoria';
}

/**
 * Obtém a cor da categoria pelo ID
 */
function obterCorCategoria(categoriaId) {
  const categoria = estado.categorias.find(c => c.id === categoriaId);
  return categoria ? categoria.cor : '#3366cc';
}

/**
 * Obtém o ícone da categoria pelo ID
 */
function obterIconeCategoria(categoriaId) {
  const categoria = estado.categorias.find(c => c.id === categoriaId);
  return categoria ? categoria.icone : '📁';
}

/**
 * Formata data para exibição
 */
function formatarData(dataString) {
  const data = new Date(dataString);
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
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
  console.log(show ? 'Carregando entrada...' : 'Carregamento concluído');
}

// ============================================
// EVENT LISTENERS
// ============================================

function configurarEventListeners() {
  // Eventos de busca (se necessário)
  // Eventos de navegação
  // Outros eventos específicos da página de entrada
}