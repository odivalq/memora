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

  } catch (error) {
    console.error('Erro ao carregar nicho:', error);
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
  document.title = `Memora - ${estado.nicho.nome}`;

  // Atualizar botão de nova entrada para incluir o nicho
  const btnNovaEntrada = document.getElementById('btnNovaEntrada');
  if (btnNovaEntrada) {
    btnNovaEntrada.href = `editar.html?nicho=${estado.nicho.id}`;
  }
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

  if (estado.categorias.length === 0) {
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

  grid.innerHTML = estado.categorias.map(cat => {
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
  }).join('');
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
          ${ents.map(e => `
            <a href="entrada.html?id=${e.id}&nicho=${estado.nichoId}" style="display: flex; align-items: center; gap: 10px; padding: 12px 15px; background: var(--cor-secundaria); border-radius: 6px; text-decoration: none; color: var(--cor-texto); transition: all 0.2s;">
              <span>📄</span>
              <span>${e.titulo}</span>
              <span style="margin-left: auto; font-size: 0.85rem; color: var(--cor-texto-claro);">${formatarData(e.data_atualizacao)}</span>
            </a>
          `).join('')}
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
  const searchBtn = document.getElementById('searchBtn');

  if (searchInput) {
    let timeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        buscarNoNicho(e.target.value);
      }, 300);
    });

    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        buscarNoNicho(e.target.value);
      }
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      buscarNoNicho(searchInput.value);
    });
  }

  // Verificar parâmetros da URL
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
// INTEGRAÇÃO COM ARQUIVOS EXISTENTES
// ============================================

// Se houver funções globais de app-supabase.js que precisamos, podemos reutilizar
if (typeof window.WikiLocal !== 'undefined') {
  // Reutilizar funções de utilidade se já existirem
  window.WikiLocal.formatarData = formatarData;
  window.WikiLocal.extrairTexto = extrairTexto;
} else {
  window.WikiLocal = {
    formatarData,
    extrairTexto
  };
}