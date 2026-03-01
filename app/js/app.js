/**
 * WikiLocal - Aplicação Principal
 * Gerencia categorias, entradas, busca e navegação
 */

// ============================================
// CONFIGURAÇÃO E ESTADO
// ============================================

const CONFIG = {
  dataPath: 'data/',
  categoriasFile: 'categorias.json',
  defaultIcon: '📄',
  defaultColor: '#3366cc'
};

let estado = {
  categorias: [],
  entradas: [],
  categoriaAtual: null,
  entradaAtual: null
};

// ============================================
// UTILITÁRIOS
// ============================================

/**
 * Gera um ID único baseado no timestamp
 */
function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Converte um título em slug amigável para URL
 */
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

/**
 * Formata uma data para exibição
 */
function formatarData(dataString) {
  if (!dataString) return '';
  const data = new Date(dataString);
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Extrai texto puro de HTML para preview
 */
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
// PERSISTÊNCIA (LocalStorage)
// ============================================

/**
 * Carrega todas as categorias do localStorage
 */
function carregarCategorias() {
  const dados = localStorage.getItem('wikilocal_categorias');
  return dados ? JSON.parse(dados) : [];
}

/**
 * Salva categorias no localStorage
 */
function salvarCategorias(categorias) {
  localStorage.setItem('wikilocal_categorias', JSON.stringify(categorias));
}

/**
 * Carrega todas as entradas do localStorage
 */
function carregarEntradas() {
  const dados = localStorage.getItem('wikilocal_entradas');
  return dados ? JSON.parse(dados) : [];
}

/**
 * Salva entradas no localStorage
 */
function salvarEntradas(entradas) {
  localStorage.setItem('wikilocal_entradas', JSON.stringify(entradas));
}

/**
 * Carrega uma entrada específica pelo ID
 */
function carregarEntrada(id) {
  const entradas = carregarEntradas();
  return entradas.find(e => e.id === id);
}

/**
 * Carrega entradas de uma categoria específica
 */
function carregarEntradasPorCategoria(categoriaId) {
  const entradas = carregarEntradas();
  return entradas.filter(e => e.categoriaId === categoriaId);
}

// ============================================
// CARREGAMENTO DE JSONs
// ============================================

/**
 * Carrega categorias do arquivo JSON
 */
async function carregarCategoriasDoJSON() {
  try {
    const response = await fetch(CONFIG.dataPath + CONFIG.categoriasFile);
    if (!response.ok) throw new Error('Arquivo não encontrado');
    const data = await response.json();
    return data.categorias || [];
  } catch (erro) {
    console.log('Não foi possível carregar categorias do JSON:', erro);
    return null;
  }
}

/**
 * Carrega entradas do arquivo JSON
 */
async function carregarEntradasDoJSON() {
  try {
    const response = await fetch(CONFIG.dataPath + 'entradas.json');
    if (!response.ok) throw new Error('Arquivo não encontrado');
    const data = await response.json();
    return data.entradas || [];
  } catch (erro) {
    console.log('Não foi possível carregar entradas do JSON:', erro);
    return null;
  }
}

/**
 * Dados padrão de fallback (caso JSONs não existam)
 */
function getCategoriasPadrao() {
  return [
    {
      id: 'cat-1',
      nome: 'Documentação',
      icone: '📋',
      cor: '#4CAF50',
      descricao: 'Documentos e normas internas'
    },
    {
      id: 'cat-2',
      nome: 'Procedimentos',
      icone: '⚙️',
      cor: '#2196F3',
      descricao: 'Procedimentos operacionais'
    },
    {
      id: 'cat-3',
      nome: 'Pessoas',
      icone: '👥',
      cor: '#9C27B0',
      descricao: 'Informações sobre colaboradores'
    },
    {
      id: 'cat-4',
      nome: 'Tecnologia',
      icone: '💻',
      cor: '#FF9800',
      descricao: 'Sistemas e ferramentas'
    }
  ];
}

function getEntradasPadrao() {
  return [
      {
        id: 'ent-1',
        titulo: 'Manual de Boas-vindas',
        slug: 'manual-de-boas-vindas',
        categoriaId: 'cat-1',
        conteudo: `
          <h2>Bem-vindo à nossa organização!</h2>
          <p>Este manual contém informações essenciais para o seu primeiro dia e primeiras semanas conosco.</p>
          
          <h3>Primeiros Passos</h3>
          <ul>
            <li>Apresentação na recepção às 9h</li>
            <li>Entrega de crachá e materiais</li>
            <li>Tour pelas instalações</li>
            <li>Reunião com o gestor direto</li>
          </ul>
          
          <div class="info-box">
            <div class="info-box-titulo">💡 Dica Importante</div>
            <p>Leve um documento com foto para a identificação no primeiro dia.</p>
          </div>
          
          <h3>Contatos Úteis</h3>
          <table>
            <tr>
              <th>Setor</th>
              <th>Ramal</th>
              <th>Email</th>
            </tr>
            <tr>
              <td>RH</td>
              <td>1001</td>
              <td>rh@empresa.com</td>
            </tr>
            <tr>
              <td>TI</td>
              <td>1002</td>
              <td>ti@empresa.com</td>
            </tr>
            <tr>
              <td>Recepção</td>
              <td>1000</td>
              <td>recepcao@empresa.com</td>
            </tr>
          </table>
        `,
        dataCriacao: new Date().toISOString(),
        dataAtualizacao: new Date().toISOString()
      },
      {
        id: 'ent-2',
        titulo: 'Política de Segurança da Informação',
        slug: 'politica-de-seguranca',
        categoriaId: 'cat-1',
        conteudo: `
          <h2>Política de Segurança da Informação</h2>
          <p>Esta política estabelece as diretrizes para proteção das informações da organização.</p>
          
          <h3>Princípios Fundamentais</h3>
          <ol>
            <li><strong>Confidencialidade:</strong> Informações só devem ser acessadas por pessoas autorizadas.</li>
            <li><strong>Integridade:</strong> Dados devem ser precisos e completos.</li>
            <li><strong>Disponibilidade:</strong> Sistemas devem estar disponíveis quando necessários.</li>
          </ol>
          
          <div class="alert alert-warning">
            <strong>⚠️ Atenção:</strong> O compartilhamento de senhas é estritamente proibido.
          </div>
          
          <h3>Requisitos de Senha</h3>
          <ul>
            <li>Mínimo de 8 caracteres</li>
            <li>Letras maiúsculas e minúsculas</li>
            <li>Números e caracteres especiais</li>
            <li>Troca a cada 90 dias</li>
          </ul>
        `,
        dataCriacao: new Date().toISOString(),
        dataAtualizacao: new Date().toISOString()
      },
      {
        id: 'ent-3',
        titulo: 'Processo de Reembolso',
        slug: 'processo-de-reembolso',
        categoriaId: 'cat-2',
        conteudo: `
          <h2>Como Solicitar Reembolso</h2>
          <p>Siga os passos abaixo para solicitar reembolso de despesas.</p>
          
          <h3>Passo a Passo</h3>
          <ol>
            <li>Reúna todos os comprovantes fiscais</li>
            <li>Preencha o formulário de solicitação</li>
            <li>Anexe os comprovantes digitalizados</li>
            <li>Envie para aprovação do gestor</li>
            <li>Acompanhe o status no sistema</li>
          </ol>
          
          <div class="alert alert-info">
            <strong>ℹ️ Prazo:</strong> Solicitações devem ser feitas em até 30 dias da despesa.
          </div>
          
          <h3>Tabela de Limites</h3>
          <table>
            <tr>
              <th>Tipo de Despesa</th>
              <th>Limite</th>
              <th>Observação</th>
            </tr>
            <tr>
              <td>Alimentação</td>
              <td>R$ 80,00/dia</td>
              <td>Com comprovante</td>
            </tr>
            <tr>
              <td>Transporte</td>
              <td>Valor real</td>
              <td>Uber, táxi, estacionamento</td>
            </tr>
            <tr>
              <td>Hospedagem</td>
              <td>R$ 350,00/noite</td>
              <td>Com prévia aprovação</td>
            </tr>
          </table>
        `,
        dataCriacao: new Date().toISOString(),
        dataAtualizacao: new Date().toISOString()
      },
      {
        id: 'ent-4',
        titulo: 'João Silva - Gerente de TI',
        slug: 'joao-silva',
        categoriaId: 'cat-3',
        conteudo: `
          <h2>João Silva</h2>
          <p><strong>Cargo:</strong> Gerente de Tecnologia da Informação</p>
          <p><strong>Departamento:</strong> TI</p>
          <p><strong>Email:</strong> joao.silva@empresa.com</p>
          <p><strong>Ramal:</strong> 2001</p>
          
          <h3>Responsabilidades</h3>
          <ul>
            <li>Gerenciamento da infraestrutura de TI</li>
            <li>Liderança da equipe técnica</li>
            <li>Planejamento estratégico de tecnologia</li>
            <li>Relacionamento com fornecedores</li>
          </ul>
          
          <h3>Horário de Atendimento</h3>
          <table>
            <tr>
              <th>Dia</th>
              <th>Horário</th>
            </tr>
            <tr>
              <td>Segunda - Quinta</td>
              <td>08:00 - 18:00</td>
            </tr>
            <tr>
              <td>Sexta</td>
              <td>08:00 - 17:00</td>
            </tr>
          </table>
        `,
        dataCriacao: new Date().toISOString(),
        dataAtualizacao: new Date().toISOString()
      },
      {
        id: 'ent-5',
        titulo: 'Guia do Sistema ERP',
        slug: 'guia-sistema-erp',
        categoriaId: 'cat-4',
        conteudo: `
          <h2>Sistema ERP - Guia Rápido</h2>
          <p>Guia de referência rápida para o uso do sistema ERP da empresa.</p>
          
          <h3>Acesso ao Sistema</h3>
          <ul>
            <li>URL: <a href="#">https://erp.empresa.com</a></li>
            <li>Login: seu email corporativo</li>
            <li>Senha: mesma do Active Directory</li>
          </ul>
          
          <div class="alert alert-warning">
            <strong>⚠️ Importante:</strong> O sistema não funciona corretamente no Internet Explorer. Use Chrome ou Edge.
          </div>
          
          <h3>Módulos Principais</h3>
          <table>
            <tr>
              <th>Módulo</th>
              <th>Descrição</th>
              <th>Acesso</th>
            </tr>
            <tr>
              <td>Financeiro</td>
              <td>Contas a pagar/receber</td>
              <td>Financeiro, Gestores</td>
            </tr>
            <tr>
              <td>RH</td>
              <td>Folha, benefícios</td>
              <td>RH, Gestores</td>
            </tr>
            <tr>
              <td>Compras</td>
              <td>Cotações, pedidos</td>
              <td>Todos</td>
            </tr>
            <tr>
              <td>Estoque</td>
              <td>Inventário, movimentações</td>
              <td>Logística, TI</td>
            </tr>
          </table>
          
          <h3>Suporte Técnico</h3>
          <p>Em caso de problemas, abra um chamado pelo email: <a href="mailto:suporte@empresa.com">suporte@empresa.com</a></p>
        `,
        dataCriacao: new Date().toISOString(),
        dataAtualizacao: new Date().toISOString()
      }
    ];
}

/**
 * Inicializa dados de exemplo se não houver dados
 * Tenta carregar dos JSONs primeiro, depois usa fallback
 */
async function inicializarDadosPadrao() {
  let categorias = carregarCategorias();
  let entradas = carregarEntradas();

  // Só carrega do JSON se não houver dados no localStorage
  if (categorias.length === 0) {
    // Tenta carregar do JSON
    const categoriasDoJSON = await carregarCategoriasDoJSON();
    categorias = categoriasDoJSON || getCategoriasPadrao();
    salvarCategorias(categorias);
  }

  if (entradas.length === 0) {
    // Tenta carregar do JSON
    const entradasDoJSON = await carregarEntradasDoJSON();
    entradas = entradasDoJSON || getEntradasPadrao();
    salvarEntradas(entradas);
  }

  estado.categorias = categorias;
  estado.entradas = entradas;
}

// ============================================
// RENDERIZAÇÃO
// ============================================

/**
 * Renderiza o grid de categorias na página inicial
 */
function renderizarCategorias() {
  const grid = document.getElementById('categoriasGrid');
  if (!grid) return;

  const categorias = carregarCategorias();
  const entradas = carregarEntradas();

  grid.innerHTML = categorias.map(cat => {
    const entradasCat = entradas.filter(e => e.categoriaId === cat.id);
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
}

/**
 * Renderiza a sidebar com categorias
 */
function renderizarSidebarCategorias() {
  const menu = document.getElementById('sidebarCategorias');
  if (!menu) return;

  const categorias = carregarCategorias();
  menu.innerHTML = categorias.map(cat => `
    <li><a href="index.html?categoria=${cat.id}">${cat.icone || CONFIG.defaultIcon} ${cat.nome}</a></li>
  `).join('');
}

/**
 * Renderiza uma entrada específica
 */
function renderizarEntrada() {
  const urlParams = new URLSearchParams(window.location.search);
  const entradaId = urlParams.get('id');

  if (!entradaId) {
    mostrarErroEntrada();
    return;
  }

  const entrada = carregarEntrada(entradaId);
  if (!entrada) {
    mostrarErroEntrada();
    return;
  }

  const categorias = carregarCategorias();
  const categoria = categorias.find(c => c.id === entrada.categoriaId);

  // Esconde loading e mostra conteúdo
  document.getElementById('entradaLoading').classList.add('hidden');
  document.getElementById('entradaContent').classList.remove('hidden');

  // Preenche dados
  document.getElementById('entradaTitulo').textContent = entrada.titulo;
  document.getElementById('entradaCategoria').innerHTML = `
    ${categoria ? categoria.icone : '📁'} ${categoria ? categoria.nome : 'Sem categoria'}
  `;
  document.getElementById('entradaData').textContent = 
    `Atualizado em ${formatarData(entrada.dataAtualizacao)}`;
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
function renderizarResultadosBusca(termo) {
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

  const entradas = carregarEntradas();
  const categorias = carregarCategorias();
  const termoLower = termo.toLowerCase();

  const resultados = entradas.filter(e => 
    e.titulo.toLowerCase().includes(termoLower) ||
    extrairTexto(e.conteudo).toLowerCase().includes(termoLower)
  );

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
    const categoria = categorias.find(c => c.id === e.categoriaId);
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
function renderizarTodasEntradas() {
  const section = document.getElementById('allEntriesSection');
  const categoriesSection = document.getElementById('categoriesSection');
  const searchSection = document.getElementById('searchResultsSection');
  const listEl = document.getElementById('allEntriesList');

  if (!section) return;

  const entradas = carregarEntradas();
  const categorias = carregarCategorias();

  section.classList.remove('hidden');
  categoriesSection.classList.add('hidden');
  if (searchSection) searchSection.classList.add('hidden');

  // Agrupa por categoria
  const porCategoria = {};
  entradas.forEach(e => {
    const catId = e.categoriaId || 'sem-categoria';
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
              <span style="margin-left: auto; font-size: 0.85rem; color: var(--cor-texto-claro);">${formatarData(e.dataAtualizacao)}</span>
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

  document.getElementById('btnConfirmarExcluir').onclick = () => {
    excluirEntrada(entradaId);
    modal.classList.remove('ativo');
  };
}

/**
 * Exclui uma entrada
 */
function excluirEntrada(entradaId) {
  let entradas = carregarEntradas();
  entradas = entradas.filter(e => e.id !== entradaId);
  salvarEntradas(entradas);
  
  // Redireciona para a home
  window.location.href = 'index.html';
}

// ============================================
// EVENT LISTENERS
// ============================================

/**
 * Configura os event listeners da página
 */
function configurarEventListeners() {
  // Busca
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderizarResultadosBusca(e.target.value);
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

/**
 * Verifica parâmetros da URL para navegação
 */
function verificarParametrosURL() {
  const urlParams = new URLSearchParams(window.location.search);
  
  // Verifica se deve mostrar todas as entradas
  if (urlParams.has('todas')) {
    renderizarTodasEntradas();
  }
  
  // Verifica se há termo de busca
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
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  // Inicializa dados padrão se necessário (aguarda carregamento dos JSONs)
  await inicializarDadosPadrao();

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
  }
});

// Expõe funções globais para uso em outros scripts
window.WikiLocal = {
  carregarCategorias,
  carregarEntradas,
  carregarEntrada,
  salvarCategorias,
  salvarEntradas,
  gerarId,
  slugify,
  formatarData,
  extrairTexto
};
