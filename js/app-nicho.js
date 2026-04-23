/**
 * App Nicho - Lógica de Visualização de Nicho Específico
 * Controla a interface do index.html adaptado para nichos
 */

// ============================================
// ESTADO GLOBAL
// ============================================

let estado = {
  nichoId: null,
  nicho: null,
  categorias: [],
  entradas: [],
  categoriaAtual: null,
  entradaAtual: null,
  carregando: false,
  usuario: null,
  ehDono: false,
  membros: [],
  usuarioSelecionado: null,
  realtimeCanal: null,   // Phase 5: active Realtime channel
  perfis: {}             // Phase 5: cache UUID → nickname for updated_by display
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

    // Configurar event listeners
    configurarEventListeners();

    // Carregar dados iniciais
    await carregarNicho();

  } catch (error) {
    console.error('Erro na inicialização do nicho:', error);
    mostrarErro('Erro ao carregar nicho. Tente recarregar a página.');
  }
});

// ============================================
// CARREGAMENTO DE DADOS
// ============================================

/**
 * Carrega o nicho e seu conteúdo
 */
async function carregarNicho() {
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

    // Carregar categorias e entradas do nicho
    const { categorias, entradas } = await WikiSupabase.carregarConteudoNicho(estado.nichoId);
    estado.categorias = categorias;
    estado.entradas = entradas;

    // Atualizar interface
    atualizarInterface();

    // Phase 5: iniciar realtime e pré-carregar perfis dos editores em paralelo
    iniciarRealtimeNicho();
    carregarPerfisEditores();

  } catch (error) {
    console.error('Erro ao carregar nicho:', error);
    mostrarErroAcessoNegado(error.message);
  } finally {
    estado.carregando = false;
    mostrarLoading(false);
  }
}

/**
 * Atualiza o header e o nicho banner com informações do nicho
 */
function atualizarHeader() {
  if (!estado.nicho) return;

  document.title = `Memora - ${estado.nicho.nome}`;

  const btnNovaEntrada = document.getElementById('btnNovaEntrada');
  if (btnNovaEntrada) {
    btnNovaEntrada.href = `editar.html?nicho=${estado.nicho.id}`;
  }

  // Preenche e exibe o nicho banner
  const banner   = document.getElementById('nichoBanner');
  const bannerIcone = document.getElementById('nichoBannerIcone');
  const bannerNome  = document.getElementById('nichoBannerNome');
  const bannerDesc  = document.getElementById('nichoBannerDesc');

  if (bannerIcone) {
    bannerIcone.textContent = estado.nicho.icone || '🏠';
    bannerIcone.style.background = (estado.nicho.cor || '#3366cc') + '20';
  }
  if (bannerNome) bannerNome.textContent = estado.nicho.nome;
  if (bannerDesc) bannerDesc.textContent = estado.nicho.descricao || '';
  if (banner) banner.classList.remove('hidden');

  // Carrega info de compartilhamento de forma assíncrona (não bloqueia o render)
  carregarInfoCompartilhamento();
}

/**
 * Verifica ownership e carrega membros para popular o banner e controles de compartilhar
 */
