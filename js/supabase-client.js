/**
 * WikiLocal + Supabase - Cliente de Banco de Dados
 * Configuração e funções para comunicação com Supabase
 */

// ============================================
// CONFIGURAÇÃO DO SUPABASE
// ============================================

// SUBSTITUA ESTES VALORES COM OS SEUS DO SUPABASE
// Atenção: as variáveis precisam ficar acessíveis a outros scripts
// (auth.js asume que SUPABASE_URL e SUPABASE_ANON_KEY estão no escopo global).
// `const`/`let` não exportam nada para `window` em um <script> normal, portanto
// atribuímos também a `window` ou usamos `var`.

// exemplo usando `window.` para garantir disponibilidade global:
window.SUPABASE_URL = 'https://wuxceywvrrxpjcwqncpn.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_89C9xeXVNWVBdKjr7qT2Tw_yJlKZBOX';

// também criamos constantes locais para não modificar o restante do código abaixo
const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

// Inicializa o cliente Supabase (variável com nome diferente para evitar conflito)
let supabaseClientInstance = null;

// Criar cliente Supabase IMEDIATAMENTE (não renderizado)
(function initSupabaseEarly() {
  // A biblioteca Supabase UMD expõe window.supabase
  if (typeof window.supabase === 'undefined') {
    console.warn('Supabase biblioteca ainda não carregada');
    return;
  }
  
  // Verifica se as credenciais foram configuradas
  if (SUPABASE_URL.includes('SEU-PROJETO') || SUPABASE_ANON_KEY.includes('sua-chave')) {
    console.warn('⚠️ Configure suas credenciais do Supabase no arquivo js/supabase-client.js');
    return;
  }
  
  supabaseClientInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('Supabase client inicializado com sucesso');
})();

function inicializarSupabase() {
  // Se já foi inicializado, apenas retorna
  if (supabaseClientInstance) {
    return supabaseClientInstance;
  }
  
  // A biblioteca Supabase UMD expõe window.supabase
  if (typeof window.supabase === 'undefined') {
    console.error('Biblioteca do Supabase não carregada!');
    return null;
  }
  
  // Verifica se as credenciais foram configuradas
  if (SUPABASE_URL.includes('SEU-PROJETO') || SUPABASE_ANON_KEY.includes('sua-chave')) {
    console.warn('⚠️ Configure suas credenciais do Supabase no arquivo js/supabase-client.js');
    return null;
  }
  
  supabaseClientInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabaseClientInstance;
}

// ============================================
// FUNÇÕES DE CATEGORIAS
// ============================================

/**
 * Obtém o ID do usuário atualmente autenticado
 */
async function obterUsuarioIdAtual() {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return null;
  
  try {
    const { data: { user }, error } = await supabaseClientInstance.auth.getUser();
    if (error) {
      console.error('Erro ao obter usuário:', error);
      return null;
    }
    return user?.id || null;
  } catch (error) {
    console.error('Erro ao obter ID do usuário:', error);
    return null;
  }
}

/**
 * Busca todas as categorias do Supabase
 */
async function buscarCategorias() {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) {
    console.error('Cliente Supabase não disponível');
    return [];
  }
  
  try {
    // Debug: verificar se o usuário está autenticado
    const { data: { user } } = await supabaseClientInstance.auth.getUser();
    console.log('Usuário na busca de categorias:', user ? user.email : 'não autenticado');
    
    const { data, error } = await supabaseClientInstance
      .from('categorias')
      .select('*')
      .order('nome');
    
    if (error) {
      console.error('Erro Supabase ao buscar categorias:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
    
    console.log('Categorias carregadas com sucesso:', data?.length || 0, 'itens');
    return data || [];
  } catch (erro) {
    console.error('Erro ao buscar categorias:', erro);
    return [];
  }
}

/**
 * Busca uma categoria pelo ID
 */
async function buscarCategoriaPorId(id) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return null;
  
  try {
    const { data, error } = await supabaseClientInstance
      .from('categorias')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (erro) {
    console.error('Erro ao buscar categoria:', erro);
    return null;
  }
}

/**
 * Cria uma nova categoria
 */
async function criarCategoria(categoria) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return null;
  
  try {
    // Obter ID do usuário logado
    const userId = await obterUsuarioIdAtual();
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }
    
    // Adicionar user_id ao objeto categoria
    const categoriaComUser = {
      ...categoria,
      user_id: userId
    };
    
    const { data, error } = await supabaseClientInstance
      .from('categorias')
      .insert([categoriaComUser])
      .select()
      .single();
    
    if (error) throw error;
    console.log('Categoria criada com sucesso:', data);
    return data;
  } catch (erro) {
    console.error('Erro ao criar categoria:', erro);
    return null;
  }
}

