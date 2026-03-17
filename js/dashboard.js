/**
 * Dashboard - Lógica de Gerenciamento de Nichos
 * Controla a interface do dashboard e interações com o backend
 */

// ============================================
// ESTADO GLOBAL
// ============================================

let estado = {
  nichos: [],
  nichoAtual: null,
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

    // Configurar event listeners
    configurarEventListeners();

    // Carregar dados iniciais
    await carregarDashboard();

  } catch (error) {
    console.error('Erro na inicialização do dashboard:', error);
    mostrarErro('Erro ao carregar dashboard. Tente recarregar a página.');
  }
});

// ============================================
// CARREGAMENTO DE DADOS
// ============================================

/**
 * Carrega o dashboard completo
 */
async function carregarDashboard() {
  estado.carregando = true;
  mostrarLoading(true);

  try {
    // Carregar nichos do usuário
    estado.nichos = await WikiSupabase.buscarNichos();
    
    // Atualizar interface
    atualizarInterface();
    
  } catch (error) {
    console.error('Erro ao carregar nichos:', error);
    mostrarErro('Erro ao carregar nichos. Verifique sua conexão e tente novamente.');
  } finally {
    estado.carregando = false;
    mostrarLoading(false);
  }
}

/**
 * Atualiza a interface baseado no estado atual
 */
function atualizarInterface() {
  const welcomeSection = document.getElementById('welcomeSection');
  const nichosSection = document.getElementById('nichosSection');
  const emptyState = document.getElementById('emptyState');
  const nichosGrid = document.getElementById('nichosGrid');
  const nichosStats = document.getElementById('nichosStats');

  // Atualizar estatísticas gerais
  atualizarEstatisticasGerais();

  if (estado.nichos.length === 0) {
    // Mostrar estado vazio
    welcomeSection.classList.remove('hidden');
    nichosSection.classList.add('hidden');
    emptyState.classList.remove('hidden');
    nichosGrid.innerHTML = '';
  } else {
    // Mostrar nichos
    welcomeSection.classList.add('hidden');
    nichosSection.classList.remove('hidden');
    emptyState.classList.add('hidden');
    renderizarNichos();
  }
}

/**
 * Atualiza as estatísticas gerais do dashboard
 */
async function atualizarEstatisticasGerais() {
  const nichosStats = document.getElementById('nichosStats');
  if (!nichosStats) return;

  const totalNichos = estado.nichos.length;
  let totalCategorias = 0;
  let totalEntradas = 0;

  // Calcular estatísticas de todos os nichos
  for (const nicho of estado.nichos) {
    const stats = await WikiSupabase.obterEstatisticasNicho(nicho.id);
    totalCategorias += stats.categorias;
    totalEntradas += stats.entradas;
  }

  nichosStats.innerHTML = `
    <span class="stat-item">${totalNichos} nicho${totalNichos !== 1 ? 's' : ''}</span>
    <span class="stat-divider">•</span>
    <span class="stat-item">${totalCategorias} categoria${totalCategorias !== 1 ? 's' : ''}</span>
    <span class="stat-divider">•</span>
    <span class="stat-item">${totalEntradas} entrada${totalEntradas !== 1 ? 's' : ''}</span>
  `;
}

// ============================================
// RENDERIZAÇÃO
// ============================================

/**
 * Renderiza o grid de nichos
 */
