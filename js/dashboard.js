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
  usuario: null,
  notifAberto: false,
  realtimeNotifCanal: null  // Phase 5: active Realtime channel for notifications
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

    // Carregar dados iniciais em paralelo
    await Promise.all([
      carregarDashboard(),
      carregarContadorNotificacoes()
    ]);

    // Phase 5: iniciar realtime de notificações
    iniciarRealtimeNotificacoes();

  } catch (error) {
    console.error('Erro na inicialização do dashboard:', error);
    mostrarToast('Erro ao carregar dashboard. Tente recarregar a página.', 'erro');
  }
});

// ============================================
// CARREGAMENTO DE DADOS
// ============================================

async function carregarDashboard() {
  estado.carregando = true;
  mostrarLoading(true);

  try {
    estado.nichos = await WikiSupabase.buscarNichos();
    atualizarInterface();
  } catch (error) {
    console.error('Erro ao carregar nichos:', error);
    mostrarToast('Erro ao carregar nichos. Verifique sua conexão e tente novamente.', 'erro');
  } finally {
    estado.carregando = false;
    mostrarLoading(false);
  }
}

function atualizarInterface() {
  const welcomeSection = document.getElementById('welcomeSection');
  const nichosSection = document.getElementById('nichosSection');
  const emptyState = document.getElementById('emptyState');
  const nichosGrid = document.getElementById('nichosGrid');

  atualizarEstatisticasGerais();

  if (estado.nichos.length === 0) {
    welcomeSection.classList.remove('hidden');
    nichosSection.classList.add('hidden');
    emptyState.classList.remove('hidden');
    nichosGrid.innerHTML = '';
  } else {
    welcomeSection.classList.add('hidden');
    nichosSection.classList.remove('hidden');
    emptyState.classList.add('hidden');
    renderizarNichos();
  }
}