/**
 * Atualiza uma categoria
 */
async function atualizarCategoria(id, dados) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return null;
  
  try {
    const { data, error } = await supabaseClientInstance
      .from('categorias')
      .update(dados)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (erro) {
    console.error('Erro ao atualizar categoria:', erro);
    return null;
  }
}

/**
 * Exclui uma categoria
 */
async function excluirCategoria(id) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return false;
  
  try {
    const { error } = await supabaseClientInstance
      .from('categorias')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (erro) {
    console.error('Erro ao excluir categoria:', erro);
    return false;
  }
}

// ============================================
// FUNÇÕES DE ENTRADAS
// ============================================

/**
 * Busca todas as entradas do Supabase
 */
async function buscarEntradas() {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) {
    console.error('Cliente Supabase não disponível');
    return [];
  }
  
  try {
    const { data, error } = await supabaseClientInstance
      .from('entradas')
      .select('*')
      .order('titulo');
    
    if (error) {
      console.error('Erro Supabase ao buscar entradas:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      throw error;
    }
    
    console.log('Entradas carregadas com sucesso:', data?.length || 0, 'itens');
    return data || [];
  } catch (erro) {
    console.error('Erro ao buscar entradas:', erro);
    return [];
  }
}

/**
 * Busca uma entrada pelo ID
 */
async function buscarEntradaPorId(id) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return null;
  
  try {
    const { data, error } = await supabaseClientInstance
      .from('entradas')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (erro) {
    console.error('Erro ao buscar entrada:', erro);
    return null;
  }
}

/**
 * Busca entradas de uma categoria específica
 */
async function buscarEntradasPorCategoria(categoriaId) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return [];
  
  try {
    const { data, error } = await supabaseClientInstance
      .from('entradas')
      .select('*')
      .eq('categoria_id', categoriaId)
      .order('titulo');
    
    if (error) throw error;
    return data || [];
  } catch (erro) {
    console.error('Erro ao buscar entradas da categoria:', erro);
    return [];
  }
}

/**
 * Cria uma nova entrada
 */
async function criarEntrada(entrada) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return null;
  
  try {
    // Obter ID do usuário logado
    const userId = await obterUsuarioIdAtual();
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }
    
    // Adicionar user_id ao objeto entrada
    const entradaComUser = {
      ...entrada,
      user_id: userId
    };
    
    const { data, error } = await supabaseClientInstance
      .from('entradas')
      .insert([entradaComUser])
      .select()
      .single();
    
    if (error) throw error;
    console.log('Entrada criada com sucesso:', data);
    return data;
  } catch (erro) {
    console.error('Erro ao criar entrada:', erro);
    return null;
  }
}

/**
 * Atualiza uma entrada
 */
async function atualizarEntrada(id, dados) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return null;
  
  try {
    const { data, error } = await supabaseClientInstance
      .from('entradas')
      .update(dados)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (erro) {
    console.error('Erro ao atualizar entrada:', erro);
    return null;
  }
}

/**
 * Exclui uma entrada
 */
async function excluirEntrada(id) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return false;
  
  try {
    const { error } = await supabaseClientInstance
      .from('entradas')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (erro) {
    console.error('Erro ao excluir entrada:', erro);
    return false;
  }
}

/**
 * Busca entradas por termo (título ou conteúdo)
 */
async function buscarEntradasPorTermo(termo) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return [];
  
  try {
    const { data, error } = await supabaseClientInstance
      .from('entradas')
      .select('*')
      .or(`titulo.ilike.%${termo}%,conteudo.ilike.%${termo}%`)
      .order('titulo');
    
    if (error) throw error;
    return data || [];
  } catch (erro) {
    console.error('Erro ao buscar entradas:', erro);
    return [];
  }
}

// ============================================
// AUTENTICAÇÃO (Opcional)
// ============================================

/**
 * Verifica se há usuário logado
 */
async function verificarUsuario() {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return null;
  
  try {
    const { data: { user }, error } = await supabaseClientInstance.auth.getUser();
    if (error) throw error;
    return user;
  } catch (erro) {
    return null;
  }
}

/**
 * Faz login com email e senha
 */
async function login(email, senha) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return null;
  
  try {
    const { data, error } = await supabaseClientInstance.auth.signInWithPassword({
      email: email,
      password: senha
    });
    
    if (error) throw error;
    return data.user;
  } catch (erro) {
    console.error('Erro no login:', erro);
    return null;
  }
}

/**
 * Faz logout
 */
async function logout() {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return false;
  
  try {
    const { error } = await supabaseClientInstance.auth.signOut();
    if (error) throw error;
    return true;
  } catch (erro) {
    console.error('Erro no logout:', erro);
    return false;
  }
}

