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
    
    const { data, error } = await supabaseClientInstance
      .from('nichos')
      .select('*')
      .eq('user_id', userId)
      .order('nome');
    
    if (error) {
      console.error('Erro Supabase ao buscar nichos:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      throw error;
    }
    
    console.log('Nichos carregados com sucesso:', data?.length || 0, 'itens');
    return data || [];
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
  if (!supabaseClientInstance) return false;
  
  try {
    // Primeiro excluir entradas e categorias do nicho (CASCADE cuida disso)
    const { error } = await supabaseClientInstance
      .from('nichos')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (erro) {
    console.error('Erro ao excluir nicho:', erro);
    return false;
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
    
    const { data, error } = await supabaseClientInstance
      .from('nichos')
      .select('id')
      .eq('id', nichoId)
      .eq('user_id', userId)
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
    console.log('🔍 Buscando categorias para nicho:', nichoId);
    const { data, error } = await supabaseClientInstance
      .from('categorias')
      .select('*')
      .eq('nicho_id', nichoId)
      .order('nome');
    
    if (error) {
      console.error('❌ Erro ao buscar categorias:', error);
      throw error;
    }
    console.log('✅ Categorias encontradas:', data?.length || 0, data);
    return data || [];
  } catch (erro) {
    console.error('❌ Erro ao buscar categorias do nicho:', erro);
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
    
    // Adicionar nicho_id ao objeto categoria
    const categoriaComNicho = {
      ...categoria,
      nicho_id: nichoId
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
    
    const { data, error } = await supabaseClientInstance
      .from('categorias')
      .update(dados)
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
    console.log('🔍 Buscando entradas para nicho:', nichoId);
    const { data, error } = await supabaseClientInstance
      .from('entradas')
      .select('*')
      .eq('nicho_id', nichoId)
      .order('titulo');
    
    if (error) {
      console.error('❌ Erro ao buscar entradas:', error);
      throw error;
    }
    console.log('✅ Entradas encontradas:', data?.length || 0, data);
    return data || [];
  } catch (erro) {
    console.error('❌ Erro ao buscar entradas do nicho:', erro);
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
    
    // Adicionar nicho_id ao objeto entrada
    const entradaComNicho = {
      ...entrada,
      nicho_id: nichoId
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
    
    const { data, error } = await supabaseClientInstance
      .from('entradas')
      .update(dados)
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
    console.log('📦 Carregando conteúdo do nicho:', nichoId);
    
    // Validar acesso ao nicho
    const temAcesso = await validarAcessoNicho(nichoId);
    console.log('🔐 Validação de acesso:', temAcesso);
    
    if (!temAcesso) {
      throw new Error('Acesso negado ao nicho');
    }
    
    // Buscar categorias e entradas em paralelo
    const [categorias, entradas] = await Promise.all([
      buscarCategoriasPorNicho(nichoId),
      buscarEntradasPorNicho(nichoId)
    ]);
    
    console.log('📊 Resultado final - Categorias:', categorias?.length || 0, 'Entradas:', entradas?.length || 0);
    return { categorias, entradas };
  } catch (erro) {
    console.error('❌ Erro ao carregar conteúdo do nicho:', erro);
    return { categorias: [], entradas: [] };
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
  carregarConteudoNicho
};