async function carregarInfoCompartilhamento() {
  try {
    const [ehDono, membros] = await Promise.all([
      WikiSupabase.verificarSeEhDono(estado.nichoId),
      WikiSupabase.buscarMembrosNicho(estado.nichoId)
    ]);

    estado.ehDono = ehDono;
    estado.membros = membros;

    // Mostra botão de compartilhar apenas para o dono
    const btnCompartilhar = document.getElementById('btnCompartilhar');
    if (btnCompartilhar) {
      btnCompartilhar.style.display = ehDono ? 'inline-flex' : 'none';
    }

    // Badge "Compartilhado" para membros que não são donos
    const bannerNome = document.getElementById('nichoBannerNome');
    if (bannerNome && !ehDono && membros.length >= 0) {
      // Só adiciona se ainda não existir (evita duplicata em re-renders)
      if (!bannerNome.querySelector('.badge-compartilhado')) {
        const badge = document.createElement('span');
        badge.className = 'badge-compartilhado';
        badge.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Compartilhado`;
        bannerNome.appendChild(badge);
      }
    }

    // Renderiza avatares de membros
    renderizarMembrosPreview(membros);
  } catch (erro) {
    console.error('Erro ao carregar info de compartilhamento:', erro);
  }
}

/**
 * Renderiza avatares dos membros no banner
 */
function renderizarMembrosPreview(membros) {
  const container = document.getElementById('membrosPreview');
  if (!container || membros.length === 0) {
    if (container) container.innerHTML = '';
    return;
  }

  const cores = ['#28c98e', '#4a6fa5', '#e67e22', '#9b59b6', '#e74c3c'];
  const visiveis = membros.slice(0, 3);
  const extras   = membros.length - 3;

  container.innerHTML =
    visiveis.map((m, i) => {
      const inicial = (m.nickname || '?').charAt(0).toUpperCase();
      return `<div class="membro-avatar" style="background:${cores[i % cores.length]}" title="${escapeHtml(m.nickname)}">${inicial}</div>`;
    }).join('') +
    (extras > 0
      ? `<div class="membro-avatar membro-avatar-extra" title="${extras} outro(s) membro(s)">+${extras}</div>`
      : '');
}

// ============================================
// RENDERIZAÇÃO
// ============================================

/**
 * Atualiza a interface baseado no estado atual
 */
function atualizarInterface() {
  const categoriesSection = document.getElementById('categoriesSection');
  const allEntriesSection = document.getElementById('allEntriesSection');
  const searchResultsSection = document.getElementById('searchResultsSection');

  // Esconder todas as seções inicialmente
  categoriesSection.classList.add('hidden');
  allEntriesSection.classList.add('hidden');
  searchResultsSection.classList.add('hidden');

  // Verificar parâmetros da URL
  const urlParams = new URLSearchParams(window.location.search);
  const busca = urlParams.get('busca');
  const todas = urlParams.get('todas');

  if (busca) {
    renderizarResultadosBusca(busca);
  } else if (todas) {
    renderizarTodasEntradas();
  } else {
    renderizarCategorias();
  }
}

/**
 * Renderiza o grid de categorias do nicho
 */
async function renderizarCategorias() {
  const grid = document.getElementById('categoriasGrid');
  if (!grid) return;

  const entradasSemCat = estado.entradas.filter(e => !e.categoria_id);

  if (estado.categorias.length === 0 && entradasSemCat.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
        <div style="font-size: 3rem; margin-bottom: 15px;">📂</div>
        <h3>Nenhuma categoria encontrada</h3>
        <p style="color: var(--cor-texto-claro);">Crie sua primeira categoria ao adicionar uma entrada.</p>
        <a href="editar.html?nicho=${estado.nichoId}" class="btn btn-primary" style="margin-top: 20px;">Nova Entrada</a>
      </div>
    `;
    return;
  }

  const cardCategoria = (cat) => {
    const entradasCat = estado.entradas.filter(e => e.categoria_id === cat.id);
    const entradasHtml = entradasCat.slice(0, 5).map(e => `
      <li><a href="entrada.html?id=${e.id}&nicho=${estado.nichoId}">${e.titulo}</a></li>
    `).join('');
    const maisEntradas = entradasCat.length > 5
      ? `<li style="color: var(--cor-texto-claro); font-size: 0.85rem; padding: 6px 0;">+ ${entradasCat.length - 5} mais...</li>`
      : '';
    return `
      <div class="categoria-card">
        <div class="categoria-header">
          <div class="categoria-icon" style="background: ${cat.cor}20; color: ${cat.cor};">
            ${cat.icone || '📁'}
          </div>
          <div>
            <div class="categoria-titulo">${cat.nome}</div>
            <div class="categoria-contador">${entradasCat.length} entrada(s)</div>
          </div>
        </div>
        <ul class="entradas-lista">
          ${entradasHtml}
          ${maisEntradas}
        </ul>
      </div>
    `;
  };

  const cardSemCategoria = () => {
    const entradasHtml = entradasSemCat.slice(0, 5).map(e => `
      <li><a href="entrada.html?id=${e.id}&nicho=${estado.nichoId}">${e.titulo}</a></li>
    `).join('');
    const maisEntradas = entradasSemCat.length > 5
      ? `<li style="color: var(--cor-texto-claro); font-size: 0.85rem; padding: 6px 0;">+ ${entradasSemCat.length - 5} mais...</li>`
      : '';
    return `
      <div class="categoria-card">
        <div class="categoria-header">
          <div class="categoria-icon" style="background: #6b728020; color: #6b7280;">
            📁
          </div>
          <div>
            <div class="categoria-titulo">Sem categoria</div>
            <div class="categoria-contador">${entradasSemCat.length} entrada(s)</div>
          </div>
        </div>
        <ul class="entradas-lista">
          ${entradasHtml}
          ${maisEntradas}
        </ul>
      </div>
    `;
  };

  grid.innerHTML =
    estado.categorias.map(cat => cardCategoria(cat)).join('') +
    (entradasSemCat.length > 0 ? cardSemCategoria() : '');
  
  // Remover classe hidden da seção
  const categoriesSection = document.getElementById('categoriesSection');
  if (categoriesSection) {
    categoriesSection.classList.remove('hidden');
  }
}

/**
 * Renderiza resultados de busca no nicho
 */
async function renderizarResultadosBusca(termo) {
  const section = document.getElementById('searchResultsSection');
  const categoriesSection = document.getElementById('categoriesSection');
  const allEntriesSection = document.getElementById('allEntriesSection');
  const countEl = document.getElementById('searchResultsCount');
  const listEl = document.getElementById('searchResultsList');

  if (!termo || termo.trim() === '') {
    section.classList.add('hidden');
    categoriesSection.classList.remove('hidden');
    allEntriesSection.classList.add('hidden');
    return;
  }

  // Mostra loading
  listEl.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="loading" style="margin: 0 auto 20px;"></div>Buscando...</div>';

  const resultados = await WikiSupabase.buscarEntradasPorTermoNoNicho(estado.nichoId, termo);

  section.classList.remove('hidden');
  categoriesSection.classList.add('hidden');
  allEntriesSection.classList.add('hidden');

  countEl.textContent = `${resultados.length} resultado(s) para "${termo}"`;

  if (resultados.length === 0) {
    listEl.innerHTML = `
      <div class="sem-resultados">
        <div class="sem-resultados-icon">🔍</div>
        <h3>Nenhum resultado encontrado</h3>
        <p>Tente buscar com termos diferentes ou mais genéricos.</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = resultados.map(e => {
    const categoria = estado.categorias.find(c => c.id === e.categoria_id);
    return `
      <div class="resultado-item">
        <span class="resultado-categoria">${categoria ? categoria.nome : 'Sem categoria'}</span>
        <h3 class="resultado-titulo"><a href="entrada.html?id=${e.id}&nicho=${estado.nichoId}">${e.titulo}</a></h3>
        <p class="resultado-resumo">${extrairTexto(e.conteudo, 200)}</p>
      </div>
    `;
  }).join('');
}

/**
 * Renderiza todas as entradas do nicho
 */
async function renderizarTodasEntradas() {
  const section = document.getElementById('allEntriesSection');
  const categoriesSection = document.getElementById('categoriesSection');
  const searchResultsSection = document.getElementById('searchResultsSection');
  const listEl = document.getElementById('allEntriesList');

  if (!section) return;

  section.classList.remove('hidden');
  categoriesSection.classList.add('hidden');
  if (searchResultsSection) searchResultsSection.classList.add('hidden');

  // Agrupa por categoria
  const porCategoria = {};
  estado.entradas.forEach(e => {
    const catId = e.categoria_id || 'sem-categoria';
    if (!porCategoria[catId]) porCategoria[catId] = [];
    porCategoria[catId].push(e);
  });

  listEl.innerHTML = Object.entries(porCategoria).map(([catId, ents]) => {
    const categoria = estado.categorias.find(c => c.id === catId);
    const catNome = categoria ? categoria.nome : 'Sem Categoria';
    const catIcone = categoria ? categoria.icone : '📁';

    return `
      <div style="margin-bottom: 30px;">
        <h3 style="margin-bottom: 15px; color: var(--cor-primaria); display: flex; align-items: center; gap: 8px;">
          ${catIcone} ${catNome}
        </h3>
        <div style="display: grid; gap: 10px;">
          ${ents.map(e => {
            const editorNick = e.updated_by ? estado.perfis[e.updated_by] : null;
            const metaTexto = editorNick
              ? `${formatarData(e.data_atualizacao)} · editado por ${editorNick}`
              : formatarData(e.data_atualizacao);
            return `
            <a href="entrada.html?id=${e.id}&nicho=${estado.nichoId}" style="display: flex; align-items: center; gap: 10px; padding: 12px 15px; background: var(--cor-secundaria); border-radius: 6px; text-decoration: none; color: var(--cor-texto); transition: all 0.2s;">
              <span>📄</span>
              <span>${e.titulo}</span>
              <span style="margin-left: auto; font-size: 0.85rem; color: var(--cor-texto-claro);">${metaTexto}</span>
            </a>`;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// ============================================
// BUSCA
// ============================================

/**
 * Realiza busca no nicho
 */
async function buscarNoNicho(termo) {
  const searchInput = document.getElementById('searchInput');
  const searchResultsSection = document.getElementById('searchResultsSection');
  const searchResultsCount = document.getElementById('searchResultsCount');
  const searchResultsList = document.getElementById('searchResultsList');
  const categoriesSection = document.getElementById('categoriesSection');

  if (!termo || termo.trim() === '') {
    searchResultsSection.classList.add('hidden');
    categoriesSection.classList.remove('hidden');
    return;
  }

  // Mostrar loading
  searchResultsList.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="loading" style="margin: 0 auto 20px;"></div>Buscando...</div>';

  const resultados = await WikiSupabase.buscarEntradasPorTermoNoNicho(estado.nichoId, termo);

  searchResultsSection.classList.remove('hidden');
  categoriesSection.classList.add('hidden');

  searchResultsCount.textContent = `${resultados.length} resultado(s) para "${termo}"`;

  if (resultados.length === 0) {
    searchResultsList.innerHTML = `
      <div class="sem-resultados">
        <div class="sem-resultados-icon">🔍</div>
        <h3>Nenhum resultado encontrado</h3>
        <p>Tente buscar com termos diferentes.</p>
      </div>
    `;
    return;
  }

  searchResultsList.innerHTML = resultados.map(e => {
    const categoria = estado.categorias.find(c => c.id === e.categoria_id);
    return `
      <div class="resultado-item">
        <span class="resultado-categoria">${categoria ? categoria.nome : 'Sem categoria'}</span>
        <h3 class="resultado-titulo"><a href="entrada.html?id=${e.id}&nicho=${estado.nichoId}">${e.titulo}</a></h3>
        <p class="resultado-resumo">${extrairTexto(e.conteudo, 200)}</p>
      </div>
    `;
  }).join('');
}

// ============================================
// EVENT LISTENERS
// ============================================

function configurarEventListeners() {
  const searchInput = document.getElementById('searchInput');
  const searchBtn   = document.getElementById('searchBtn');

  if (searchInput) {
    let timeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => buscarNoNicho(e.target.value), 300);
    });
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') buscarNoNicho(e.target.value);
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => buscarNoNicho(searchInput.value));
  }

  // ---- Modal Compartilhar ----
  const btnCompartilhar   = document.getElementById('btnCompartilhar');
  const modalOverlay      = document.getElementById('modalCompartilharOverlay');
  const modalClose        = document.getElementById('modalCompartilharClose');
  const btnCancelar       = document.getElementById('btnCancelarCompartilhar');
  const btnConfirmar      = document.getElementById('btnConfirmarCompartilhar');
  const compartilharInput = document.getElementById('compartilharInput');
  const btnLimpar         = document.getElementById('btnLimparSelecao');

  if (btnCompartilhar) btnCompartilhar.addEventListener('click', abrirModalCompartilhar);
  if (modalClose)      modalClose.addEventListener('click', fecharModalCompartilhar);
  if (btnCancelar)     btnCancelar.addEventListener('click', fecharModalCompartilhar);
  if (btnConfirmar)    btnConfirmar.addEventListener('click', confirmarCompartilhar);

  if (btnLimpar) {
    btnLimpar.addEventListener('click', () => {
      limparSelecao();
      if (compartilharInput) compartilharInput.value = '';
      const dropdown = document.getElementById('compartilharDropdown');
      if (dropdown) dropdown.classList.add('hidden');
    });
  }

  // Busca com debounce no campo do modal
  if (compartilharInput) {
    let timeout;
    compartilharInput.addEventListener('input', (e) => {
      limparSelecao(); // Se o usuário alterar o texto, limpa a seleção anterior
      clearTimeout(timeout);
      timeout = setTimeout(() => buscarUsuariosDropdown(e.target.value), 300);
    });
  }

  // Clique no fundo do modal fecha
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) fecharModalCompartilhar();
    });
  }

  // Clique fora do dropdown fecha o dropdown
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('compartilharDropdown');
    const input    = document.getElementById('compartilharInput');
    if (dropdown && input && !dropdown.contains(e.target) && e.target !== input) {
      dropdown.classList.add('hidden');
    }
  });

  verificarParametrosURL();
}