async function renderizarNichos() {
  const grid = document.getElementById('nichosGrid');
  if (!grid) return;

  if (estado.nichos.length === 0) {
    grid.innerHTML = '';
    return;
  }

  // Carregar estatísticas de cada nicho em paralelo
  const nichosComStats = await Promise.all(
    estado.nichos.map(async (nicho) => {
      const stats = await WikiSupabase.obterEstatisticasNicho(nicho.id);
      return { ...nicho, stats };
    })
  );

  grid.innerHTML = nichosComStats.map(nicho => `
    <div class="nicho-card" data-nicho-id="${nicho.id}">
      <div class="nicho-header">
        <div class="nicho-icon" style="background-color: ${nicho.cor}">
          ${nicho.icone || '🏠'}
        </div>
        <div class="nicho-info">
          <h3>${nicho.nome}</h3>
          <p>${nicho.descricao || 'Sem descrição'}</p>
        </div>
      </div>
      
      <div class="nicho-stats">
        <div class="stat-box">
          <span class="stat-number">${nicho.stats.categorias}</span>
          <span class="stat-label">Categorias</span>
        </div>
        <div class="stat-box">
          <span class="stat-number">${nicho.stats.entradas}</span>
          <span class="stat-label">Entradas</span>
        </div>
      </div>
      
      <div class="nicho-actions">
        <a href="index.html?nicho=${nicho.id}" class="nicho-btn nicho-btn-primary">
          <span>📁</span>
          <span>Acessar Nicho</span>
        </a>
        <button class="nicho-btn nicho-btn-secondary" onclick="abrirModalEditar('${nicho.id}')">
          <span>✏️</span>
          <span>Editar</span>
        </button>
        <button class="nicho-btn nicho-btn-danger" onclick="abrirModalExcluir('${nicho.id}', '${nicho.nome}')">
          <span>🗑️</span>
          <span>Excluir</span>
        </button>
      </div>
    </div>
  `).join('');
}

// ============================================
// MODAIS
// ============================================

/**
 * Abre o modal para criar/editar nicho
 */
function abrirModalCriar() {
  const modal = document.getElementById('nichoModalOverlay');
  const modalTitle = document.getElementById('modalTitle');
  const nichoForm = document.getElementById('nichoForm');
  
  // Configurar modal para criação
  modalTitle.textContent = 'Novo Nicho';
  nichoForm.reset();
  
  // Valores padrão
  document.getElementById('nichoIcone').value = '🏠';
  document.getElementById('nichoCor').value = '#3366cc';
  document.getElementById('colorPreview').textContent = '#3366cc';
  
  modal.classList.add('active');
}

function abrirModalEditar(nichoId) {
  const nicho = estado.nichos.find(n => n.id === nichoId);
  if (!nicho) return;

  const modal = document.getElementById('nichoModalOverlay');
  const modalTitle = document.getElementById('modalTitle');
  const modalSaveBtn = document.getElementById('modalSaveBtn');
  const modalSaveText = document.getElementById('modalSaveText');
  
  // Configurar modal para edição
  modalTitle.textContent = 'Editar Nicho';
  modalSaveText.textContent = 'Salvar Alterações';
  modalSaveBtn.onclick = () => salvarNicho(nichoId);
  
  // Preencher formulário
  document.getElementById('nichoNome').value = nicho.nome;
  document.getElementById('nichoDescricao').value = nicho.descricao || '';
  document.getElementById('nichoIcone').value = nicho.icone || '🏠';
  document.getElementById('nichoCor').value = nicho.cor || '#3366cc';
  document.getElementById('colorPreview').textContent = nicho.cor || '#3366cc';
  
  modal.classList.add('active');
}

/**
 * Abre o modal de exclusão
 */
function abrirModalExcluir(nichoId, nomeNicho) {
  const modal = document.getElementById('deleteModalOverlay');
  const deleteModalConfirmBtn = document.getElementById('deleteModalConfirmBtn');
  
  // Configurar botão de confirmação
  deleteModalConfirmBtn.onclick = () => excluirNicho(nichoId);
  
  modal.classList.add('active');
}

// ============================================
// AÇÕES DE NICHOS
// ============================================

/**
 * Salva um nicho (criar ou editar)
 */