// ============================================
// FUNÇÕES DE MIGRAÇÃO (JSON → Supabase)
// ============================================

/**
 * Migra dados dos JSONs locais para o Supabase
 * Útil para importar dados iniciais
 */
async function migrarDadosDoJSON() {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return false;
  
  try {
    // Carrega dados dos JSONs
    const [respCat, respEnt] = await Promise.all([
      fetch('data/categorias.json'),
      fetch('data/entradas.json')
    ]);
    
    const dadosCat = await respCat.json();
    const dadosEnt = await respEnt.json();
    
    // Prepara categorias para inserção
    const categorias = dadosCat.categorias.map(c => ({
      id: c.id,
      nome: c.nome,
      icone: c.icone,
      cor: c.cor,
      descricao: c.descricao
    }));
    
    // Prepara entradas para inserção
    const entradas = dadosEnt.entradas.map(e => ({
      id: e.id,
      titulo: e.titulo,
      slug: e.slug,
      categoria_id: e.categoriaId,
      conteudo: e.conteudo,
      data_criacao: e.dataCriacao,
      data_atualizacao: e.dataAtualizacao
    }));
    
    // Insere no Supabase
    if (categorias.length > 0) {
      const { error: errCat } = await supabaseClientInstance
        .from('categorias')
        .upsert(categorias, { onConflict: 'id' });
      if (errCat) throw errCat;
    }
    
    if (entradas.length > 0) {
      const { error: errEnt } = await supabaseClientInstance
        .from('entradas')
        .upsert(entradas, { onConflict: 'id' });
      if (errEnt) throw errEnt;
    }
    
    console.log('✅ Migração concluída!');
    return true;
  } catch (erro) {
    console.error('Erro na migração:', erro);
    return false;
  }
}

// ============================================
// FUNÇÕES DE NICHOS
// ============================================

/**
 * Busca todos os nichos do usuário atual
 */
async function buscarNichos() {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) {
    console.error('Cliente Supabase não disponível');
    return [];
  }
  
  try {
    const userId = await obterUsuarioIdAtual();
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }
    
    // RLS garante que só retornam nichos acessíveis (próprios + compartilhados).
    // Não filtramos por user_id aqui — a política cuida disso.
    const { data, error } = await supabaseClientInstance
      .from('nichos')
      .select('*')
      .order('nome');

    if (error) {
      console.error('Erro Supabase ao buscar nichos:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      throw error;
    }

    // Anota cada nicho como próprio ou compartilhado para uso na UI
    const nichos = (data || []).map(n => ({
      ...n,
      isOwner: n.user_id === userId,
      isShared: n.user_id !== userId
    }));

    console.log('Nichos carregados com sucesso:', nichos.length, 'itens');
    return nichos;
  } catch (erro) {
    console.error('Erro ao buscar nichos:', erro);
    return [];
  }
}

/**
 * Busca um nicho específico pelo ID
 */
async function buscarNichoPorId(id) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return null;
  
  try {
    const { data, error } = await supabaseClientInstance
      .from('nichos')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (erro) {
    console.error('Erro ao buscar nicho:', erro);
    return null;
  }
}

/**
 * Cria um novo nicho
 */
async function criarNicho(nicho) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return null;
  
  try {
    // Obter ID do usuário logado
    const userId = await obterUsuarioIdAtual();
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }
    
    // Validar dados do nicho
    if (!nicho.nome || nicho.nome.trim().length === 0) {
      throw new Error('Nome do nicho é obrigatório');
    }
    
    if (nicho.nome.length > 100) {
      throw new Error('Nome do nicho deve ter no máximo 100 caracteres');
    }
    
    // Adicionar user_id ao objeto nicho
    const nichoComUser = {
      ...nicho,
      user_id: userId
    };
    
    const { data, error } = await supabaseClientInstance
      .from('nichos')
      .insert([nichoComUser])
      .select()
      .single();
    
    if (error) throw error;
    console.log('Nicho criado com sucesso:', data);
    return data;
  } catch (erro) {
    console.error('Erro ao criar nicho:', erro);
    return null;
  }
}

/**
 * Atualiza um nicho
 */
async function atualizarNicho(id, dados) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return null;
  
  try {
    const { data, error } = await supabaseClientInstance
      .from('nichos')
      .update(dados)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (erro) {
    console.error('Erro ao atualizar nicho:', erro);
    return null;
  }
}

/**
 * Exclui um nicho e todo o seu conteúdo
 */