async function atualizarEstatisticasGerais() {
  const nichosStats = document.getElementById('nichosStats');
  if (!nichosStats) return;

  const totalNichos = estado.nichos.length;
  let totalCategorias = 0;
  let totalEntradas = 0;

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
// RENDERIZAÇÃO DE NICHOS
// ============================================

async function renderizarNichos() {
  const grid = document.getElementById('nichosGrid');
  if (!grid) return;

  if (estado.nichos.length === 0) {
    grid.innerHTML = '';
    return;
  }

  const nichosComStats = await Promise.all(
    estado.nichos.map(async (nicho) => {
      const stats = await WikiSupabase.obterEstatisticasNicho(nicho.id);
      return { ...nicho, stats };
    })
  );

  grid.innerHTML = nichosComStats.map(nicho => {
    const badgeCompartilhado = nicho.isShared
      ? `<span class="badge-compartilhado-card">&#128279; Compartilhado por ${escapeHtml(nicho.criadorNick || 'alguém')}</span>`
      : '';

    return `
    <div class="nicho-card" data-nicho-id="${nicho.id}">
      <div class="nicho-header">
        <div class="nicho-icon" style="background-color: ${nicho.cor}">
          ${nicho.icone || '🏠'}
        </div>
        <div class="nicho-info">
          <h3>${escapeHtml(nicho.nome)}</h3>
          ${badgeCompartilhado}
          <p>${escapeHtml(nicho.descricao || 'Sem descrição')}</p>
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
        ${nicho.isOwner ? `
        <button class="nicho-btn nicho-btn-secondary" onclick="event.stopPropagation(); abrirModalEditar('${nicho.id}')">
          <span>✏️</span>
          <span>Editar</span>
        </button>
        <button class="nicho-btn nicho-btn-danger" onclick="event.stopPropagation(); abrirModalExcluir('${nicho.id}')">
          <span>🗑️</span>
          <span>Excluir</span>
        </button>
        ` : `
        <button class="nicho-btn nicho-btn-danger" onclick="event.stopPropagation(); abrirModalSair('${nicho.id}')">
          <span>🚪</span>
          <span>Sair do nicho</span>
        </button>
        `}
      </div>
    </div>
  `;
  }).join('');
}

// ============================================
// NOTIFICAÇÕES
// ============================================

async function carregarContadorNotificacoes() {
  try {
    const count = await WikiSupabase.contarNotificacoesNaoLidas();
    atualizarBadge(count);
  } catch (error) {
    console.error('Erro ao carregar contador de notificações:', error);
  }
}

function atualizarBadge(count) {
  const badge = document.getElementById('bellBadge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

async function abrirPainelNotificacoes() {
  const panel = document.getElementById('notifPanel');
  if (!panel) return;

  estado.notifAberto = true;
  panel.classList.remove('hidden');

  // Carregar notificações
  const notifList = document.getElementById('notifList');
  notifList.innerHTML = '<div class="notif-empty">Carregando...</div>';

  try {
    const notifs = await WikiSupabase.buscarNotificacoes();
    renderizarNotificacoes(notifs);
  } catch (error) {
    notifList.innerHTML = '<div class="notif-empty">Erro ao carregar notificações.</div>';
  }
}

function fecharPainelNotificacoes() {
  const panel = document.getElementById('notifPanel');
  if (panel) panel.classList.add('hidden');
  estado.notifAberto = false;
}

function renderizarNotificacoes(notifs) {
  const notifList = document.getElementById('notifList');
  if (!notifList) return;

  if (!notifs.length) {
    notifList.innerHTML = '<div class="notif-empty">Nenhuma notificação</div>';
    return;
  }

  notifList.innerHTML = notifs.map(n => {
    const p = n.payload || {};
    const naoLida = !n.lida;
    const data = new Date(n.created_at).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });

    let conteudo = '';

    if (n.tipo === 'convite_nicho') {
      conteudo = `
        <div class="notif-msg">
          Você recebeu um convite para colaborar em <strong>${escapeHtml(p.nicho_nome || 'um nicho')}</strong>.
        </div>
        ${p.nicho_descricao ? `<div class="notif-nicho-desc">${escapeHtml(p.nicho_descricao)}</div>` : ''}
        <div class="notif-acoes">
          <button class="notif-btn-aceitar" onclick="aceitarConvite('${escapeHtml(p.convite_id)}', '${n.id}')">Aceitar</button>
          <button class="notif-btn-recusar" onclick="recusarConvite('${escapeHtml(p.convite_id)}', '${n.id}')">Recusar</button>
        </div>
      `;
    } else if (n.tipo === 'convite_aceito') {
      conteudo = `<div class="notif-msg">Seu convite para <strong>${escapeHtml(p.nicho_nome || 'um nicho')}</strong> foi aceito.</div>`;
    } else if (n.tipo === 'acesso_revogado') {
      conteudo = `<div class="notif-msg">Seu acesso ao nicho <strong>${escapeHtml(p.nicho_nome || '')}</strong> foi removido. Uma cópia independente foi salva no seu dashboard.</div>`;
    } else if (n.tipo === 'ownership_recebida') {
      conteudo = `<div class="notif-msg">Você agora é o dono do nicho <strong>${escapeHtml(p.nicho_nome || '')}</strong>.</div>`;
    } else if (n.tipo === 'membro_saiu') {
      conteudo = `<div class="notif-msg"><strong>${escapeHtml(p.user_email_saiu || '')}</strong> saiu do nicho <strong>${escapeHtml(p.nicho_nome || '')}</strong>.</div>`;
    } else if (n.tipo === 'nova_entrada') {
      const href = `entrada.html?id=${encodeURIComponent(p.entrada_id || '')}&nicho=${encodeURIComponent(p.nicho_id || '')}`;
      conteudo = `<div class="notif-msg">Nova entrada <a href="${href}"><strong>${escapeHtml(p.entrada_titulo || '')}</strong></a> em <strong>${escapeHtml(p.nicho_nome || '')}</strong>.</div>`;
    } else if (n.tipo === 'entrada_editada') {
      const href = `entrada.html?id=${encodeURIComponent(p.entrada_id || '')}&nicho=${encodeURIComponent(p.nicho_id || '')}`;
      conteudo = `<div class="notif-msg">A entrada <a href="${href}"><strong>${escapeHtml(p.entrada_titulo || '')}</strong></a> foi editada em <strong>${escapeHtml(p.nicho_nome || '')}</strong>.</div>`;
    } else if (n.tipo === 'novo_comentario') {
      const href = `entrada.html?id=${encodeURIComponent(p.entrada_id || '')}&nicho=${encodeURIComponent(p.nicho_id || '')}`;
      conteudo = `<div class="notif-msg">Novo comentário em <a href="${href}"><strong>${escapeHtml(p.entrada_titulo || '')}</strong></a> — <em>&ldquo;${escapeHtml(p.preview || '')}${p.preview && p.preview.length >= 120 ? '…' : ''}&rdquo;</em></div>`;
    } else {
      conteudo = `<div class="notif-msg">${escapeHtml(JSON.stringify(p))}</div>`;
    }

    return `
      <div class="notif-item ${naoLida ? 'nao-lida' : ''}" data-notif-id="${n.id}">
        ${conteudo}
        <div class="notif-data">${data}</div>
      </div>
    `;
  }).join('');
}

async function aceitarConvite(conviteId, notifId) {
  try {
    await WikiSupabase.responderConvite(conviteId, true);
    await WikiSupabase.marcarNotificacaoComoLida(notifId);
    mostrarToast('Convite aceito! O nicho aparecerá no seu dashboard.', 'sucesso');
    fecharPainelNotificacoes();
    await Promise.all([carregarDashboard(), carregarContadorNotificacoes()]);
  } catch (error) {
    console.error('Erro ao aceitar convite:', error);
    mostrarToast(error.message || 'Erro ao aceitar convite. Tente novamente.', 'erro');
  }
}

async function recusarConvite(conviteId, notifId) {
  try {
    await WikiSupabase.responderConvite(conviteId, false);
    await WikiSupabase.marcarNotificacaoComoLida(notifId);
    mostrarToast('Convite recusado.', 'info');
    fecharPainelNotificacoes();
    await carregarContadorNotificacoes();
  } catch (error) {
    console.error('Erro ao recusar convite:', error);
    mostrarToast(error.message || 'Erro ao recusar convite. Tente novamente.', 'erro');
  }
}

async function marcarTodasComoLidas() {
  try {
    await WikiSupabase.marcarTodasNotificacoesComoLidas();
    atualizarBadge(0);
    // Re-render panel without unread styles
    const notifs = await WikiSupabase.buscarNotificacoes();
    renderizarNotificacoes(notifs);
  } catch (error) {
    console.error('Erro ao marcar notificações como lidas:', error);
  }
}

// ============================================
// PHASE 5 — REALTIME NOTIFICAÇÕES
// ============================================

/**
 * Inicia subscrição Realtime para notificações do usuário atual.
 * Quando uma nova notificação chega, incrementa o badge e exibe um toast.
 * RLS garante que só chegam eventos para o usuário autenticado.
 */
function iniciarRealtimeNotificacoes() {
  estado.realtimeNotifCanal = WikiSupabase.iniciarRealtimeNotificacoes((payload) => {
    const notif = payload.new;
    if (!notif) return;

    // Incrementa o badge
    const badge = document.getElementById('bellBadge');
    const atual = badge ? (parseInt(badge.textContent, 10) || 0) : 0;
    atualizarBadge(atual + 1);

    // Toast com mensagem contextual
    const p = notif.payload || {};
    let mensagem = 'Você tem uma nova notificação.';

    if (notif.tipo === 'convite_nicho') {
      mensagem = `Você recebeu um convite para colaborar em "${p.nicho_nome || 'um nicho'}".`;
    } else if (notif.tipo === 'convite_aceito') {
      mensagem = `Seu convite para "${p.nicho_nome || 'um nicho'}" foi aceito!`;
    } else if (notif.tipo === 'acesso_revogado') {
      mensagem = `Seu acesso ao nicho "${p.nicho_nome || ''}" foi removido. Uma cópia foi salva no seu dashboard.`;
    } else if (notif.tipo === 'ownership_recebida') {
      mensagem = `Você agora é o dono do nicho "${p.nicho_nome || ''}".`;
    } else if (notif.tipo === 'membro_saiu') {
      mensagem = `${p.user_email_saiu || 'Um membro'} saiu do nicho "${p.nicho_nome || ''}".`;
    } else if (notif.tipo === 'nova_entrada') {
      mensagem = `Nova entrada "${p.entrada_titulo || ''}" em "${p.nicho_nome || ''}".`;
    } else if (notif.tipo === 'entrada_editada') {
      mensagem = `A entrada "${p.entrada_titulo || ''}" foi editada em "${p.nicho_nome || ''}".`;
    } else if (notif.tipo === 'novo_comentario') {
      mensagem = `Novo comentário em "${p.entrada_titulo || ''}" (${p.nicho_nome || ''}).`;
    }

    mostrarToast(mensagem, 'info');

    // Se for transferência de posse, recarregar lista de nichos
    if (notif.tipo === 'ownership_recebida' || notif.tipo === 'acesso_revogado') {
      carregarDashboard();
    }
  });

  // Limpa canal ao sair da página
  window.addEventListener('beforeunload', () => {
    WikiSupabase.pararRealtime(estado.realtimeNotifCanal);
  });
}

// ============================================
// MODAIS
// ============================================

function abrirModalCriar() {
  const modal = document.getElementById('nichoModalOverlay');
  const modalTitle = document.getElementById('modalTitle');
  const nichoForm = document.getElementById('nichoForm');

  modalTitle.textContent = 'Novo Nicho';
  document.getElementById('modalSaveBtn').onclick = () => salvarNicho();
  nichoForm.reset();

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

  modalTitle.textContent = 'Editar Nicho';
  modalSaveText.textContent = 'Salvar Alterações';
  modalSaveBtn.onclick = () => salvarNicho(nichoId);

  document.getElementById('nichoNome').value = nicho.nome;
  document.getElementById('nichoDescricao').value = nicho.descricao || '';
  document.getElementById('nichoIcone').value = nicho.icone || '🏠';
  document.getElementById('nichoCor').value = nicho.cor || '#3366cc';
  document.getElementById('colorPreview').textContent = nicho.cor || '#3366cc';

  modal.classList.add('active');
}

/**
 * Abre o modal de exclusão.
 * Busca membros do nicho para mostrar o aviso de transferência correto.
 * @param {string} nichoId
 */
async function abrirModalExcluir(nichoId) {
  const modal = document.getElementById('deleteModalOverlay');
  const deleteModalConfirmBtn = document.getElementById('deleteModalConfirmBtn');
  const warningContent = document.getElementById('deleteWarningContent');

  // Mostra o modal imediatamente com um estado de carregamento
  warningContent.innerHTML = `<div class="warning-icon">⏳</div><p>Verificando...</p>`;
  modal.classList.add('active');
  deleteModalConfirmBtn.onclick = () => excluirNicho(nichoId);

  try {
    const membros = await WikiSupabase.buscarMembrosNicho(nichoId);

    if (membros.length > 0) {
      const proximo = membros[0]; // ordenado por joined_at ASC — o mais antigo primeiro
      warningContent.innerHTML = `
        <div class="warning-icon">⚠️</div>
        <h4>Atenção!</h4>
        <p>Este nicho tem ${membros.length} colaborador(es). Ao excluí-lo, <strong>a posse será transferida para ${escapeHtml(proximo.nickname || 'o colaborador mais antigo')}</strong> e você perderá o acesso.</p>
        <p>Deseja realmente fazer isso?</p>
      `;
    } else {
      warningContent.innerHTML = `
        <div class="warning-icon">⚠️</div>
        <h4>Atenção!</h4>
        <p>Esta ação é <strong>irreversível</strong>. Todo o conteúdo deste nicho será excluído permanentemente:</p>
        <ul>
          <li>Todas as categorias</li>
          <li>Todas as entradas</li>
          <li>Todas as subcategorias</li>
        </ul>
        <p>Deseja realmente excluir este nicho?</p>
      `;
    }
  } catch (_) {
    warningContent.innerHTML = `
      <div class="warning-icon">⚠️</div>
      <h4>Atenção!</h4>
      <p>Esta ação pode ser irreversível. Se o nicho tiver colaboradores, a posse será transferida. Caso contrário, será excluído permanentemente.</p>
      <p>Deseja continuar?</p>
    `;
  }
}

// ============================================
// AÇÕES DE NICHOS
// ============================================

async function salvarNicho(nichoId = null) {
  const modal = document.getElementById('nichoModalOverlay');
  const modalSaveBtn = document.getElementById('modalSaveBtn');
  const modalSaveText = document.getElementById('modalSaveText');
  const modalLoading = document.getElementById('modalLoading');

  const nome = document.getElementById('nichoNome').value.trim();
  const descricao = document.getElementById('nichoDescricao').value.trim();
  const icone = document.getElementById('nichoIcone').value.trim() || '🏠';
  const cor = document.getElementById('nichoCor').value;

  if (!nome) {
    mostrarToast('Nome do nicho é obrigatório.', 'erro');
    return;
  }

  if (nome.length > 100) {
    mostrarToast('Nome do nicho deve ter no máximo 100 caracteres.', 'erro');
    return;
  }

  const dadosNicho = { nome, descricao, icone, cor };

  modalSaveBtn.disabled = true;
  modalSaveText.style.display = 'none';
  modalLoading.style.display = 'block';

  try {
    let resultado;

    if (nichoId) {
      resultado = await WikiSupabase.atualizarNicho(nichoId, dadosNicho);
    } else {
      resultado = await WikiSupabase.criarNicho(dadosNicho);
    }

    if (resultado) {
      modal.classList.remove('active');
      await carregarDashboard();
      mostrarToast(nichoId ? 'Nicho atualizado com sucesso!' : 'Nicho criado com sucesso!', 'sucesso');
    } else {
      throw new Error('Erro ao salvar nicho.');
    }

  } catch (error) {
    console.error('Erro ao salvar nicho:', error);
    mostrarToast(error.message || 'Erro ao salvar nicho. Tente novamente.', 'erro');
  } finally {
    modalSaveBtn.disabled = false;
    modalSaveText.style.display = 'inline';
    modalLoading.style.display = 'none';
  }
}

function abrirModalSair(nichoId) {
  const modal = document.getElementById('sairModalOverlay');
  const confirmBtn = document.getElementById('sairModalConfirmBtn');
  if (!modal || !confirmBtn) return;
  confirmBtn.onclick = () => sairDoNichoConfirmado(nichoId);
  modal.classList.add('active');
}

async function sairDoNichoConfirmado(nichoId) {
  const modal = document.getElementById('sairModalOverlay');
  const confirmBtn = document.getElementById('sairModalConfirmBtn');
  const btnText = document.getElementById('sairModalText');
  const spinner = document.getElementById('sairModalLoading');

  confirmBtn.disabled = true;
  if (btnText) btnText.style.display = 'none';
  if (spinner) spinner.style.display = 'block';

  try {
    const ok = await WikiSupabase.sairDoNicho(nichoId);
    if (!ok) throw new Error('Erro ao sair do nicho.');
    modal.classList.remove('active');
    await carregarDashboard();
    mostrarToast('Você saiu do nicho com sucesso.', 'sucesso');
  } catch (error) {
    console.error('Erro ao sair do nicho:', error);
    mostrarToast(error.message || 'Erro ao sair do nicho. Tente novamente.', 'erro');
  } finally {
    confirmBtn.disabled = false;
    if (btnText) btnText.style.display = 'inline';
    if (spinner) spinner.style.display = 'none';
  }
}

async function excluirNicho(nichoId) {
  const modal = document.getElementById('deleteModalOverlay');
  const deleteModalConfirmBtn = document.getElementById('deleteModalConfirmBtn');
  const deleteModalText = document.getElementById('deleteModalText');
  const deleteModalLoading = document.getElementById('deleteModalLoading');

  deleteModalConfirmBtn.disabled = true;
  deleteModalText.style.display = 'none';
  deleteModalLoading.style.display = 'block';

  try {
    const { sucesso, resultado, erro } = await WikiSupabase.excluirNicho(nichoId);

    if (!sucesso) throw new Error(erro || 'Erro ao excluir nicho.');

    modal.classList.remove('active');
    await carregarDashboard();

    if (resultado === 'transferred') {
      mostrarToast('A posse do nicho foi transferida para o próximo colaborador.', 'info');
    } else {
      mostrarToast('Nicho excluído com sucesso!', 'sucesso');
    }

  } catch (error) {
    console.error('Erro ao excluir nicho:', error);
    mostrarToast(error.message || 'Erro ao excluir nicho. Tente novamente.', 'erro');
  } finally {
    deleteModalConfirmBtn.disabled = false;
    deleteModalText.style.display = 'inline';
    deleteModalLoading.style.display = 'none';
  }
}

// ============================================
// BUSCA
// ============================================

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

  searchResultsList.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="loading" style="margin: 0 auto 20px;"></div>Buscando...</div>';

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
        <h4>${escapeHtml(nicho.nome)}</h4>
        <p>${escapeHtml(nicho.descricao || 'Sem descrição')}</p>
      </div>
    </div>
  `).join('');
}

// ============================================
// EVENT LISTENERS
// ============================================

function configurarEventListeners() {
  // Botões de ação
  document.getElementById('btnNovoNicho')?.addEventListener('click', (e) => { e.stopPropagation(); abrirModalCriar(); });
  document.getElementById('btnGetStarted')?.addEventListener('click', (e) => { e.stopPropagation(); abrirModalCriar(); });
  document.getElementById('btnCreateFirstNicho')?.addEventListener('click', (e) => { e.stopPropagation(); abrirModalCriar(); });

  // Modal de nicho
  document.getElementById('modalCloseBtn')?.addEventListener('click', () => {
    document.getElementById('nichoModalOverlay').classList.remove('active');
  });

  document.getElementById('modalCancelBtn')?.addEventListener('click', () => {
    document.getElementById('nichoModalOverlay').classList.remove('active');
  });

  // Modal de exclusão
  document.getElementById('deleteModalCloseBtn')?.addEventListener('click', () => {
    document.getElementById('deleteModalOverlay').classList.remove('active');
  });

  document.getElementById('deleteModalCancelBtn')?.addEventListener('click', () => {
    document.getElementById('deleteModalOverlay').classList.remove('active');
  });

  // Modal de sair do nicho
  document.getElementById('sairModalCloseBtn')?.addEventListener('click', () => {
    document.getElementById('sairModalOverlay').classList.remove('active');
  });

  document.getElementById('sairModalCancelBtn')?.addEventListener('click', () => {
    document.getElementById('sairModalOverlay').classList.remove('active');
  });

  // Seletor de ícones
  document.querySelectorAll('.icon-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('nichoIcone').value = btn.dataset.icon;
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
      timeout = setTimeout(() => buscarNichos(e.target.value), 300);
    });
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') buscarNichos(e.target.value);
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => buscarNichos(searchInput.value));
  }

  // Sino de notificações
  const btnNotif = document.getElementById('btnNotif');
  const notifWrapper = document.getElementById('notifWrapper');

  if (btnNotif) {
    btnNotif.addEventListener('click', (e) => {
      e.stopPropagation();
      if (estado.notifAberto) {
        fecharPainelNotificacoes();
      } else {
        abrirPainelNotificacoes();
      }
    });
  }

  // Marcar todas como lidas
  document.getElementById('btnMarcarTodasLidas')?.addEventListener('click', (e) => {
    e.stopPropagation();
    marcarTodasComoLidas();
  });

  // Fechar painel ao clicar fora
  document.addEventListener('click', (e) => {
    if (estado.notifAberto && notifWrapper && !notifWrapper.contains(e.target)) {
      fecharPainelNotificacoes();
    }

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

    const sairModal = document.getElementById('sairModalOverlay');
    if (sairModal && sairModal.classList.contains('active')) {
      if (!sairModal.querySelector('.modal').contains(e.target)) {
        sairModal.classList.remove('active');
      }
    }
  });
}

// ============================================
// FUNÇÕES DE UTILIDADE
// ============================================

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
  console.log(show ? 'Carregando...' : 'Carregamento concluído');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================
// FUNÇÕES GLOBAIS (para onclick nos botões)
// ============================================

window.abrirModalCriar = abrirModalCriar;
window.abrirModalEditar = abrirModalEditar;
window.abrirModalExcluir = abrirModalExcluir;
window.aceitarConvite = aceitarConvite;
window.recusarConvite = recusarConvite;
