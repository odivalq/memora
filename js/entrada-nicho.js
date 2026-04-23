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
  usuario: null,
  // Comentários
  comentarios: [],
  threadAtiva: null,   // objeto do comentário raiz atualmente aberto
  painelAberto: false,
  realtimeCanal: null  // canal Realtime ativo para comentários
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

  // Inicializar painel de comentários
  inicializarComentarios();
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

  // Exibir autor original
  const autorEl = document.getElementById('entradaAutor');
  if (autorEl) {
    const nick = estado.entrada.criador?.nickname;
    autorEl.textContent = nick ? `por ${nick}` : '';
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

  // Botão de excluir (só para o criador da entrada)
  const btnExcluir = document.getElementById('btnExcluir');
  if (btnExcluir) {
    if (estado.entrada.user_id !== estado.usuario?.id) {
      btnExcluir.classList.add('hidden');
    }
    btnExcluir.addEventListener('click', () => {
      abrirModalExcluir();
    });
  }

  // Botão de ocultar (para entradas de outros usuários)
  const btnOcultar = document.getElementById('btnOcultar');
  if (btnOcultar) {
    if (estado.entrada.user_id !== estado.usuario?.id) {
      btnOcultar.classList.remove('hidden');
    }
    btnOcultar.addEventListener('click', () => {
      abrirModalOcultar();
    });
  }

  // Modal de exclusão
  configurarModalExcluir();
  configurarModalOcultar();
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

function abrirModalOcultar() {
  const modal = document.getElementById('modalOcultar');
  if (modal) modal.style.display = 'flex';
}

function configurarModalOcultar() {
  const modal = document.getElementById('modalOcultar');
  const btnCancelar = document.getElementById('btnCancelarOcultar');
  const btnConfirmar = document.getElementById('btnConfirmarOcultar');

  if (!modal || !btnCancelar || !btnConfirmar) return;

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  btnCancelar.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  btnConfirmar.addEventListener('click', async () => {
    btnConfirmar.disabled = true;
    const ok = await WikiSupabase.ocultarEntradaParaMim(estado.entrada.id);
    if (ok) {
      window.location.href = `index.html?nicho=${estado.nichoId}`;
    } else {
      btnConfirmar.disabled = false;
      modal.style.display = 'none';
    }
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

function mostrarToast(mensagem, tipo = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensagem;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-saindo');
    toast.addEventListener('animationend', () => toast.remove());
  }, 4000);
}

function mostrarErro(mensagem) {
  mostrarToast(mensagem, 'erro');
}

function mostrarSucesso(mensagem) {
  mostrarToast(mensagem, 'sucesso');
}

function mostrarLoading(show) {
  const loading = document.getElementById('entradaLoading');
  const content = document.getElementById('entradaContent');
  if (show) {
    loading?.classList.remove('hidden');
    content?.classList.add('hidden');
  } else {
    loading?.classList.add('hidden');
  }
}

// ============================================
// COMENTÁRIOS
// ============================================

/**
 * Torna o botão de comentários visível após os dados da entrada
 * estarem carregados (precisa de estado.entrada.id).
 */
function inicializarComentarios() {
  document.getElementById('btnAbrirComentarios')?.classList.remove('hidden');
}

// ── Abrir / fechar painel ─────────────────────

async function abrirPainelComentarios() {
  estado.painelAberto = true;
  mostrarVistaLista();
  document.getElementById('comentariosSidebar').classList.add('aberto');
  document.body.classList.add('comentarios-abertos');
  await carregarComentarios();
  _iniciarRealtimeComentarios();
}

function fecharPainelComentarios() {
  estado.painelAberto = false;
  document.getElementById('comentariosSidebar').classList.remove('aberto');
  document.body.classList.remove('comentarios-abertos');
  voltarParaLista();
  _pararRealtimeComentarios();
}

// ── Carregamento e renderização da lista ─────

async function carregarComentarios() {
  mostrarLoadingComentarios(true);
  try {
    estado.comentarios = await WikiSupabase.buscarComentariosPorEntrada(estado.entrada.id);
    renderizarListaComentarios();
  } catch (error) {
    console.error('Erro ao carregar comentários:', error);
    mostrarErro('Erro ao carregar comentários.');
  } finally {
    mostrarLoadingComentarios(false);
    document.getElementById('btnNovoComentario').classList.remove('hidden');
  }
}

function renderizarListaComentarios() {
  const listaItems = document.getElementById('comentariosListaItems');
  const vazio = document.getElementById('comentariosVazio');

  listaItems.innerHTML = '';

  if (estado.comentarios.length === 0) {
    vazio.classList.remove('hidden');
  } else {
    vazio.classList.add('hidden');
    estado.comentarios.forEach(c => {
      listaItems.appendChild(criarCardComentario(c, { clickable: true }));
    });
  }
}

// ── Thread (comentário raiz + respostas) ─────

async function abrirThread(comentario) {
  estado.threadAtiva = comentario;

  document.getElementById('comentariosLista').classList.add('hidden');
  document.getElementById('comentarioThread').classList.remove('hidden');

  // Renderiza o comentário raiz
  const threadPrincipal = document.getElementById('threadComentarioPrincipal');
  threadPrincipal.innerHTML = '';
  threadPrincipal.appendChild(criarCardComentario(comentario, { threadRoot: true }));

  await carregarRespostas(comentario.id);
}

async function carregarRespostas(comentarioId) {
  const threadRespostas = document.getElementById('threadRespostas');
  const threadVazio = document.getElementById('threadVazio');
  const btnNovaResposta = document.getElementById('btnNovaResposta');

  threadRespostas.innerHTML = '';
  threadVazio.classList.add('hidden');

  try {
    const respostas = await WikiSupabase.buscarRespostasPorComentario(comentarioId);

    if (respostas.length === 0) {
      threadVazio.classList.remove('hidden');
    } else {
      respostas.forEach(r => {
        threadRespostas.appendChild(criarCardComentario(r, {}));
      });
    }
  } catch (error) {
    console.error('Erro ao carregar respostas:', error);
    mostrarErro('Erro ao carregar respostas.');
  } finally {
    btnNovaResposta.classList.remove('hidden');
  }
}

function voltarParaLista() {
  estado.threadAtiva = null;
  document.getElementById('comentarioThread').classList.add('hidden');
  document.getElementById('btnNovaResposta').classList.add('hidden');
  mostrarVistaLista();
}

function mostrarVistaLista() {
  document.getElementById('comentariosLista').classList.remove('hidden');
  document.getElementById('comentarioThread').classList.add('hidden');
}

// ── Criação de cards ──────────────────────────

/**
 * Cria um elemento card de comentário.
 * @param {Object} comentario
 * @param {Object} opcoes
 * @param {boolean} [opcoes.clickable=false]  - Clicável para abrir thread
 * @param {boolean} [opcoes.threadRoot=false] - Estilo de raiz da thread
 */
function criarCardComentario(comentario, opcoes = {}) {
  const { clickable = false, threadRoot = false } = opcoes;

  const div = document.createElement('div');
  div.className = 'comentario-card' + (threadRoot ? ' thread-root' : '');
  div.dataset.id = comentario.id;

  const isOwn = comentario.user_id === estado.usuario.id;
  const nickname = comentario.autor?.nickname || 'Usuário';
  const data = formatarDataRelativa(comentario.created_at);

  div.innerHTML = `
    <div class="comentario-card-header">
      <div class="comentario-autor-data">
        <span class="comentario-autor">${escapeHtml(nickname)}</span>
        <span class="comentario-data">${data}</span>
      </div>
      ${isOwn ? `
        <button class="comentario-deletar-btn" title="Deletar comentário">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      ` : ''}
    </div>
    <p class="comentario-corpo">${escapeHtml(comentario.conteudo)}</p>
    ${clickable ? `
      <div class="comentario-rodape">
        <span class="comentario-respostas-badge">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 0 2 2z"></path>
          </svg>
          Ver respostas
        </span>
      </div>
    ` : ''}
  `;

  // Clique no card abre a thread (ignorando clique no botão de deletar)
  if (clickable) {
    div.addEventListener('click', (e) => {
      if (!e.target.closest('.comentario-deletar-btn')) abrirThread(comentario);
    });
  }

  // Botão de deletar
  const btnDeletar = div.querySelector('.comentario-deletar-btn');
  if (btnDeletar) {
    btnDeletar.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmarDeletarComentario(comentario.id, threadRoot);
    });
  }

  return div;
}