async function salvarNicho(nichoId = null) {
  const modal = document.getElementById('nichoModalOverlay');
  const modalSaveBtn = document.getElementById('modalSaveBtn');
  const modalSaveText = document.getElementById('modalSaveText');
  const modalLoading = document.getElementById('modalLoading');

  // Obter dados do formulário
  const nome = document.getElementById('nichoNome').value.trim();
  const descricao = document.getElementById('nichoDescricao').value.trim();
  const icone = document.getElementById('nichoIcone').value.trim() || '🏠';
  const cor = document.getElementById('nichoCor').value;

  // Validar dados
  if (!nome) {
    mostrarErro('Nome do nicho é obrigatório.');
    return;
  }

  if (nome.length > 100) {
    mostrarErro('Nome do nicho deve ter no máximo 100 caracteres.');
    return;
  }

  // Preparar dados
  const dadosNicho = {
    nome,
    descricao,
    icone,
    cor
  };

  // Mostrar loading
  modalSaveBtn.disabled = true;
  modalSaveText.style.display = 'none';
  modalLoading.style.display = 'block';

  try {
    let resultado;

    if (nichoId) {
      // Editar nicho existente
      resultado = await WikiSupabase.atualizarNicho(nichoId, dadosNicho);
    } else {
      // Criar novo nicho
      resultado = await WikiSupabase.criarNicho(dadosNicho);
    }

    if (resultado) {
      // Fechar modal e recarregar
      modal.classList.remove('active');
      await carregarDashboard();
      mostrarSucesso(nichoId ? 'Nicho atualizado com sucesso!' : 'Nicho criado com sucesso!');
    } else {
      throw new Error('Erro ao salvar nicho.');
    }

  } catch (error) {
    console.error('Erro ao salvar nicho:', error);
    mostrarErro(error.message || 'Erro ao salvar nicho. Tente novamente.');
  } finally {
    // Restaurar botão
    modalSaveBtn.disabled = false;
    modalSaveText.style.display = 'inline';
    modalLoading.style.display = 'none';
  }
}

/**
 * Exclui um nicho
 */
async function excluirNicho(nichoId) {
  const modal = document.getElementById('deleteModalOverlay');
  const deleteModalConfirmBtn = document.getElementById('deleteModalConfirmBtn');
  const deleteModalText = document.getElementById('deleteModalText');
  const deleteModalLoading = document.getElementById('deleteModalLoading');

  // Mostrar loading
  deleteModalConfirmBtn.disabled = true;
  deleteModalText.style.display = 'none';
  deleteModalLoading.style.display = 'block';

  try {
    const sucesso = await WikiSupabase.excluirNicho(nichoId);

    if (sucesso) {
      // Fechar modal e recarregar
      modal.classList.remove('active');
      await carregarDashboard();
      mostrarSucesso('Nicho excluído com sucesso!');
    } else {
      throw new Error('Erro ao excluir nicho.');
    }

  } catch (error) {
    console.error('Erro ao excluir nicho:', error);
    mostrarErro(error.message || 'Erro ao excluir nicho. Tente novamente.');
  } finally {
    // Restaurar botão
    deleteModalConfirmBtn.disabled = false;
    deleteModalText.style.display = 'inline';
    deleteModalLoading.style.display = 'none';
  }
}

// ============================================
// BUSCA
// ============================================

/**
 * Realiza busca de nichos
 */