function verificarParametrosURL() {
  const urlParams = new URLSearchParams(window.location.search);
  
  if (urlParams.has('todas')) {
    renderizarTodasEntradas();
  }
  
  const busca = urlParams.get('busca');
  if (busca) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.value = busca;
      renderizarResultadosBusca(busca);
    }
  }
}

// ============================================
// FUNÇÕES DE UTILIDADE
// ============================================

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
 * Mostra mensagem de erro via toast
 */
function mostrarErro(mensagem) {
  mostrarToast(mensagem, 'erro');
}

/**
 * Mostra mensagem de sucesso via toast
 */
function mostrarSucesso(mensagem) {
  mostrarToast(mensagem, 'sucesso');
}

/**
 * Mostra/oculta loading
 */
function mostrarLoading(show) {
  // Implementar loading global se necessário
  console.log(show ? 'Carregando nicho...' : 'Carregamento concluído');
}

// ============================================
// FUNÇÕES DE SUPORTE (copiadas do app-supabase.js)
// ============================================

function formatarData(dataString) {
  if (!dataString) return '';
  const data = new Date(dataString);
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

function extrairTexto(html, maxLength = 150) {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  let texto = temp.textContent || temp.innerText || '';
  texto = texto.replace(/\s+/g, ' ').trim();
  if (texto.length > maxLength) {
    texto = texto.substring(0, maxLength) + '...';
  }
  return texto;
}

// ============================================
// PHASE 5 — REALTIME & "LAST EDITED BY"
// ============================================

/**
 * Retorna qual view está visível agora: 'categorias' | 'todas' | 'busca'
 */
function viewAtual() {
  if (!document.getElementById('searchResultsSection')?.classList.contains('hidden')) return 'busca';
  if (!document.getElementById('allEntriesSection')?.classList.contains('hidden')) return 'todas';
  return 'categorias';
}

/**
 * Pré-carrega nicknames para todos os updated_by distintos nas entradas.
 * Populato estado.perfis para uso nas views de renderização.
 */
async function carregarPerfisEditores() {
  const ids = [...new Set(
    estado.entradas
      .map(e => e.updated_by)
      .filter(Boolean)
  )];

  if (!ids.length) return;

  try {
    const perfis = await WikiSupabase.buscarPerfisPorIds(ids);
    perfis.forEach(p => { estado.perfis[p.id] = p.nickname; });
  } catch (erro) {
    console.error('Erro ao carregar perfis dos editores:', erro);
  }
}

/**
 * Inicia a subscrição Realtime para categorias e entradas deste nicho.
 * Mudanças feitas por outros colaboradores são refletidas na UI sem recarregar.
 */
function iniciarRealtimeNicho() {
  if (!estado.nichoId) return;

  estado.realtimeCanal = WikiSupabase.iniciarRealtimeNicho(estado.nichoId, {
    onCategoria: handleCategoriaChange,
    onEntrada:   handleEntradaChange
  });

  // Limpa canal ao sair da página
  window.addEventListener('beforeunload', () => {
    WikiSupabase.pararRealtime(estado.realtimeCanal);
  });
}

/**
 * Handler para mudanças em categorias recebidas via Realtime.
 */
function handleCategoriaChange(payload) {
  const { eventType, new: nova, old: antiga } = payload;

  if (eventType === 'INSERT') {
    // Evita duplicatas (INSERT pode vir do próprio usuário)
    if (!estado.categorias.find(c => c.id === nova.id)) {
      estado.categorias.push(nova);
    }
  } else if (eventType === 'UPDATE') {
    const idx = estado.categorias.findIndex(c => c.id === nova.id);
    if (idx !== -1) estado.categorias[idx] = nova;
    else estado.categorias.push(nova);
  } else if (eventType === 'DELETE') {
    estado.categorias = estado.categorias.filter(c => c.id !== antiga.id);
  }

  // Re-renderiza apenas a view de categorias (não interrompe busca ativa)
  if (viewAtual() === 'categorias') {
    renderizarCategorias();
  }

  // Toast apenas para mudanças de outros colaboradores
  const autorId = nova?.updated_by || nova?.user_id;
  if (autorId && autorId !== estado.usuario?.id) {
    const autor = estado.perfis[autorId] || 'Um colaborador';
    mostrarToast(`${autor} atualizou uma categoria.`, 'info');
  }
}

/**
 * Handler para mudanças em entradas recebidas via Realtime.
 */
async function handleEntradaChange(payload) {
  const { eventType, new: nova, old: antiga } = payload;

  if (eventType === 'INSERT') {
    if (!estado.entradas.find(e => e.id === nova.id)) {
      estado.entradas.push(nova);
    }
  } else if (eventType === 'UPDATE') {
    const idx = estado.entradas.findIndex(e => e.id === nova.id);
    if (idx !== -1) estado.entradas[idx] = nova;
    else estado.entradas.push(nova);

    // Resolve perfil do editor se ainda não está em cache
    if (nova.updated_by && !estado.perfis[nova.updated_by]) {
      try {
        const perfis = await WikiSupabase.buscarPerfisPorIds([nova.updated_by]);
        if (perfis[0]) estado.perfis[nova.updated_by] = perfis[0].nickname;
      } catch (_) { /* silencioso */ }
    }
  } else if (eventType === 'DELETE') {
    estado.entradas = estado.entradas.filter(e => e.id !== antiga.id);
  }

  // Re-renderiza a view atual (não interrompe busca ativa)
  const view = viewAtual();
  if (view === 'categorias') renderizarCategorias();
  else if (view === 'todas') renderizarTodasEntradas();

  // Toast apenas para mudanças de outros colaboradores
  const autorId = nova?.updated_by || nova?.user_id;
  if (autorId && autorId !== estado.usuario?.id) {
    const autor = estado.perfis[autorId] || 'Um colaborador';
    const acao = eventType === 'DELETE' ? 'removeu uma entrada'
               : eventType === 'INSERT' ? 'adicionou uma nova entrada'
               : `atualizou "${nova.titulo}"`;
    mostrarToast(`${autor} ${acao}.`, 'info');
  }
}

// ============================================
// FUNÇÕES DE COMPARTILHAMENTO
// ============================================

/**
 * Abre o modal de compartilhamento
 */
function abrirModalCompartilhar() {
  const overlay = document.getElementById('modalCompartilharOverlay');
  const titulo  = document.getElementById('modalCompartilharTitulo');
  if (!overlay) return;

  if (titulo) titulo.textContent = `Compartilhar "${estado.nicho.nome}"`;

  // Limpa estado anterior
  limparSelecao();
  const input = document.getElementById('compartilharInput');
  if (input) input.value = '';
  const dropdown = document.getElementById('compartilharDropdown');
  if (dropdown) dropdown.classList.add('hidden');

  renderizarListaMembros(estado.membros);
  overlay.classList.add('ativo');
  setTimeout(() => input?.focus(), 100);
}

/**
 * Fecha o modal de compartilhamento
 */
function fecharModalCompartilhar() {
  const overlay = document.getElementById('modalCompartilharOverlay');
  if (overlay) overlay.classList.remove('ativo');
  limparSelecao();
  const input = document.getElementById('compartilharInput');
  if (input) input.value = '';
  const dropdown = document.getElementById('compartilharDropdown');
  if (dropdown) dropdown.classList.add('hidden');
}

/**
 * Renderiza a lista de membros dentro do modal
 */
function renderizarListaMembros(membros) {
  const lista = document.getElementById('compartilharMembrosLista');
  if (!lista) return;

  if (!membros || membros.length === 0) {
    lista.innerHTML = '<p class="membro-sem-membros">Nenhum membro ainda.</p>';
    return;
  }

  lista.innerHTML = membros.map(m => {
    const inicial    = (m.nickname || '?').charAt(0).toUpperCase();
    const dataEntrada = new Date(m.joined_at).toLocaleDateString('pt-BR');
    const btnRemover = estado.ehDono
      ? `<button type="button" class="btn btn-danger btn-sm"
           onclick="revogarMembro('${m.user_id}', '${escapeHtml(m.nickname).replace(/'/g, "\\'")}')">
           Remover
         </button>`
      : '';
    return `
      <div class="membro-item">
        <div class="dropdown-item-avatar" style="width:34px;height:34px;font-size:0.85rem;flex-shrink:0">${inicial}</div>
        <div class="membro-item-info">
          <div class="membro-item-nome">${escapeHtml(m.nickname)}</div>
          <div class="membro-item-meta">${escapeHtml(m.email_masked)} · Desde ${dataEntrada}</div>
        </div>
        ${btnRemover}
      </div>
    `;
  }).join('');
}

/**
 * Busca usuários por nickname e renderiza o dropdown (debounced via event listener)
 */
async function buscarUsuariosDropdown(termo) {
  const dropdown = document.getElementById('compartilharDropdown');
  if (!dropdown) return;

  if (!termo || termo.trim().length < 2) {
    dropdown.classList.add('hidden');
    return;
  }

  dropdown.innerHTML = '<div class="dropdown-vazio">Buscando...</div>';
  dropdown.classList.remove('hidden');

  const usuarios = await WikiSupabase.buscarUsuariosPorNickname(termo.trim());

  if (usuarios.length === 0) {
    dropdown.innerHTML = '<div class="dropdown-vazio">Nenhum usuário encontrado.</div>';
    return;
  }

  dropdown.innerHTML = usuarios.map(u => `
    <div class="dropdown-item"
      data-user-id="${u.id}"
      data-nickname="${escapeHtml(u.nickname)}"
      data-email="${escapeHtml(u.email_masked)}">
      <div class="dropdown-item-avatar">${u.nickname.charAt(0).toUpperCase()}</div>
      <div class="dropdown-item-info">
        <div class="dropdown-item-nome">${escapeHtml(u.nickname)}</div>
        <div class="dropdown-item-email">${escapeHtml(u.email_masked)}</div>
      </div>
    </div>
  `).join('');

  dropdown.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
      selecionarUsuario({
        id:           item.dataset.userId,
        nickname:     item.dataset.nickname,
        email_masked: item.dataset.email
      });
    });
  });
}

