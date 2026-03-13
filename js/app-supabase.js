/**
 * WikiLocal - Aplicação Principal (Versão Supabase)
 * Gerencia categorias, entradas, busca e navegação usando Supabase
 */

// ============================================
// CONFIGURAÇÃO E ESTADO
// ============================================

const CONFIG = {
  defaultIcon: '📄',
  defaultColor: '#3366cc'
};

let estado = {
  categorias: [],
  entradas: [],
  categoriaAtual: null,
  entradaAtual: null,
  carregando: false
};

// ============================================
// UTILITÁRIOS
// ============================================

function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function slugify(texto) {
  return texto
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

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
// CARREGAMENTO DE DADOS
// ============================================

/**
 * Carrega todas as categorias do Supabase
 */
async function carregarCategorias() {
  estado.carregando = true;
  const categorias = await WikiSupabase.buscarCategorias();
  estado.categorias = categorias;
  estado.carregando = false;
  return categorias;
}

/**
 * Carrega todas as entradas do Supabase
 */
async function carregarEntradas() {
  estado.carregando = true;
  const entradas = await WikiSupabase.buscarEntradas();
  estado.entradas = entradas;
  estado.carregando = false;
  return entradas;
}

/**
 * Carrega uma entrada específica pelo ID
 */
async function carregarEntrada(id) {
  return await WikiSupabase.buscarEntradaPorId(id);
}

/**
 * Carrega entradas de uma categoria específica
 */
async function carregarEntradasPorCategoria(categoriaId) {
  return await WikiSupabase.buscarEntradasPorCategoria(categoriaId);
}

// ============================================
// RENDERIZAÇÃO
// ============================================

/**
 * Renderiza o grid de categorias na página inicial
 */
async function renderizarCategorias() {
  const grid = document.getElementById('categoriasGrid');
  if (!grid) return;

  try {
    // Mostra loading
    grid.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--cor-texto-claro);"><div class="loading" style="margin: 0 auto 20px;"></div>Carregando categorias...</div>';

    const categorias = await carregarCategorias();
    const entradas = await carregarEntradas();

    if (categorias.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
          <div style="font-size: 3rem; margin-bottom: 15px;">📂</div>
          <h3>Nenhuma categoria encontrada</h3>
          <p style="color: var(--cor-texto-claro);">Crie sua primeira categoria ao adicionar uma entrada.</p>
          <a href="editar.html" class="btn btn-primary" style="margin-top: 20px;">Nova Entrada</a>
        </div>
      `;
      return;
    }

    grid.innerHTML = categorias.map(cat => {
      const entradasCat = entradas.filter(e => e.categoria_id === cat.id);
      const entradasHtml = entradasCat.slice(0, 5).map(e => `
        <li><a href="entrada.html?id=${e.id}">${e.titulo}</a></li>
      `).join('');
      
      const maisEntradas = entradasCat.length > 5 
        ? `<li style="color: var(--cor-texto-claro); font-size: 0.85rem; padding: 6px 0;">+ ${entradasCat.length - 5} mais...</li>` 
        : '';

      return `
        <div class="categoria-card">
          <div class="categoria-header">
            <div class="categoria-icon" style="background: ${cat.cor}20; color: ${cat.cor};">
              ${cat.icone || CONFIG.defaultIcon}
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
  } catch (error) {
    console.error('Erro ao renderizar categorias:', error);
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
        <div style="font-size: 3rem; margin-bottom: 15px;">⚠️</div>
        <h3>Erro ao carregar categorias</h3>
        <p style="color: var(--cor-texto-claro);">Ocorreu um erro ao buscar as categorias. Tente recarregar a página.</p>
        <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 20px;">Recarregar</button>
      </div>
    `;
  }
}

/**
 * Renderiza a sidebar com categorias
 */
async function renderizarSidebarCategorias() {
  const menu = document.getElementById('sidebarCategorias');
  if (!menu) return;

  const categorias = await carregarCategorias();
  menu.innerHTML = categorias.map(cat => `
    <li><a href="index.html?categoria=${cat.id}">${cat.icone || CONFIG.defaultIcon} ${cat.nome}</a></li>
  `).join('');
}

/**
 * Renderiza uma entrada específica
 */
async function renderizarEntrada() {
  const urlParams = new URLSearchParams(window.location.search);
  const entradaId = urlParams.get('id');

  if (!entradaId) {
    mostrarErroEntrada();
    return;
  }

  const entrada = await carregarEntrada(entradaId);
  if (!entrada) {
    mostrarErroEntrada();
    return;
  }

  const categorias = await carregarCategorias();
  const categoria = categorias.find(c => c.id === entrada.categoria_id);

  // Esconde loading e mostra conteúdo
  document.getElementById('entradaLoading').classList.add('hidden');
  document.getElementById('entradaContent').classList.remove('hidden');

  // Preenche dados
  document.getElementById('entradaTitulo').textContent = entrada.titulo;
  document.getElementById('entradaCategoria').innerHTML = `
    ${categoria ? categoria.icone : '📁'} ${categoria ? categoria.nome : 'Sem categoria'}
  `;
  document.getElementById('entradaData').textContent = 
    `Atualizado em ${formatarData(entrada.data_atualizacao)}`;
  document.getElementById('entradaBody').innerHTML = entrada.conteudo;

  // Configura botões
  document.getElementById('btnEditar').href = `editar.html?id=${entrada.id}`;
  document.getElementById('btnExcluir').onclick = () => abrirModalExcluir(entrada.id);

  estado.entradaAtual = entrada;
}

/**
 * Mostra mensagem de erro quando entrada não é encontrada
 */
function mostrarErroEntrada() {
  document.getElementById('entradaLoading').classList.add('hidden');
  document.getElementById('entradaErro').classList.remove('hidden');
}

/**
 * Renderiza resultados de busca
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

  const resultados = await WikiSupabase.buscarEntradasPorTermo(termo);
  const categorias = await carregarCategorias();

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
    const categoria = categorias.find(c => c.id === e.categoria_id);
    return `
      <div class="resultado-item">
        <span class="resultado-categoria">${categoria ? categoria.nome : 'Sem categoria'}</span>
        <h3 class="resultado-titulo"><a href="entrada.html?id=${e.id}">${e.titulo}</a></h3>
        <p class="resultado-resumo">${extrairTexto(e.conteudo, 200)}</p>
      </div>
    `;
  }).join('');
}

/**
 * Renderiza todas as entradas
 */
async function renderizarTodasEntradas() {
  const section = document.getElementById('allEntriesSection');
  const categoriesSection = document.getElementById('categoriesSection');
  const searchSection = document.getElementById('searchResultsSection');
  const listEl = document.getElementById('allEntriesList');

  if (!section) return;

  const entradas = await carregarEntradas();
  const categorias = await carregarCategorias();

  section.classList.remove('hidden');
  categoriesSection.classList.add('hidden');
  if (searchSection) searchSection.classList.add('hidden');

  // Agrupa por categoria
  const porCategoria = {};
  entradas.forEach(e => {
    const catId = e.categoria_id || 'sem-categoria';
    if (!porCategoria[catId]) porCategoria[catId] = [];
    porCategoria[catId].push(e);
  });

  listEl.innerHTML = Object.entries(porCategoria).map(([catId, ents]) => {
    const categoria = categorias.find(c => c.id === catId);
    const catNome = categoria ? categoria.nome : 'Sem Categoria';
    const catIcone = categoria ? categoria.icone : '📁';

    return `
      <div style="margin-bottom: 30px;">
        <h3 style="margin-bottom: 15px; color: var(--cor-primaria); display: flex; align-items: center; gap: 8px;">
          ${catIcone} ${catNome}
        </h3>
        <div style="display: grid; gap: 10px;">
          ${ents.map(e => `
            <a href="entrada.html?id=${e.id}" style="display: flex; align-items: center; gap: 10px; padding: 12px 15px; background: var(--cor-secundaria); border-radius: 6px; text-decoration: none; color: var(--cor-texto); transition: all 0.2s;">
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
// AÇÕES
// ============================================

/**
 * Abre o modal de confirmação de exclusão
 */
function abrirModalExcluir(entradaId) {
  const modal = document.getElementById('modalExcluir');
  modal.classList.add('ativo');

  document.getElementById('btnCancelarExcluir').onclick = () => {
    modal.classList.remove('ativo');
  };

  document.getElementById('btnConfirmarExcluir').onclick = async () => {
    await excluirEntrada(entradaId);
    modal.classList.remove('ativo');
  };
}

/**
 * Exclui uma entrada
 */
async function excluirEntrada(entradaId) {
  const sucesso = await WikiSupabase.excluirEntrada(entradaId);
  if (sucesso) {
    window.location.href = 'index.html';
  } else {
    alert('Erro ao excluir entrada. Tente novamente.');
  }
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
        renderizarResultadosBusca(e.target.value);
      }, 300);
    });

    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        renderizarResultadosBusca(e.target.value);
      }
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      renderizarResultadosBusca(searchInput.value);
    });
  }
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
// FUNÇÕES DE PDF
// ============================================

/**
 * Gera e faz download de PDF da entrada atual
 */
async function downloadPDF() {
  const entrada = estado.entradaAtual;
  if (!entrada) {
    alert('Nenhuma entrada carregada para exportar.');
    return;
  }

  try {
    // Cria um container temporário para o PDF
    const pdfContainer = document.createElement('div');
    pdfContainer.style.padding = '30px';
    pdfContainer.style.maxWidth = '800px';
    pdfContainer.style.margin = '0 auto';
    pdfContainer.style.fontFamily = 'Arial, sans-serif';
    pdfContainer.style.lineHeight = '1.6';
    pdfContainer.style.color = '#333';
    pdfContainer.style.backgroundColor = 'white';

    // Cabeçalho do PDF
    const header = document.createElement('div');
    header.style.textAlign = 'center';
    header.style.marginBottom = '30px';
    header.style.paddingBottom = '20px';
    header.style.borderBottom = '2px solid #333';
    
    const title = document.createElement('h1');
    title.style.fontSize = '28px';
    title.style.margin = '0 0 10px 0';
    title.style.color = '#333';
    title.textContent = entrada.titulo;
    
    const meta = document.createElement('div');
    meta.style.fontSize = '14px';
    meta.style.color = '#666';
    meta.style.fontWeight = '500';
    
    // Obtém categoria
    const categorias = await carregarCategorias();
    const categoria = categorias.find(c => c.id === entrada.categoria_id);
    const categoriaNome = categoria ? categoria.nome : 'Sem categoria';
    
    meta.textContent = `${categoriaNome} • ${formatarData(entrada.data_atualizacao)}`;
    
    header.appendChild(title);
    header.appendChild(meta);

    // Conteúdo da entrada
    const content = document.createElement('div');
    content.innerHTML = entrada.conteudo;
    
    // Remove estilos de hover e interatividade
    const links = content.querySelectorAll('a');
    links.forEach(link => {
      link.style.color = '#0066cc';
      link.style.textDecoration = 'underline';
      link.style.pointerEvents = 'none';
    });

    // Remove botões e elementos de ação
    const buttons = content.querySelectorAll('button, .entrada-acoes, .sidebar, .header, .footer');
    buttons.forEach(btn => btn.remove());

    // Estiliza tabelas para PDF
    const tables = content.querySelectorAll('table');
    tables.forEach(table => {
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.margin = '20px 0';
      
      const ths = table.querySelectorAll('th');
      ths.forEach(th => {
        th.style.backgroundColor = '#f0f0f0';
        th.style.fontWeight = 'bold';
        th.style.padding = '12px';
        th.style.border = '1px solid #ccc';
      });
      
      const tds = table.querySelectorAll('td');
      tds.forEach(td => {
        td.style.padding = '12px';
        td.style.border = '1px solid #ccc';
      });
      
      const trs = table.querySelectorAll('tr');
      trs.forEach((tr, index) => {
        if (index % 2 === 0) {
          tr.style.backgroundColor = '#fafafa';
        }
      });
    });

    // Estiliza blocos de código
    const preBlocks = content.querySelectorAll('pre');
    preBlocks.forEach(pre => {
      pre.style.backgroundColor = '#f4f4f4';
      pre.style.padding = '15px';
      pre.style.border = '1px solid #ddd';
      pre.style.borderRadius = '4px';
      pre.style.fontFamily = 'Courier New, monospace';
      pre.style.fontSize = '12px';
      pre.style.overflow = 'auto';
    });

    const codeBlocks = content.querySelectorAll('code');
    codeBlocks.forEach(code => {
      code.style.backgroundColor = '#f4f4f4';
      code.style.padding = '2px 6px';
      code.style.borderRadius = '3px';
      code.style.fontFamily = 'Courier New, monospace';
      code.style.fontSize = '12px';
    });

    // Estiliza citações
    const blockquotes = content.querySelectorAll('blockquote');
    blockquotes.forEach(blockquote => {
      blockquote.style.borderLeft = '4px solid #333';
      blockquote.style.padding = '15px 20px';
      blockquote.style.margin = '20px 0';
      blockquote.style.backgroundColor = '#f9f9f9';
      blockquote.style.fontStyle = 'italic';
      blockquote.style.color = '#555';
    });

    // Estiliza listas
    const lists = content.querySelectorAll('ul, ol');
    lists.forEach(list => {
      list.style.paddingLeft = '25px';
      list.style.margin = '15px 0';
    });

    const listItems = content.querySelectorAll('li');
    listItems.forEach(li => {
      li.style.marginBottom = '8px';
    });

    // Monta o container
    pdfContainer.appendChild(header);
    pdfContainer.appendChild(content);

    // Configurações do PDF
    const options = {
      margin: 1,
      filename: `memora-${slugify(entrada.titulo)}-${entrada.data_atualizacao.split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        allowTaint: true
      },
      jsPDF: { 
        unit: 'cm', 
        format: 'a4', 
        orientation: 'portrait' 
      }
    };

    // Gera e faz download do PDF
    html2pdf()
      .set(options)
      .from(pdfContainer)
      .save()
      .then(() => {
        // Remove o container temporário
        document.body.removeChild(pdfContainer);
      });

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    alert('Erro ao gerar PDF. Tente novamente.');
  }
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  // Inicializa o cliente Supabase
  WikiSupabase.inicializarSupabase();

  // Configura event listeners
  configurarEventListeners();

  // Verifica parâmetros da URL
  verificarParametrosURL();

  // Renderiza componentes baseado na página atual
  const path = window.location.pathname;
  
  if (path.includes('index.html') || path.endsWith('/')) {
    renderizarCategorias();
  }
  
  if (path.includes('entrada.html')) {
    renderizarEntrada();
    renderizarSidebarCategorias();
    
    // Configura botão de download PDF
    const btnDownloadPDF = document.getElementById('btnDownloadPDF');
    if (btnDownloadPDF) {
      btnDownloadPDF.addEventListener('click', downloadPDF);
    }
  }
});

// Expõe funções globais
window.WikiLocal = {
  carregarCategorias,
  carregarEntradas,
  carregarEntrada,
  gerarId,
  slugify,
  formatarData,
  extrairTexto
};