async function excluirNicho(id) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return { sucesso: false };

  try {
    // Usa stored procedure para lidar com nichos compartilhados:
    // - Se tiver membros: transfere posse ao membro mais antigo (não exclui).
    // - Se não tiver membros: exclui (CASCADE apaga categorias e entradas).
    const { data, error } = await supabaseClientInstance
      .rpc('transferir_ou_excluir_nicho', { p_nicho_id: id });

    if (error) throw error;
    // data === 'transferred' | 'deleted'
    return { sucesso: true, resultado: data };
  } catch (erro) {
    console.error('Erro ao excluir nicho:', erro);
    return { sucesso: false, erro: erro.message };
  }
}

/**
 * Valida se o usuário tem acesso a um nicho específico
 */
async function validarAcessoNicho(nichoId) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return false;
  
  try {
    const userId = await obterUsuarioIdAtual();
    if (!userId) return false;
    
    // RLS verifica acesso: dono OU membro via nicho_membros.
    // Não filtramos por user_id — a política de SELECT já faz isso.
    const { data, error } = await supabaseClientInstance
      .from('nichos')
      .select('id')
      .eq('id', nichoId)
      .single();

    if (error) return false;
    return data !== null;
  } catch (erro) {
    console.error('Erro ao validar acesso ao nicho:', erro);
    return false;
  }
}

// ============================================
// FUNÇÕES DE CATEGORIAS (ATUALIZADAS PARA NICHOS)
// ============================================

/**
 * Busca categorias de um nicho específico
 */
async function buscarCategoriasPorNicho(nichoId) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return [];
  
  try {
    const { data, error } = await supabaseClientInstance
      .from('categorias')
      .select('*')
      .eq('nicho_id', nichoId)
      .order('nome');
    
    if (error) throw error;
    return data || [];
  } catch (erro) {
    console.error('Erro ao buscar categorias do nicho:', erro);
    return [];
  }
}

/**
 * Cria uma nova categoria em um nicho específico
 */
async function criarCategoriaEmNicho(nichoId, categoria) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return null;
  
  try {
    // Validar acesso ao nicho
    const temAcesso = await validarAcessoNicho(nichoId);
    if (!temAcesso) {
      throw new Error('Acesso negado ao nicho');
    }
    
    // Validar dados da categoria
    if (!categoria.nome || categoria.nome.trim().length === 0) {
      throw new Error('Nome da categoria é obrigatório');
    }
    
    const userId = await obterUsuarioIdAtual();
    // Adicionar nicho_id e user_id ao objeto categoria
    const categoriaComNicho = {
      ...categoria,
      nicho_id: nichoId,
      user_id: userId
    };
    
    const { data, error } = await supabaseClientInstance
      .from('categorias')
      .insert([categoriaComNicho])
      .select()
      .single();
    
    if (error) throw error;
    console.log('Categoria criada no nicho com sucesso:', data);
    return data;
  } catch (erro) {
    console.error('Erro ao criar categoria no nicho:', erro);
    return null;
  }
}

/**
 * Atualiza uma categoria em um nicho específico
 */
async function atualizarCategoriaEmNicho(nichoId, categoriaId, dados) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return null;
  
  try {
    // Validar acesso ao nicho
    const temAcesso = await validarAcessoNicho(nichoId);
    if (!temAcesso) {
      throw new Error('Acesso negado ao nicho');
    }
    
    const userId = await obterUsuarioIdAtual();
    const { data, error } = await supabaseClientInstance
      .from('categorias')
      .update({ ...dados, updated_by: userId })
      .eq('id', categoriaId)
      .eq('nicho_id', nichoId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (erro) {
    console.error('Erro ao atualizar categoria no nicho:', erro);
    return null;
  }
}

/**
 * Exclui uma categoria de um nicho específico
 */
async function excluirCategoriaDeNicho(nichoId, categoriaId) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return false;
  
  try {
    // Validar acesso ao nicho
    const temAcesso = await validarAcessoNicho(nichoId);
    if (!temAcesso) {
      throw new Error('Acesso negado ao nicho');
    }
    
    const { error } = await supabaseClientInstance
      .from('categorias')
      .delete()
      .eq('id', categoriaId)
      .eq('nicho_id', nichoId);
    
    if (error) throw error;
    return true;
  } catch (erro) {
    console.error('Erro ao excluir categoria do nicho:', erro);
    return false;
  }
}

// ============================================
// FUNÇÕES DE ENTRADAS (ATUALIZADAS PARA NICHOS)
// ============================================

/**
 * Busca entradas de um nicho específico
 */
async function buscarEntradasPorNicho(nichoId) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return [];
  
  try {
    const { data, error } = await supabaseClientInstance
      .from('entradas')
      .select('*')
      .eq('nicho_id', nichoId)
      .order('titulo');
    
    if (error) throw error;
    return data || [];
  } catch (erro) {
    console.error('Erro ao buscar entradas do nicho:', erro);
    return [];
  }
}

