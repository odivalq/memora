# CLAUDE.md — Memora

## Estrutura resumida

- `js/supabase-client.js` — toda a camada de dados (Supabase). Funções: `criarEntradaEmNicho`, `criarCategoriaEmNicho`, `buscarEntradas`, etc.
- `js/editor-nicho.js` — lógica do formulário de criação/edição de entradas
- `js/app-nicho.js` — lógica da página principal (listagem, filtros, navegação)
- `editar.html` — formulário de entrada
- `dashboard.html` — página do nicho (workspace)
- `SETUP-SUPABASE.sql` / `SETUP-NICHOS-SUPABASE.sql` — schema do banco

## Instruções para a IA

- **Não leia o codebase inteiro.** Use `grep` ou `find` para localizar o símbolo/função relevante e leia apenas esse arquivo.
- Antes de qualquer tarefa, identifique quais dos arquivos acima são afetados e leia somente eles.
- Para mudanças de UI: leia `editar.html` ou `dashboard.html` + o JS correspondente.
- Para mudanças de dados: leia `js/supabase-client.js` e o arquivo de schema SQL relevante.
- Leitura ampla do codebase só é justificada em refatorações globais ou bugs de integração entre múltiplos módulos.