// ── Modal de novo comentário / resposta ───────

// Contexto do modal: null = novo comentário raiz, string = reply ao parentId
let _modalParentId = null;

function abrirModalComentario(parentId = null) {
  _modalParentId = parentId;
  document.getElementById('novoComentarioTitulo').textContent =
    parentId ? 'Nova resposta' : 'Novo comentário';
  document.getElementById('novoComentarioTexto').value = '';
  document.getElementById('comentarioCharCount').textContent = '0';
  document.getElementById('novoComentarioOverlay').classList.add('ativo');
  // Focar textarea após animação
  setTimeout(() => document.getElementById('novoComentarioTexto')?.focus(), 150);
}

function fecharModalComentario() {
  document.getElementById('novoComentarioOverlay').classList.remove('ativo');
}

async function salvarComentario() {
  const texto = document.getElementById('novoComentarioTexto').value.trim();
  if (!texto) {
    mostrarErro('O comentário não pode estar vazio.');
    return;
  }

  const btnSalvar = document.getElementById('btnSalvarComentario');
  btnSalvar.disabled = true;
  btnSalvar.textContent = 'Salvando...';

  try {
    await WikiSupabase.criarComentario(
      estado.entrada.id,
      estado.nichoId,
      texto,
      _modalParentId
    );

    fecharModalComentario();

    if (_modalParentId) {
      await carregarRespostas(_modalParentId);
    } else {
      await carregarComentarios();
    }
  } catch (error) {
    console.error('Erro ao salvar comentário:', error);
    mostrarErro('Erro ao salvar comentário: ' + error.message);
  } finally {
    btnSalvar.disabled = false;
    btnSalvar.textContent = 'Salvar';
  }
}