/**
 * Busca entradas por termo dentro de um nicho específico
 */
async function buscarEntradasPorTermoNoNicho(nichoId, termo) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return [];
  
  try {
    const { data, error } = await supabaseClientInstance
      .from('entradas')
      .select('*')
      .eq('nicho_id', nichoId)
      .or(`titulo.ilike.%${termo}%,conteudo.ilike.%${termo}%`)
      .order('titulo');
    
    if (error) throw error;
    return data || [];
  } catch (erro) {
    console.error('Erro ao buscar entradas no nicho:', erro);
    return [];
  }
}

/**
 * Cria uma nova entrada em um nicho específico
 */
async function criarEntradaEmNicho(nichoId, entrada) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return null;
  
  try {
    // Validar acesso ao nicho
    const temAcesso = await validarAcessoNicho(nichoId);
    if (!temAcesso) {
      throw new Error('Acesso negado ao nicho');
    }
    
    // Validar dados da entrada
    if (!entrada.titulo || entrada.titulo.trim().length === 0) {
      throw new Error('Título da entrada é obrigatório');
    }
    
    if (!entrada.conteudo || entrada.conteudo.trim().length === 0) {
      throw new Error('Conteúdo da entrada é obrigatório');
    }
    
    const userId = await obterUsuarioIdAtual();
    // Adicionar nicho_id e user_id ao objeto entrada
    const entradaComNicho = {
      ...entrada,
      nicho_id: nichoId,
      user_id: userId
    };
    
    const { data, error } = await supabaseClientInstance
      .from('entradas')
      .insert([entradaComNicho])
      .select()
      .single();
    
    if (error) throw error;
    console.log('Entrada criada no nicho com sucesso:', data);
    return data;
  } catch (erro) {
    console.error('Erro ao criar entrada no nicho:', erro);
    return null;
  }
}

/**
 * Atualiza uma entrada em um nicho específico
 */
async function atualizarEntradaEmNicho(nichoId, entradaId, dados) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return null;
  
  try {
    // Validar acesso ao nicho
    const temAcesso = await validarAcessoNicho(nichoId);
    if (!temAcesso) {
      throw new Error('Acesso negado ao nicho');
    }
    
    const userId = await obterUsuarioIdAtual();
    const { data, error } = await supabaseClientInstance
      .from('entradas')
      .update({ ...dados, updated_by: userId })
      .eq('id', entradaId)
      .eq('nicho_id', nichoId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (erro) {
    console.error('Erro ao atualizar entrada no nicho:', erro);
    return null;
  }
}

/**
 * Exclui uma entrada de um nicho específico
 */
async function excluirEntradaDeNicho(nichoId, entradaId) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return false;
  
  try {
    // Validar acesso ao nicho
    const temAcesso = await validarAcessoNicho(nichoId);
    if (!temAcesso) {
      throw new Error('Acesso negado ao nicho');
    }
    
    const { error } = await supabaseClientInstance
      .from('entradas')
      .delete()
      .eq('id', entradaId)
      .eq('nicho_id', nichoId);
    
    if (error) throw error;
    return true;
  } catch (erro) {
    console.error('Erro ao excluir entrada do nicho:', erro);
    return false;
  }
}

// ============================================
// FUNÇÕES DE SUPORTE
// ============================================

/**
 * Obtém estatísticas de um nicho (quantidade de categorias e entradas)
 */
async function obterEstatisticasNicho(nichoId) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return { categorias: 0, entradas: 0 };
  
  try {
    // Contar categorias
    const { count: categorias, error: errorCat } = await supabaseClientInstance
      .from('categorias')
      .select('*', { count: 'exact' })
      .eq('nicho_id', nichoId);
    
    if (errorCat) throw errorCat;
    
    // Contar entradas
    const { count: entradas, error: errorEnt } = await supabaseClientInstance
      .from('entradas')
      .select('*', { count: 'exact' })
      .eq('nicho_id', nichoId);
    
    if (errorEnt) throw errorEnt;
    
    return {
      categorias: categorias || 0,
      entradas: entradas || 0
    };
  } catch (erro) {
    console.error('Erro ao obter estatísticas do nicho:', erro);
    return { categorias: 0, entradas: 0 };
  }
}

/**
 * Busca todas as categorias e entradas de um nicho (para carregamento rápido)
 */
