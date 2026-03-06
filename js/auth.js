/**
 * Memora - Sistema de Autenticação
 * Gerencia login, registro e sessão de usuários
 */

// ============================================
// INICIALIZAÇÃO E CONFIGURAÇÃO
// ============================================

let supabaseAuth = null;

/**
 * Inicializa o cliente Supabase Auth
 */
function inicializarAuth() {
  if (typeof window.supabase === 'undefined') {
    console.error('Biblioteca do Supabase não carregada!');
    return null;
  }

  // Obter do supabase-client.js
  if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
    console.error('Configure suas credenciais do Supabase em js/supabase-client.js');
    return null;
  }

  supabaseAuth = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabaseAuth;
}

// ============================================
// VERIFICAÇÃO DE SESSÃO
// ============================================

/**
 * Obtém a sessão atual do usuário
 */
async function obterSessaoAtual() {
  if (!supabaseAuth) inicializarAuth();
  if (!supabaseAuth) return null;

  try {
    const { data: { session }, error } = await supabaseAuth.auth.getSession();
    return session;
  } catch (error) {
    console.error('Erro ao obter sessão:', error);
    return null;
  }
}

/**
 * Obtém o usuário atualmente autenticado
 */
async function obterUsuarioAtual() {
  if (!supabaseAuth) inicializarAuth();
  if (!supabaseAuth) return null;

  try {
    const { data: { user }, error } = await supabaseAuth.auth.getUser();
    return user;
  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    return null;
  }
}

/**
 * Verifica se o usuário está autenticado
 * Se não estiver e não estiver na página de login, redireciona
 */
async function verificarAutenticacao() {
  const usuarioAtual = await obterUsuarioAtual();
  const paginaAtual = window.location.pathname.split('/').pop();
  const paginasPublicas = ['login.html', 'password-reset.html', 'verify-email.html', ''];

  if (!usuarioAtual && !paginasPublicas.includes(paginaAtual)) {
    window.location.href = 'login.html';
    return null;
  }

  return usuarioAtual;
}

/**
 * Obtém os dados adicionais do usuário da tabela users
 */
async function obterDadosUsuario(userId) {
  if (!supabaseAuth) inicializarAuth();
  if (!supabaseAuth) return null;

  try {
    const { data, error } = await supabaseAuth
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Erro ao obter dados do usuário:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Erro ao obter dados do usuário:', error);
    return null;
  }
}

// ============================================
// AUTENTICAÇÃO - REGISTRO
// ============================================

/**
 * Cria uma nova conta de usuário
 */
