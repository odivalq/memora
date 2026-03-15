# 📋 Guia: Correção da URL de Redirecionamento do Supabase Auth

## 🎯 **Problema**
O email de verificação do Supabase Auth está redirecionando para `localhost` em vez do seu domínio correto.

## 🔧 **Solução Passo-a-Passo**

### **Passo 1: Acessar o Painel do Supabase**

1. **Acesse o painel do Supabase**: https://app.supabase.com
2. **Selecione o seu projeto** (wuxceywvrrxpjcwqncpn)
3. **Clique em "Authentication"** no menu lateral esquerdo

### **Passo 2: Configurar URLs de Redirecionamento**

1. **No menu de Authentication, clique em "Settings"**
2. **Procure pela seção "Site URL"**
3. **Configure a URL do seu site** (ex: `https://seusite.com` ou `https://seusite.vercel.app`)

### **Passo 3: Configurar URLs de Redirecionamento de Login**

1. **Procure pela seção "Redirect URLs"**
2. **Adicione as URLs de redirecionamento** que o Supabase pode usar:
   ```
   https://seusite.com/verify-email.html
   https://seusite.com/login.html
   https://seusite.com/index.html
   https://seusite.com/dashboard.html
   ```

### **Passo 4: Configurar URLs de Redirecionamento de Reset de Senha**

1. **Procure pela seção "Recovery URLs"**
2. **Adicione as URLs para recuperação de senha**:
   ```
   https://seusite.com/password-reset.html
   ```

### **Passo 5: Configurar URLs de Redirecionamento de Signup**

1. **Procure pela seção "Signup URLs"**
2. **Adicione as URLs para redirecionamento após signup**:
   ```
   https://seusite.com/verify-email.html
   ```

### **Passo 6: Salvar as Configurações**

1. **Clique em "Save"** ou "Update" para salvar as configurações
2. **Aguarde alguns minutos** para que as alterações sejam aplicadas

## 🌐 **Configurações Recomendadas**

### **Site URL**
```
https://seusite.vercel.app
```
*(ou seu domínio real)*

### **Redirect URLs**
```
https://seusite.vercel.app/verify-email.html
https://seusite.vercel.app/login.html
https://seusite.vercel.app/index.html
https://seusite.vercel.app/dashboard.html
```

### **Recovery URLs**
```
https://seusite.vercel.app/password-reset.html
```

### **Signup URLs**
```
https://seusite.vercel.app/verify-email.html
```

## 🚨 **Importante**

1. **Use URLs completas** (com `https://`)
2. **Inclua todas as páginas** que podem receber redirecionamentos
3. **Teste as URLs** antes de salvar
4. **As alterações podem levar alguns minutos** para serem aplicadas

## 🔍 **Verificação**

Após configurar:

1. **Teste o registro de um novo usuário**
2. **Verifique o email de verificação**
3. **Confira se o link redireciona para o domínio correto**
4. **Teste o fluxo completo** (registro → verificação → login)

## 📝 **Observações**

- **Se estiver usando Vercel**, use a URL do Vercel
- **Se estiver usando outro provedor**, use a URL correspondente
- **Para desenvolvimento local**, você pode adicionar `http://localhost:3000` às URLs
- **O Supabase só permite redirecionar para URLs configuradas** nas settings

## 🎉 **Resultado Esperado**

Após seguir este guia:
- ✅ Os emails de verificação redirecionarão para o seu domínio correto
- ✅ O fluxo de registro e verificação funcionará corretamente
- ✅ Os usuários poderão completar o processo de verificação sem erros

---

**Precisa de ajuda com alguma etapa específica?** 🤔