async function carregarConteudoNicho(nichoId) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return { categorias: [], entradas: [] };
  
  try {
    // Validar acesso ao nicho
    const temAcesso = await validarAcessoNicho(nichoId);
    if (!temAcesso) {
      throw new Error('Acesso negado ao nicho');
    }
    
    // Buscar categorias e entradas em paralelo
    const [categorias, entradas] = await Promise.all([
      buscarCategoriasPorNicho(nichoId),
      buscarEntradasPorNicho(nichoId)
    ]);
    
    return { categorias, entradas };
  } catch (erro) {
    console.error('Erro ao carregar conteúdo do nicho:', erro);
    return { categorias: [], entradas: [] };
  }
}

// ============================================
// FUNÇÕES DE COMPARTILHAMENTO
// ============================================

/**
 * Verifica se o usuário atual é o dono de um nicho.
 * Usado para decidir quais controles mostrar na UI (ex: botão Compartilhar).
 */
async function verificarSeEhDono(nichoId) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return false;

  try {
    const userId = await obterUsuarioIdAtual();
    if (!userId) return false;

    const { data, error } = await supabaseClientInstance
      .from('nichos')
      .select('user_id')
      .eq('id', nichoId)
      .single();

    if (error) return false;
    return data?.user_id === userId;
  } catch (erro) {
    console.error('Erro ao verificar dono do nicho:', erro);
    return false;
  }
}

/**
 * Busca usuários por nickname para o autocomplete do modal de compartilhar.
 * Retorna até 10 resultados com email mascarado para diferenciar homônimos.
 * @param {string} termo - Texto digitado pelo usuário
 * @returns {Array<{id, nickname, email_masked}>}
 */
async function buscarUsuariosPorNickname(termo) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return [];

  try {
    const { data, error } = await supabaseClientInstance
      .rpc('buscar_usuarios_por_nickname', { p_termo: termo });

    if (error) throw error;
    return data || [];
  } catch (erro) {
    console.error('Erro ao buscar usuários:', erro);
    return [];
  }
}

/**
 * Envia um convite de compartilhamento para outro usuário.
 * Só pode ser chamado pelo dono do nicho.
 * @param {string} nichoId
 * @param {string} paraUserId - UUID do usuário a ser convidado
 * @returns {string|null} ID do convite criado, ou null em caso de erro
 */
async function enviarConvite(nichoId, paraUserId) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return null;

  try {
    const { data, error } = await supabaseClientInstance
      .rpc('enviar_convite', { p_nicho_id: nichoId, p_para_user_id: paraUserId });

    if (error) throw error;
    return data; // convite_id
  } catch (erro) {
    console.error('Erro ao enviar convite:', erro);
    throw erro; // Re-lança para a UI exibir a mensagem de erro específica
  }
}

/**
 * Aceita ou recusa um convite de compartilhamento.
 * @param {string} conviteId
 * @param {boolean} aceitar
 */
async function responderConvite(conviteId, aceitar) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return;

  try {
    const { error } = await supabaseClientInstance
      .rpc('responder_convite', { p_convite_id: conviteId, p_aceitar: aceitar });

    if (error) throw error;
  } catch (erro) {
    console.error('Erro ao responder convite:', erro);
    throw erro;
  }
}

/**
 * Remove um membro do nicho e entrega a ele uma cópia independente (fork).
 * Só pode ser chamado pelo dono do nicho.
 * @param {string} nichoId
 * @param {string} userIdRemover - UUID do membro a ser removido
 */
async function revogarMembroEForkar(nichoId, userIdRemover) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return;

  try {
    const { error } = await supabaseClientInstance
      .rpc('revogar_membro_e_forkar', {
        p_nicho_id: nichoId,
        p_user_id_remover: userIdRemover
      });

    if (error) throw error;
  } catch (erro) {
    console.error('Erro ao revogar membro:', erro);
    throw erro;
  }
}

/**
 * Busca a lista de membros de um nicho, com nickname e email mascarado.
 * @param {string} nichoId
 * @returns {Array<{id, user_id, role, joined_at, nickname, email_masked}>}
 */
async function buscarMembrosNicho(nichoId) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return [];

  try {
    const { data: membros, error } = await supabaseClientInstance
      .from('nicho_membros')
      .select('id, user_id, role, joined_at, convidado_por')
      .eq('nicho_id', nichoId)
      .order('joined_at');

    if (error) throw error;
    if (!membros?.length) return [];

    // Busca perfis dos membros em lote
    const userIds = membros.map(m => m.user_id);
    const { data: users, error: userError } = await supabaseClientInstance
      .from('users')
      .select('id, nickname, email')
      .in('id', userIds);

    if (userError) throw userError;

    const userMap = {};
    (users || []).forEach(u => {
      userMap[u.id] = {
        nickname: u.nickname,
        // Mascara email igual à stored procedure: j***@gmail.com
        email_masked: u.email
          ? u.email.charAt(0) + '***@' + u.email.split('@')[1]
          : ''
      };
    });

    return membros.map(m => ({
      ...m,
      nickname: userMap[m.user_id]?.nickname || 'Usuário',
      email_masked: userMap[m.user_id]?.email_masked || ''
    }));
  } catch (erro) {
    console.error('Erro ao buscar membros do nicho:', erro);
    return [];
  }
}