/**
 * Registra o usuário selecionado e exibe o chip de confirmação
 */
function selecionarUsuario(user) {
  estado.usuarioSelecionado = user;

  const chip    = document.getElementById('usuarioSelecionado');
  const avatar  = document.getElementById('usuarioSelecionadoAvatar');
  const nome    = document.getElementById('usuarioSelecionadoNome');
  const email   = document.getElementById('usuarioSelecionadoEmail');
  const btnConf = document.getElementById('btnConfirmarCompartilhar');

  if (avatar) avatar.textContent = user.nickname.charAt(0).toUpperCase();
  if (nome)   nome.textContent   = user.nickname;
  if (email)  email.textContent  = user.email_masked;
  if (chip)   chip.classList.remove('hidden');
  if (btnConf) btnConf.disabled  = false;

  // Limpa o dropdown após seleção
  const dropdown = document.getElementById('compartilharDropdown');
  if (dropdown) dropdown.classList.add('hidden');
  const input = document.getElementById('compartilharInput');
  if (input) input.value = user.nickname;
}

/**
 * Limpa a seleção de usuário no modal
 */
function limparSelecao() {
  estado.usuarioSelecionado = null;
  const chip    = document.getElementById('usuarioSelecionado');
  const btnConf = document.getElementById('btnConfirmarCompartilhar');
  if (chip)    chip.classList.add('hidden');
  if (btnConf) btnConf.disabled = true;
}

