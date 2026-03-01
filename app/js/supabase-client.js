/**
 * WikiLocal + Supabase - Cliente de Banco de Dados
 * Configuração e funções para comunicação com Supabase
 */

// ============================================
// CONFIGURAÇÃO DO SUPABASE
// ============================================

// SUBSTITUA ESTES VALORES COM OS SEUS DO SUPABASE
const SUPABASE_URL = 'https://wuxceywvrrxpjcwqncpn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_89C9xeXVNWVBdKjr7qT2Tw_yJlKZBOX';

// Inicializa o cliente Supabase
let supabase = null;

function inicializarSupabase() {
  if (typeof supabaseClient === 'undefined') {
    console.error('Biblioteca do Supabase não carregada!');
    return null;
  }
  
  // Verifica se as credenciais foram configuradas
  if (SUPABASE_URL.includes('SEU-PROJETO') || SUPABASE_ANON_KEY.includes('sua-chave')) {
    console.warn('⚠️ Configure suas credenciais do Supabase no arquivo js/supabase-client.js');
    return null;
  }
  
  supabase = supabaseClient.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabase;
}

// ============================================
// FUNÇÕES DE CATEGORIAS
// ============================================

/**
 * Busca todas as categorias do Supabase
 */
async function buscarCategorias() {
  if (!supabase) supabase = inicializarSupabase();
  if (!supabase) return [];
  
  try {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .order('nome');
    
    if (error) throw error;
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
  if (!supabase) supabase = inicializarSupabase();
  if (!supabase) return null;
  
  try {
    const { data, error } = await supabase
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
  if (!supabase) supabase = inicializarSupabase();
  if (!supabase) return null;
  
  try {
    const { data, error } = await supabase
      .from('categorias')
      .insert([categoria])
      .select()
      .single();
    
    if (error) throw error;
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
  if (!supabase) supabase = inicializarSupabase();
  if (!supabase) return null;
  
  try {
    const { data, error } = await supabase
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
  if (!supabase) supabase = inicializarSupabase();
  if (!supabase) return false;
  
  try {
    const { error } = await supabase
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
  if (!supabase) supabase = inicializarSupabase();
  if (!supabase) return [];
  
  try {
    const { data, error } = await supabase
      .from('entradas')
      .select('*')
      .order('titulo');
    
    if (error) throw error;
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
  if (!supabase) supabase = inicializarSupabase();
  if (!supabase) return null;
  
  try {
    const { data, error } = await supabase
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
  if (!supabase) supabase = inicializarSupabase();
  if (!supabase) return [];
  
  try {
    const { data, error } = await supabase
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
  if (!supabase) supabase = inicializarSupabase();
  if (!supabase) return null;
  
  try {
    const { data, error } = await supabase
      .from('entradas')
      .insert([entrada])
      .select()
      .single();
    
    if (error) throw error;
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
  if (!supabase) supabase = inicializarSupabase();
  if (!supabase) return null;
  
  try {
    const { data, error } = await supabase
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
  if (!supabase) supabase = inicializarSupabase();
  if (!supabase) return false;
  
  try {
    const { error } = await supabase
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
  if (!supabase) supabase = inicializarSupabase();
  if (!supabase) return [];
  
  try {
    const { data, error } = await supabase
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
  if (!supabase) supabase = inicializarSupabase();
  if (!supabase) return null;
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
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
  if (!supabase) supabase = inicializarSupabase();
  if (!supabase) return null;
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
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
  if (!supabase) supabase = inicializarSupabase();
  if (!supabase) return false;
  
  try {
    const { error } = await supabase.auth.signOut();
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
  if (!supabase) supabase = inicializarSupabase();
  if (!supabase) return false;
  
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
      const { error: errCat } = await supabase
        .from('categorias')
        .upsert(categorias, { onConflict: 'id' });
      if (errCat) throw errCat;
    }
    
    if (entradas.length > 0) {
      const { error: errEnt } = await supabase
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
  migrarDadosDoJSON
};