async function criarConta(email, senha, nickname) {
  if (!supabaseAuth) inicializarAuth();
  if (!supabaseAuth) throw new Error('Supabase não inicializado');

  // Validações
  if (!email || !email.includes('@')) {
    throw new Error('Email inválido');
  }

  if (!senha || senha.length < 8) {
    throw new Error('Senha deve ter no mínimo 8 caracteres');
  }

  if (!nickname || nickname.length < 3 || nickname.length > 30) {
    throw new Error('Nickname deve ter entre 3 e 30 caracteres');
  }

  try {
    // 1. Criar usuário no Supabase Auth
    const { data: { user }, error: signupError } = await supabaseAuth.auth.signUp({
      email: email,
      password: senha,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email.html`
      }
    });

    if (signupError) {
      // Mensagens de erro mais amigáveis
      if (signupError.message.includes('User already registered')) {
        throw new Error('Este email já está registrado');
      }
      throw new Error(signupError.message);
    }

    if (!user) {
      throw new Error('Erro ao criar usuário');
    }

    // 2. Não é mais necessário criar manualmente o registro em `users`.
    //    um trigger no banco (on_auth_user_created) já faz isso automaticamente.
    //    Se desejar guardar o nickname ou outros campos, use um UPDATE
    //    separado após a confirmação de e‑mail ou no primeiro login.

    // Exemplo de atualização opcional (comentado):
    // await supabaseAuth
    //   .from('users')
    //   .update({ nickname })
    //   .eq('id', user.id);


    return {
      success: true,
      user: user,
      message: 'Conta criada com sucesso! Verifique seu email para ativar a conta.'
    };
  } catch (error) {
    throw new Error(error.message || 'Erro ao criar conta');
  }
}

// ============================================
// AUTENTICAÇÃO - LOGIN
// ============================================

/**
 * Faz login com email e senha
 */
async function fazerLogin(email, senha) {
  if (!supabaseAuth) inicializarAuth();
  if (!supabaseAuth) throw new Error('Supabase não inicializado');

  if (!email || !email.includes('@')) {
    throw new Error('Email inválido');
  }

  if (!senha) {
    throw new Error('Senha obrigatória');
  }

  try {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email: email,
      password: senha
    });

    if (error) {
      if (error.status === 400) {
        throw new Error('Email ou senha incorretos');
      }
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Erro ao fazer login');
    }

    return {
      success: true,
      user: data.user,
      session: data.session
    };
  } catch (error) {
    throw new Error(error.message || 'Erro ao fazer login');
  }
}

// ============================================
// AUTENTICAÇÃO - LOGOUT
// ============================================

/**
 * Faz logout do usuário atual
 */
async function fazerLogout() {
  if (!supabaseAuth) inicializarAuth();
  if (!supabaseAuth) throw new Error('Supabase não inicializado');

  try {
    const { error } = await supabaseAuth.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }

    // Limpar armazenamento local
    localStorage.removeItem('usuarioAtual');
    sessionStorage.removeItem('usuarioAtual');

    return {
      success: true,
      message: 'Desconectado com sucesso'
    };
  } catch (error) {
    throw new Error(error.message || 'Erro ao fazer logout');
  }
}

// ============================================
// AUTENTICAÇÃO - RESET DE SENHA
// ============================================

/**
 * Envia email de reset de senha
 */
async function enviarEmailResetSenha(email) {
  if (!supabaseAuth) inicializarAuth();
  if (!supabaseAuth) throw new Error('Supabase não inicializado');

  if (!email || !email.includes('@')) {
    throw new Error('Email inválido');
  }

  try {
    const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/password-reset.html?type=recovery`
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      message: 'Email de recuperação enviado. Verifique sua caixa de entrada.'
    };
  } catch (error) {
    throw new Error(error.message || 'Erro ao enviar email de reset');
  }
}

/**
 * Atualiza a senha do usuário
 */
async function atualizarSenha(novaSenha) {
  if (!supabaseAuth) inicializarAuth();
  if (!supabaseAuth) throw new Error('Supabase não inicializado');

  if (!novaSenha || novaSenha.length < 8) {
    throw new Error('Senha deve ter no mínimo 8 caracteres');
  }

  try {
    const { error } = await supabaseAuth.auth.updateUser({
      password: novaSenha
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      message: 'Senha atualizada com sucesso'
    };
  } catch (error) {
    throw new Error(error.message || 'Erro ao atualizar senha');
  }
}

// ============================================
// FUNÇÕES DE UTILIDADE - PÁGINA DE LOGIN
// ============================================

/**
 * Alterna entre abas de login e registro
 */
function alternarAba(nomeAba) {
  // Atualizar botões de aba
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelector(`[data-tab="${nomeAba}"]`).classList.add('active');

  // Atualizar formulários
  document.querySelectorAll('.auth-form').forEach(form => {
    form.classList.remove('active');
  });
  document.querySelector(`[data-form="${nomeAba}"]`).classList.add('active');

  // Limpar mensagens de erro
  document.querySelectorAll('.form-error').forEach(el => {
    el.textContent = '';
  });
  document.querySelectorAll('.form-message').forEach(el => {
    el.style.display = 'none';
  });
}

/**
 * Mostra/Oculta senha
 */
function alternarVisibilidadeSenha(inputId) {
  const input = document.getElementById(inputId);
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
}

/**
 * Calcula força da senha
 */
function calcularForcaSenha(senha) {
  let forca = 0;
  let texto = '';

  if (!senha) {
    return { forca: 0, texto: '' };
  }

  // Verifica comprimento
  if (senha.length >= 8) forca++;
  if (senha.length >= 12) forca++;
  if (senha.length >= 16) forca++;

  // Verifica tipos de caracteres
  if (/[a-z]/.test(senha)) forca++;
  if (/[A-Z]/.test(senha)) forca++;
  if (/[0-9]/.test(senha)) forca++;
  if (/[^a-zA-Z0-9]/.test(senha)) forca++;

  // Texto de feedback
  if (forca < 2) {
    texto = '❌ Fraca';
  } else if (forca < 4) {
    texto = '⚠️ Regular';
  } else if (forca < 6) {
    texto = '✅ Boa';
  } else {
    texto = '🔒 Muito Forte';
  }

  return {
    forca: Math.min(forca, 7),
    texto: texto
  };
}

/**
 * Mostra mensagem de erro no formulário
 */
function mostrarErro(elementId, mensagem) {
  const elemento = document.getElementById(elementId);
  if (elemento) {
    elemento.textContent = mensagem;
    elemento.style.display = 'block';
  }
}

/**
 * Limpa mensagem de erro
 */
function limparErro(elementId) {
  const elemento = document.getElementById(elementId);
  if (elemento) {
    elemento.textContent = '';
    elemento.style.display = 'none';
  }
}

/**
 * Mostra mensagem de sucesso
 */
function mostrarSucesso(elementId, mensagem) {
  const elemento = document.getElementById(elementId);
  if (elemento) {
    elemento.textContent = mensagem;
    elemento.style.display = 'block';
  }
}

/**
 * Define estado de carregamento de um botão
 */
function setBtnCarregando(btnId, carregando) {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  if (carregando) {
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent;
    btn.innerHTML = '<span class="spinner"></span> Carregando...';
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.originalText || 'Enviar';
  }
}

// ============================================
// EVENT LISTENERS - PÁGINA DE LOGIN
// ============================================

document.addEventListener('DOMContentLoaded', function () {
  // Inicializar Supabase
  inicializarAuth();

  // Verificar se já está autenticado (redirecionar para index.html)
  obterUsuarioAtual().then(user => {
    if (user) {
      window.location.href = 'index.html';
    }
  });

  // Abas de login/registro
  const loginTab = document.querySelector('[data-tab="login"]');
  const signupTab = document.querySelector('[data-tab="signup"]');

  if (loginTab) loginTab.addEventListener('click', () => alternarAba('login'));
  if (signupTab) signupTab.addEventListener('click', () => alternarAba('signup'));

  // Botões rápidos para alternar abas
  const switchToSignup = document.getElementById('switchToSignup');
  const switchToLogin = document.getElementById('switchToLogin');

  if (switchToSignup) switchToSignup.addEventListener('click', (e) => {
    e.preventDefault();
    alternarAba('signup');
  });

  if (switchToLogin) switchToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    alternarAba('login');
  });

  // Toggle de visualizar senha
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      const inputId = this.dataset.input;
      alternarVisibilidadeSenha(inputId);
    });
  });

  // Força de senha em tempo real
  const signupPassword = document.getElementById('signupPassword');
  if (signupPassword) {
    signupPassword.addEventListener('input', function () {
      const forca = calcularForcaSenha(this.value);
      const bar = document.getElementById('passwordStrengthBar');
      const text = document.getElementById('passwordStrengthText');

      if (bar) {
        bar.style.width = (forca.forca / 7 * 100) + '%';
        bar.className = 'password-strength-bar';

        if (forca.forca < 2) {
          bar.classList.add('weak');
        } else if (forca.forca < 4) {
          bar.classList.add('regular');
        } else if (forca.forca < 6) {
          bar.classList.add('good');
        } else {
          bar.classList.add('strong');
        }
      }

      if (text) {
        text.textContent = forca.texto;
      }
    });
  }

  // ========== FORMULÁRIO DE LOGIN ==========
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const email = document.getElementById('loginEmail').value;
      const senha = document.getElementById('loginPassword').value;
      const rememberMe = document.getElementById('rememberMe').checked;

      // Limpar erros anteriores
      document.querySelectorAll('[id$="LoginError"]').forEach(el => limparErro(el.id));

      setBtnCarregando('loginBtn', true);

      try {
        const resultado = await fazerLogin(email, senha);

        if (resultado.success) {
          mostrarSucesso('loginSuccess', 'Login realizado com sucesso! Redirecionando...');

          // Salvar dados do usuário se marcar "manter-me conectado"
          if (rememberMe) {
            localStorage.setItem('usuarioAtual', JSON.stringify({
              id: resultado.user.id,
              email: resultado.user.email
            }));
          }

          // Redirecionar após 1 segundo
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 1000);
        }
      } catch (error) {
        mostrarErro('loginError', '❌ ' + error.message);
        setBtnCarregando('loginBtn', false);
      }
    });
  }

  // ========== FORMULÁRIO DE REGISTRO ==========
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const nickname = document.getElementById('signupNickname').value;
      const email = document.getElementById('signupEmail').value;
      const senha = document.getElementById('signupPassword').value;
      const senhaConfirm = document.getElementById('signupPasswordConfirm').value;
      const agreeTerms = document.getElementById('agreeTerms').checked;

      // Limpar erros anteriores
      document.querySelectorAll('[id$="SignupError"]').forEach(el => limparErro(el.id));

      // Validações
      let temErro = false;

      if (nickname.length < 3 || nickname.length > 30) {
        mostrarErro('signupNicknameError', 'Nickname deve ter entre 3 e 30 caracteres');
        temErro = true;
      }

      if (!email.includes('@')) {
        mostrarErro('signupEmailError', 'Email inválido');
        temErro = true;
      }

      if (senha.length < 8) {
        mostrarErro('signupPasswordError', 'Senha deve ter no mínimo 8 caracteres');
        temErro = true;
      }

      if (senha !== senhaConfirm) {
        mostrarErro('signupPasswordConfirmError', 'As senhas não conferem');
        temErro = true;
      }

      if (!agreeTerms) {
        mostrarErro('agreeTermsError', 'Você deve concordar com os termos de serviço');
        temErro = true;
      }

      if (temErro) return;

      setBtnCarregando('signupBtn', true);

      try {
        const resultado = await criarConta(email, senha, nickname);

        if (resultado.success) {
          mostrarSucesso('signupSuccess', '✅ ' + resultado.message);

          // Limpar formulário
          signupForm.reset();
          document.getElementById('passwordStrengthBar').style.width = '0';
          document.getElementById('passwordStrengthText').textContent = '';

          // Redirecionar à página de verificação após 2 segundos
          setTimeout(() => {
            window.location.href = 'verify-email.html';
          }, 2000);
        }
      } catch (error) {
        mostrarErro('signupError', '❌ ' + error.message);
        setBtnCarregando('signupBtn', false);
      }
    });
  }

  // Validação em tempo real de email
  document.getElementById('loginEmail')?.addEventListener('blur', function () {
    if (this.value && !this.value.includes('@')) {
      mostrarErro('loginEmailError', 'Email inválido');
    } else {
      limparErro('loginEmailError');
    }
  });

  document.getElementById('signupEmail')?.addEventListener('blur', function () {
    if (this.value && !this.value.includes('@')) {
      mostrarErro('signupEmailError', 'Email inválido');
    } else {
      limparErro('signupEmailError');
    }
  });

  // Validação em tempo real de confirmação de senha
  document.getElementById('signupPasswordConfirm')?.addEventListener('input', function () {
    const senha = document.getElementById('signupPassword').value;
    if (this.value && this.value !== senha) {
      mostrarErro('signupPasswordConfirmError', 'As senhas não conferem');
    } else {
      limparErro('signupPasswordConfirmError');
    }
  });
});