/**
 * Envia o convite para o usuário selecionado
 */
async function confirmarCompartilhar() {
  if (!estado.usuarioSelecionado) return;

  const btn = document.getElementById('btnConfirmarCompartilhar');
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

  try {
    await WikiSupabase.enviarConvite(estado.nichoId, estado.usuarioSelecionado.id);
    mostrarToast(`Convite enviado para ${estado.usuarioSelecionado.nickname}!`, 'sucesso');
    fecharModalCompartilhar();
  } catch (erro) {
    // A stored procedure retorna mensagens de erro específicas em português
    mostrarToast(erro.message || 'Erro ao enviar convite.', 'erro');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Enviar convite'; }
  }
}

/**
 * Remove um membro do nicho (com fork automático pelo back-end)
 * @param {string} userId
 * @param {string} nickname
 */
async function revogarMembro(userId, nickname) {
  const confirmado = confirm(
    `Remover "${nickname}" do nicho?\n\nEle perderá acesso mas receberá uma cópia independente do conteúdo atual.`
  );
  if (!confirmado) return;

  try {
    await WikiSupabase.revogarMembroEForkar(estado.nichoId, userId);
    mostrarToast(`${nickname} foi removido. Uma cópia do nicho foi enviada a ele.`, 'sucesso');

    // Recarrega membros e atualiza modal + banner
    estado.membros = await WikiSupabase.buscarMembrosNicho(estado.nichoId);
    renderizarListaMembros(estado.membros);
    renderizarMembrosPreview(estado.membros);
  } catch (erro) {
    mostrarToast(erro.message || 'Erro ao remover membro.', 'erro');
  }
}

/**
 * Exibe uma notificação toast temporária
 * @param {string} mensagem
 * @param {'sucesso'|'erro'|'info'} tipo
 */
function mostrarToast(mensagem, tipo = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensagem;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('saindo');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 4000);
}

/**
 * Escapa caracteres HTML para uso seguro em innerHTML
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ============================================
// INTEGRAÇÃO COM ARQUIVOS EXISTENTES
// ============================================

if (typeof window.WikiLocal !== 'undefined') {
  window.WikiLocal.formatarData = formatarData;
  window.WikiLocal.extrairTexto = extrairTexto;
} else {
  window.WikiLocal = {
    formatarData,
    extrairTexto
  };
}