/**
 * Busca as notificações do usuário atual.
 * @param {boolean} apenasNaoLidas - Se true, retorna só as não lidas
 * @returns {Array}
 */
async function buscarNotificacoes(apenasNaoLidas = false) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return [];

  try {
    let query = supabaseClientInstance
      .from('notificacoes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (apenasNaoLidas) {
      query = query.eq('lida', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (erro) {
    console.error('Erro ao buscar notificações:', erro);
    return [];
  }
}

/**
 * Conta notificações não lidas do usuário atual.
 * Usado para o badge do sino no dashboard.
 * @returns {number}
 */
async function contarNotificacoesNaoLidas() {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return 0;

  try {
    const { count, error } = await supabaseClientInstance
      .from('notificacoes')
      .select('*', { count: 'exact', head: true })
      .eq('lida', false);

    if (error) throw error;
    return count || 0;
  } catch (erro) {
    console.error('Erro ao contar notificações:', erro);
    return 0;
  }
}

/**
 * Marca uma notificação específica como lida.
 * @param {string} id
 */
async function marcarNotificacaoComoLida(id) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return;

  try {
    const { error } = await supabaseClientInstance
      .from('notificacoes')
      .update({ lida: true })
      .eq('id', id);

    if (error) throw error;
  } catch (erro) {
    console.error('Erro ao marcar notificação como lida:', erro);
  }
}

/**
 * Marca todas as notificações do usuário atual como lidas.
 */
async function marcarTodasNotificacoesComoLidas() {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return;

  try {
    const { error } = await supabaseClientInstance
      .from('notificacoes')
      .update({ lida: true })
      .eq('lida', false);
    // RLS restringe o UPDATE ao user_id = auth.uid(), não precisamos filtrar aqui.

    if (error) throw error;
  } catch (erro) {
    console.error('Erro ao marcar todas notificações como lidas:', erro);
  }
}

// ============================================
// FUNÇÕES DE REALTIME (PHASE 5)
// ============================================

/**
 * Busca perfis (id + nickname) de uma lista de UUIDs.
 * Usado para resolver updated_by → nickname nas views de entradas.
 * @param {string[]} ids
 * @returns {Array<{id, nickname}>}
 */
async function buscarPerfisPorIds(ids) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance || !ids?.length) return [];

  try {
    const { data, error } = await supabaseClientInstance
      .from('users')
      .select('id, nickname')
      .in('id', ids);

    if (error) throw error;
    return data || [];
  } catch (erro) {
    console.error('Erro ao buscar perfis:', erro);
    return [];
  }
}

/**
 * Inicia uma subscrição Realtime para categorias e entradas de um nicho.
 * Retorna o canal criado (necessário para pararRealtime()).
 * @param {string} nichoId
 * @param {{ onCategoria: Function, onEntrada: Function }} handlers
 * @returns {RealtimeChannel}
 */