async function buscarNichos(termo) {
  const searchResultsSection = document.getElementById('searchResultsSection');
  const searchResultsCount = document.getElementById('searchResultsCount');
  const searchResultsList = document.getElementById('searchResultsList');
  const nichosSection = document.getElementById('nichosSection');

  if (!termo || termo.trim() === '') {
    searchResultsSection.classList.add('hidden');
    nichosSection.classList.remove('hidden');
    return;
  }

  // Mostrar loading
  searchResultsList.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="loading" style="margin: 0 auto 20px;"></div>Buscando...</div>';

  // Filtrar nichos localmente (já carregados)
  const termoLower = termo.toLowerCase();
  const resultados = estado.nichos.filter(nicho => 
    nicho.nome.toLowerCase().includes(termoLower) ||
    (nicho.descricao && nicho.descricao.toLowerCase().includes(termoLower))
  );

  searchResultsSection.classList.remove('hidden');
  nichosSection.classList.add('hidden');

  searchResultsCount.textContent = `${resultados.length} resultado(s) para "${termo}"`;

  if (resultados.length === 0) {
    searchResultsList.innerHTML = `
      <div class="sem-resultados">
        <div class="sem-resultados-icon">🔍</div>
        <h3>Nenhum nicho encontrado</h3>
        <p>Tente buscar com termos diferentes.</p>
      </div>
    `;
    return;
  }

  // Carregar estatísticas para os resultados
  const resultadosComStats = await Promise.all(
    resultados.map(async (nicho) => {
      const stats = await WikiSupabase.obterEstatisticasNicho(nicho.id);
      return { ...nicho, stats };
    })
  );

  searchResultsList.innerHTML = resultadosComStats.map(nicho => `
    <div class="resultado-nicho" onclick="window.location.href='index.html?nicho=${nicho.id}'">
      <div class="resultado-icon" style="background-color: ${nicho.cor}">
        ${nicho.icone || '🏠'}
      </div>
      <div class="resultado-info">
        <h4>${nicho.nome}</h4>
        <p>${nicho.descricao || 'Sem descrição'}</p>
      </div>
    </div>
  `).join('');
}

// ============================================
// EVENT LISTENERS
// ============================================

function configurarEventListeners() {
  // Botões de ação
  document.getElementById('btnNovoNicho')?.addEventListener('click', abrirModalCriar);
  document.getElementById('btnGetStarted')?.addEventListener('click', abrirModalCriar);
  document.getElementById('btnCreateFirstNicho')?.addEventListener('click', abrirModalCriar);

  // Modal de nicho
  document.getElementById('modalCloseBtn')?.addEventListener('click', () => {
    document.getElementById('nichoModalOverlay').classList.remove('active');
  });

  document.getElementById('modalCancelBtn')?.addEventListener('click', () => {
    document.getElementById('nichoModalOverlay').classList.remove('active');
  });

  document.getElementById('modalSaveBtn')?.addEventListener('click', () => salvarNicho());

  // Modal de exclusão
  document.getElementById('deleteModalCloseBtn')?.addEventListener('click', () => {
    document.getElementById('deleteModalOverlay').classList.remove('active');
  });

  document.getElementById('deleteModalCancelBtn')?.addEventListener('click', () => {
    document.getElementById('deleteModalOverlay').classList.remove('active');
  });

  // Seletor de ícones
  document.querySelectorAll('.icon-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const icone = btn.dataset.icon;
      document.getElementById('nichoIcone').value = icone;
    });
  });

  // Seletor de cores
  document.getElementById('nichoCor')?.addEventListener('input', (e) => {
    document.getElementById('colorPreview').textContent = e.target.value;
  });

  // Busca
  const searchInput = document.getElementById('searchNichosInput');
  const searchBtn = document.getElementById('searchNichosBtn');

  if (searchInput) {
    let timeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        buscarNichos(e.target.value);
      }, 300);
    });

    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        buscarNichos(e.target.value);
      }
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      buscarNichos(searchInput.value);
    });
  }

  // Fechar modais ao clicar fora
  document.addEventListener('click', (e) => {
    const nichoModal = document.getElementById('nichoModalOverlay');
    const deleteModal = document.getElementById('deleteModalOverlay');
    
    if (nichoModal && nichoModal.classList.contains('active')) {
      if (!nichoModal.querySelector('.modal').contains(e.target)) {
        nichoModal.classList.remove('active');
      }
    }
    
    if (deleteModal && deleteModal.classList.contains('active')) {
      if (!deleteModal.querySelector('.modal').contains(e.target)) {
        deleteModal.classList.remove('active');
      }
    }
  });
}

// ============================================
// FUNÇÕES DE UTILIDADE
// ============================================

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
  console.log(show ? 'Carregando...' : 'Carregamento concluído');
}

// ============================================
// FUNÇÕES GLOBAIS (para onclick nos botões)
// ============================================

window.abrirModalCriar = abrirModalCriar;
window.abrirModalEditar = abrirModalEditar;
window.abrirModalExcluir = abrirModalExcluir;