// ── Deletar ───────────────────────────────────

async function confirmarDeletarComentario(comentarioId, isRaiz = false) {
  if (!confirm('Deletar este comentário? Esta ação não pode ser desfeita.')) return;

  try {
    await WikiSupabase.excluirComentario(comentarioId);

    if (estado.threadAtiva) {
      if (isRaiz) {
        // Comentário raiz deletado — volta para a lista
        voltarParaLista();
        await carregarComentarios();
      } else {
        // Resposta deletada — recarrega respostas
        await carregarRespostas(estado.threadAtiva.id);
      }
    } else {
      await carregarComentarios();
    }
  } catch (error) {
    console.error('Erro ao deletar comentário:', error);
    mostrarErro('Erro ao deletar comentário: ' + error.message);
  }
}

// ── Realtime ──────────────────────────────────

function _iniciarRealtimeComentarios() {
  if (estado.realtimeCanal) return; // já ativo
  estado.realtimeCanal = WikiSupabase.iniciarRealtimeComentarios(
    estado.entrada.id,
    handleComentarioChange
  );
  // Limpa ao sair da página
  window.addEventListener('beforeunload', _pararRealtimeComentarios, { once: true });
}

function _pararRealtimeComentarios() {
  if (estado.realtimeCanal) {
    WikiSupabase.pararRealtime(estado.realtimeCanal);
    estado.realtimeCanal = null;
  }
}

/**
 * Handler para eventos Realtime na tabela comentarios.
 * Só age em eventos de outros usuários; os próprios são gerenciados
 * localmente pelo fluxo de salvar/deletar.
 */