function iniciarRealtimeNicho(nichoId, { onCategoria, onEntrada }) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return null;

  const canal = supabaseClientInstance
    .channel(`nicho-${nichoId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'categorias', filter: `nicho_id=eq.${nichoId}` },
      (payload) => onCategoria && onCategoria(payload)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'entradas', filter: `nicho_id=eq.${nichoId}` },
      (payload) => onEntrada && onEntrada(payload)
    )
    .subscribe((status) => {
      console.log('Realtime nicho status:', status);
    });

  return canal;
}

/**
 * Inicia uma subscrição Realtime para notificações do usuário atual.
 * RLS garante que só chegam eventos do próprio usuário.
 * @param {Function} onNova - Chamado com o payload de cada INSERT
 * @returns {RealtimeChannel}
 */
function iniciarRealtimeNotificacoes(onNova) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return null;

  const canal = supabaseClientInstance
    .channel('notificacoes-usuario')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notificacoes' },
      (payload) => onNova && onNova(payload)
    )
    .subscribe((status) => {
      console.log('Realtime notificações status:', status);
    });

  return canal;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMENTÁRIOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca comentários raiz de uma entrada, com nickname do autor.
 * @param {string} entradaId
 * @returns {Promise<Array>}
 */
async function buscarComentariosPorEntrada(entradaId) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  const { data, error } = await supabaseClientInstance
    .from('comentarios')
    .select('*, autor:users(nickname)')
    .eq('entrada_id', entradaId)
    .is('parent_id', null)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

/**
 * Busca respostas diretas de um comentário, com nickname do autor.
 * @param {string} comentarioId
 * @returns {Promise<Array>}
 */
async function buscarRespostasPorComentario(comentarioId) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  const { data, error } = await supabaseClientInstance
    .from('comentarios')
    .select('*, autor:users(nickname)')
    .eq('parent_id', comentarioId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

/**
 * Cria um comentário ou resposta.
 * @param {string} entradaId
 * @param {string} nichoId
 * @param {string} conteudo
 * @param {string|null} parentId  - null para comentário raiz, id para resposta
 * @returns {Promise<Object>}
 */
async function criarComentario(entradaId, nichoId, conteudo, parentId = null) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  const { data: { user } } = await supabaseClientInstance.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');
  const { data, error } = await supabaseClientInstance
    .from('comentarios')
    .insert({
      entrada_id: entradaId,
      nicho_id:   nichoId,
      user_id:    user.id,
      parent_id:  parentId,
      conteudo:   conteudo.trim()
    })
    .select('*, autor:users(nickname)')
    .single();
  if (error) throw error;
  return data;
}

/**
 * Exclui um comentário (e suas respostas via CASCADE).
 * @param {string} comentarioId
 * @returns {Promise<void>}
 */
async function excluirComentario(comentarioId) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  const { error } = await supabaseClientInstance
    .from('comentarios')
    .delete()
    .eq('id', comentarioId);
  if (error) throw error;
}

/**
 * Inicia uma subscrição Realtime para comentários de uma entrada.
 * Filtra por entrada_id para receber apenas eventos desta entrada.
 * Requer REPLICA IDENTITY FULL na tabela para que payloads de DELETE
 * incluam parent_id e user_id além do PK.
 * @param {string} entradaId
 * @param {Function} onComentario - Chamado com o payload de cada evento
 * @returns {RealtimeChannel}
 */
function iniciarRealtimeComentarios(entradaId, onComentario) {
  if (!supabaseClientInstance) supabaseClientInstance = inicializarSupabase();
  if (!supabaseClientInstance) return null;

  const canal = supabaseClientInstance
    .channel(`comentarios-entrada-${entradaId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'comentarios', filter: `entrada_id=eq.${entradaId}` },
      (payload) => onComentario && onComentario(payload)
    )
    .subscribe((status) => {
      console.log('Realtime comentários status:', status);
    });

  return canal;
}

/**
 * Para e remove um canal Realtime.
 * @param {RealtimeChannel} canal
 */
function pararRealtime(canal) {
  if (canal && supabaseClientInstance) {
    supabaseClientInstance.removeChannel(canal);
  }
}

// Expõe funções globalmente
window.WikiSupabase = {
  inicializarSupabase,
  buscarCategorias,
  buscarCategoriaPorId,
  criarCategoria,
  atualizarCategoria,
  excluirCategoria,
  buscarEntradas,
  buscarEntradaPorId,
  buscarEntradasPorCategoria,
  criarEntrada,
  atualizarEntrada,
  excluirEntrada,
  buscarEntradasPorTermo,
  verificarUsuario,
  login,
  logout,
  migrarDadosDoJSON,
  
  // Funções de nichos
  buscarNichos,
  buscarNichoPorId,
  criarNicho,
  atualizarNicho,
  excluirNicho,
  validarAcessoNicho,
  
  // Funções de categorias por nicho
  buscarCategoriasPorNicho,
  criarCategoriaEmNicho,
  atualizarCategoriaEmNicho,
  excluirCategoriaDeNicho,
  
  // Funções de entradas por nicho
  buscarEntradasPorNicho,
  buscarEntradasPorTermoNoNicho,
  criarEntradaEmNicho,
  atualizarEntradaEmNicho,
  excluirEntradaDeNicho,
  
  // Funções de suporte
  obterEstatisticasNicho,
  carregarConteudoNicho,

  // Funções de compartilhamento
  buscarPerfisPorIds,
  verificarSeEhDono,
  // Funções de realtime
  iniciarRealtimeNicho,
  iniciarRealtimeNotificacoes,
  pararRealtime,
  buscarUsuariosPorNickname,
  enviarConvite,
  responderConvite,
  revogarMembroEForkar,
  buscarMembrosNicho,
  buscarNotificacoes,
  contarNotificacoesNaoLidas,
  marcarNotificacaoComoLida,
  marcarTodasNotificacoesComoLidas,

  // Funções de comentários
  buscarComentariosPorEntrada,
  buscarRespostasPorComentario,
  criarComentario,
  excluirComentario,
  iniciarRealtimeComentarios
};