async function handleComentarioChange(payload) {
  const { eventType, new: novo, old: antigo } = payload;

  // Ignora eventos do próprio usuário — já tratados localmente
  const autorId = novo?.user_id ?? antigo?.user_id;
  if (autorId === estado.usuario?.id) return;

  // Só age se o painel estiver aberto
  if (!estado.painelAberto) return;

  const emThread = !document.getElementById('comentarioThread').classList.contains('hidden');

  if (eventType === 'INSERT') {
    const isRaiz = !novo.parent_id;

    if (isRaiz) {
      // Novo comentário raiz — atualiza lista se estiver visível
      if (!emThread) await carregarComentarios();
      mostrarToast('Novo comentário adicionado.', 'info');
    } else if (emThread && estado.threadAtiva?.id === novo.parent_id) {
      // Nova resposta na thread aberta — recarrega respostas
      await carregarRespostas(novo.parent_id);
      mostrarToast('Nova resposta adicionada.', 'info');
    }

  } else if (eventType === 'DELETE') {
    const deletadoId = antigo?.id;
    const parentId   = antigo?.parent_id ?? null;
    const isRaiz     = !parentId;

    if (isRaiz) {
      if (emThread && estado.threadAtiva?.id === deletadoId) {
        // A thread que o usuário está visualizando foi removida
        voltarParaLista();
        await carregarComentarios();
        mostrarToast('Este comentário foi removido.', 'info');
      } else if (!emThread) {
        await carregarComentarios();
      }
    } else if (emThread && estado.threadAtiva?.id === parentId) {
      // Uma resposta da thread aberta foi removida
      await carregarRespostas(parentId);
    }
  }
}

// ── Utilitários ───────────────────────────────

function mostrarLoadingComentarios(show) {
  const el = document.getElementById('comentariosLoading');
  if (el) el.classList.toggle('hidden', !show);
}

/**
 * Formata data relativa (ex.: "há 3 min", "há 2 dias").
 */
function formatarDataRelativa(dataString) {
  const data = new Date(dataString);
  const diff = Date.now() - data.getTime();

  const minutos = Math.floor(diff / 60000);
  const horas = Math.floor(diff / 3600000);
  const dias = Math.floor(diff / 86400000);

  if (minutos < 1)  return 'agora mesmo';
  if (minutos < 60) return `há ${minutos} min`;
  if (horas < 24)   return `há ${horas}h`;
  if (dias < 7)     return `há ${dias} dia${dias > 1 ? 's' : ''}`;

  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Escapa HTML para prevenir XSS ao injetar texto de usuário.
 */
function escapeHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

// ============================================
// EVENT LISTENERS
// ============================================

function configurarEventListeners() {
  // ── Painel de comentários ──
  document.getElementById('btnAbrirComentarios')?.addEventListener('click', abrirPainelComentarios);
  document.getElementById('btnFecharSidebar')?.addEventListener('click', fecharPainelComentarios);
  document.getElementById('btnVoltarLista')?.addEventListener('click', voltarParaLista);

  document.getElementById('btnNovoComentario')?.addEventListener('click', () => {
    abrirModalComentario(null);
  });

  document.getElementById('btnNovaResposta')?.addEventListener('click', () => {
    if (estado.threadAtiva) abrirModalComentario(estado.threadAtiva.id);
  });

  // ── Modal de comentário ──
  document.getElementById('btnFecharModalComentario')?.addEventListener('click', fecharModalComentario);
  document.getElementById('btnCancelarComentario')?.addEventListener('click', fecharModalComentario);
  document.getElementById('btnSalvarComentario')?.addEventListener('click', salvarComentario);

  // Fechar modal ao clicar no overlay
  document.getElementById('novoComentarioOverlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('novoComentarioOverlay')) fecharModalComentario();
  });

  // Contador de caracteres + Ctrl+Enter para salvar
  document.getElementById('novoComentarioTexto')?.addEventListener('input', (e) => {
    document.getElementById('comentarioCharCount').textContent = e.target.value.length;
  });

  document.getElementById('novoComentarioTexto')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) salvarComentario();
  });
}