# Nicho Sharing & Collaboration — Implementation Log

This document covers all changes introduced across **Phases 1–3** of the collaborative nicho feature. It is intended as a reference for future development, debugging, and onboarding.

---

## Overview

The sharing system allows a nicho owner to invite other registered users to collaborate on a nicho. Both users can then read and write all content (categorias and entradas) inside that nicho in real time. The feature was designed with a future role/permissions system in mind, so the groundwork is in place without enforcing it yet.

**Key design decisions baked in:**
- Nicknames are not unique — the search always returns masked email alongside nickname so users can tell homonyms apart.
- All collaborators currently get `editor` role (full read/write). A `role` column exists for future expansion.
- When an owner "deletes" a shared nicho, ownership transfers to the oldest member instead of destroying the content.
- When an owner revokes a member's access, the member receives a full independent copy (fork) of the nicho — all categorias and entradas — so no data is lost.
- All multi-table operations run inside `SECURITY DEFINER` stored procedures to bypass RLS safely and ensure atomicity.

---

## Phase 1 — Database

**File:** `SETUP-COMPARTILHAMENTO.sql`

Run this file in the Supabase SQL Editor on top of the existing schema. It is idempotent.

### New Tables

#### `nicho_membros`
Tracks which users have been granted access to a nicho beyond the owner.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID generated |
| `nicho_id` | TEXT FK → `nichos.id` | CASCADE delete |
| `user_id` | UUID FK → `auth.users.id` | CASCADE delete |
| `role` | TEXT DEFAULT `'editor'` | Groundwork for future roles; not enforced in RLS yet |
| `convidado_por` | UUID FK → `auth.users.id` | Who sent the invite; SET NULL on delete |
| `joined_at` | TIMESTAMPTZ | Used to determine oldest member for ownership transfer |

Unique constraint: `(nicho_id, user_id)` — a user can only be a member once.

#### `convites`
Stores the full lifecycle of sharing invitations.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID generated |
| `nicho_id` | TEXT FK → `nichos.id` | CASCADE delete |
| `de_user_id` | UUID FK → `auth.users.id` | Sender (must be nicho owner) |
| `para_user_id` | UUID FK → `auth.users.id` | Recipient |
| `status` | TEXT DEFAULT `'pendente'` | Constrained to `pendente`, `aceito`, `recusado` |
| `created_at` | TIMESTAMPTZ | — |
| `updated_at` | TIMESTAMPTZ | Auto-updated via trigger |

A **partial unique index** (`WHERE status = 'pendente'`) prevents duplicate pending invites for the same `(nicho_id, para_user_id)` pair while allowing historical records.

#### `notificacoes`
In-app notifications for all system events (invite received, invite accepted, access revoked, ownership received).

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID generated |
| `user_id` | UUID FK → `auth.users.id` | Recipient; CASCADE delete |
| `tipo` | TEXT | `convite_nicho`, `convite_aceito`, `acesso_revogado`, `ownership_recebida` |
| `payload` | JSONB DEFAULT `{}` | Type-specific data (nicho name, sender nickname, etc.) |
| `lida` | BOOLEAN DEFAULT `false` | For the unread badge count |
| `created_at` | TIMESTAMPTZ | — |

JSONB payload structure by type:

| `tipo` | Payload fields |
|---|---|
| `convite_nicho` | `convite_id`, `nicho_id`, `nicho_nome`, `nicho_descricao`, `nicho_icone`, `de_user_id` |
| `convite_aceito` | `nicho_id`, `nicho_nome`, `de_user_id` (the accepter) |
| `acesso_revogado` | `nicho_nome`, `novo_nicho_id` (the fork), `de_user_id` (owner who revoked) |
| `ownership_recebida` | `nicho_id`, `nicho_nome` |

### Columns Added to Existing Tables

| Table | Column | Type | Purpose |
|---|---|---|---|
| `categorias` | `updated_by` | UUID FK → `auth.users.id` SET NULL | Tracks last editor; used by Phase 5 "last edited by" |
| `entradas` | `updated_by` | UUID FK → `auth.users.id` SET NULL | Same |

### RLS Policy Changes

#### `users` table
Added a `SELECT` policy for all authenticated users:
```sql
FOR SELECT USING (auth.role() = 'authenticated')
```
This allows the user search autocomplete to work. Email masking is handled at the application layer, not the database layer.

#### `nichos` table — SELECT policy updated
The existing `user_id = auth.uid()` policy was replaced to also allow members:
```sql
user_id = auth.uid()
OR EXISTS (SELECT 1 FROM nicho_membros WHERE nicho_membros.nicho_id = nichos.id AND nicho_membros.user_id = auth.uid())
```
UPDATE and DELETE remain owner-only.

#### `categorias` and `entradas` — all 4 CRUD policies replaced
The pattern for the access check on all four operations (SELECT, INSERT, UPDATE, DELETE):
```sql
EXISTS (
  SELECT 1 FROM nichos
  WHERE nichos.id = [table].nicho_id
  AND (
    nichos.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM nicho_membros
      WHERE nicho_membros.nicho_id = nichos.id
      AND nicho_membros.user_id = auth.uid()
    )
  )
)
```

#### New tables RLS
- `nicho_membros`: SELECT for own membership or own nicho's members. No INSERT/UPDATE/DELETE policies — all mutations go through SECURITY DEFINER procedures.
- `convites`: SELECT for sender or recipient only.
- `notificacoes`: SELECT, UPDATE, DELETE for `user_id = auth.uid()` only. No direct INSERT — all inserts go through SECURITY DEFINER procedures.

### Stored Procedures

All procedures are `SECURITY DEFINER SET search_path = public`, meaning they run with elevated privileges and bypass RLS. Each validates the caller's identity internally.

#### `buscar_usuarios_por_nickname(p_termo TEXT)`
Returns up to 10 users whose nickname matches `ILIKE '%termo%'`, excluding the caller. Returns `id`, `nickname`, and `email_masked` (format: `j***@gmail.com`).

#### `enviar_convite(p_nicho_id TEXT, p_para_user_id UUID) → TEXT`
Validates: caller owns the nicho, target is not the caller, target is not already a member, no pending invite exists. Creates a `convites` row and a `notificacoes` row for the recipient. Returns the new `convite_id`.

#### `responder_convite(p_convite_id TEXT, p_aceitar BOOLEAN)`
Validates: convite belongs to the caller and is still `pendente`. If accepted: updates status to `aceito`, inserts into `nicho_membros` (`ON CONFLICT DO NOTHING`), and notifies the original sender. If rejected: updates status to `recusado` only.

#### `transferir_ou_excluir_nicho(p_nicho_id TEXT) → TEXT`
Called by the owner's "delete" action instead of a direct DELETE. Validates ownership. If members exist: transfers `nichos.user_id` to the oldest member (by `joined_at`), removes that member from `nicho_membros`, notifies the new owner, returns `'transferred'`. If no members exist: deletes the nicho (CASCADE handles categorias and entradas), returns `'deleted'`.

#### `revogar_membro_e_forkar(p_nicho_id TEXT, p_user_id_remover UUID)`
Validates: caller owns the nicho, target is a member. Atomically:
1. Creates a new nicho for the removed user (same metadata, new `user_id`).
2. Copies all `categorias` with new IDs, recording an `old_id → new_id` map in a JSONB variable.
3. Copies all `entradas` with new IDs, remapping `categoria_id` via the map.
4. Inserts a `notificacoes` row (`tipo: 'acesso_revogado'`) for the removed user, including `novo_nicho_id` so they can navigate to their copy.
5. Deletes the `nicho_membros` row.

### Performance Indexes Added
```
idx_nicho_membros_user    nicho_membros(user_id)
idx_nicho_membros_nicho   nicho_membros(nicho_id)
idx_convites_para_user    convites(para_user_id)
idx_convites_de_user      convites(de_user_id)
idx_notificacoes_user     notificacoes(user_id)
idx_notificacoes_unread   notificacoes(user_id) WHERE lida = false  ← filtered index for badge count
idx_convites_pending_unique  convites(nicho_id, para_user_id) WHERE status = 'pendente'  ← unique constraint
```

---

## Phase 2 — Backend Functions

**File:** `js/supabase-client.js`

### Changes to Existing Functions

#### `buscarNichos()`
**Before:** filtered by `.eq('user_id', userId)`.  
**After:** no user_id filter — RLS returns all accessible nichos (owned + shared). Each returned object is annotated with `isOwner: boolean` and `isShared: boolean` so the dashboard UI can render badges without a second query.

#### `validarAcessoNicho(nichoId)`
**Before:** checked `user_id = userId` explicitly in the query.  
**After:** issues a plain `.eq('id', nichoId)` — RLS enforces access (owner or member). Returns `false` if RLS blocks the row.

#### `excluirNicho(id)`
**Before:** issued a direct `DELETE` — would fail silently for shared nichos or orphan members.  
**After:** calls `transferir_ou_excluir_nicho` via `.rpc()`. Return shape changed from `boolean` to `{ sucesso: boolean, resultado: 'deleted' | 'transferred', erro?: string }` so the calling UI can show the appropriate warning or confirmation.

#### `criarCategoriaEmNicho()` and `criarEntradaEmNicho()`
**Before:** did not set `user_id` on inserted rows, leaving it null for collaborator-created content.  
**After:** explicitly sets `user_id: userId` on every insert.

#### `atualizarCategoriaEmNicho()` and `atualizarEntradaEmNicho()`
**After:** merges `updated_by: userId` into the update payload, populating the new column for the Phase 5 "last edited by" feature.

### New Functions — Sharing

| Function | Description |
|---|---|
| `verificarSeEhDono(nichoId)` | Checks `nichos.user_id === currentUserId`. Used to decide which UI controls to show (share button, remove member button). |
| `buscarUsuariosPorNickname(termo)` | Calls `buscar_usuarios_por_nickname` RPC. Returns `[{ id, nickname, email_masked }]`. |
| `enviarConvite(nichoId, paraUserId)` | Calls `enviar_convite` RPC. Re-throws errors so the UI can display the specific message from the stored procedure (e.g. "Já existe um convite pendente"). |
| `responderConvite(conviteId, aceitar)` | Calls `responder_convite` RPC. |
| `revogarMembroEForkar(nichoId, userId)` | Calls `revogar_membro_e_forkar` RPC. |
| `buscarMembrosNicho(nichoId)` | Two-query pattern: fetches `nicho_membros`, then batch-fetches user profiles via `.in('id', userIds)`, merges client-side. Returns `[{ id, user_id, role, joined_at, nickname, email_masked }]`. |
| `buscarNotificacoes(apenasNaoLidas?)` | Fetches up to 50 notifications newest-first. Optional boolean filter. |
| `contarNotificacoesNaoLidas()` | HEAD count query (`select: '*', { count: 'exact', head: true }`). Used for the bell badge. |
| `marcarNotificacaoComoLida(id)` | Single UPDATE. |
| `marcarTodasNotificacoesComoLidas()` | Bulk UPDATE `.eq('lida', false)` — RLS scopes it to current user automatically. |

All new functions are exported on `window.WikiSupabase`.

---

## Phase 3 — Share UI on the Nicho Page

**Files:** `index.html`, `js/app-nicho.js`, `css/style.css`

### New UI Elements

#### Nicho Banner (`#nichoBanner`)
A full-width white bar inserted between the sticky header and `<main>`. Shows:
- Nicho icon (emoji) with tinted background matching the nicho's `cor`.
- Nicho name as `<h1>`.
- Nicho description as a subtitle.
- Stacked member avatar circles (up to 3, then "+N" overflow). Each circle shows the member's first initial, colored from a rotating palette.
- "Compartilhar" button — visible **only to the owner**, hidden via `style.display` after `verificarSeEhDono()` resolves.
- "Compartilhado" badge — injected next to the nicho name **only for non-owner members**, so collaborators always know they're in a shared space.

The banner is populated synchronously (nicho metadata) and then `carregarInfoCompartilhamento()` runs async without blocking the render of categories.

#### Share Modal (`#modalCompartilharOverlay`)
Standard `modal-overlay.ativo` pattern, wider variant (560px). Contains:

1. **Search field** — text input with a debounced (300ms) listener. Requires at least 2 characters to trigger the API call. While loading shows "Buscando..." in the dropdown.

2. **Autocomplete dropdown** — absolutely positioned below the input. Each result shows a letter avatar, nickname, and masked email. Closes on outside click or when a result is selected. Clicking a result calls `selecionarUsuario()`.

3. **Selected user chip** — a green-tinted pill shown after a user is picked. Displays their nickname and masked email. Has an × button to clear the selection and re-enable search. The "Enviar convite" button remains disabled until this chip is populated.

4. **Current members list** — rendered below a divider. Owner sees a "Remover" (danger) button next to each member. Non-owners see the list read-only. Calls `revogarMembro()` on click, which shows a native `confirm()` dialog before proceeding (because this is a destructive action: the member loses live access).

5. **Action row** — "Cancelar" + "Enviar convite" (disabled until user selected).

#### Toast System (`#toastContainer`)
Fixed to the bottom-right corner. Each call to `mostrarToast(mensagem, tipo)` creates a `<div class="toast toast-{tipo}">` element, appends it to the container, and removes it after 4 seconds (with a slide-out animation). Types: `sucesso` (green), `erro` (red), `info` (blue). `mostrarErro()` and `mostrarSucesso()` now delegate here instead of using `alert()`.

### State Additions (`estado` object)

| Field | Type | Purpose |
|---|---|---|
| `ehDono` | boolean | Set after `verificarSeEhDono()` resolves; controls share button visibility and member list Remover buttons |
| `membros` | array | Current members of the nicho; kept in sync after revoke operations |
| `usuarioSelecionado` | object \| null | `{ id, nickname, email_masked }` of the user picked from the dropdown; null = confirm button disabled |

### New Functions in `app-nicho.js`

| Function | Description |
|---|---|
| `carregarInfoCompartilhamento()` | Async; fetches ownership + members in parallel; updates banner badge, share button, and member avatars |
| `renderizarMembrosPreview(membros)` | Renders stacked avatar circles in the banner |
| `abrirModalCompartilhar()` | Populates modal title with nicho name, renders member list, opens overlay |
| `fecharModalCompartilhar()` | Closes overlay, clears all transient state |
| `renderizarListaMembros(membros)` | Renders member rows with optional Remover buttons; uses `escapeHtml()` throughout |
| `buscarUsuariosDropdown(termo)` | Calls `buscarUsuariosPorNickname`, renders dropdown results |
| `selecionarUsuario(user)` | Sets `estado.usuarioSelecionado`, renders chip, enables confirm button |
| `limparSelecao()` | Clears `estado.usuarioSelecionado`, hides chip, disables confirm button |
| `confirmarCompartilhar()` | Calls `enviarConvite`, shows success toast, closes modal; shows procedure-specific error message on failure |
| `revogarMembro(userId, nickname)` | Confirms via native dialog, calls `revogarMembroEForkar`, reloads member list and banner avatars |
| `mostrarToast(mensagem, tipo)` | Creates and auto-removes toast DOM element |
| `escapeHtml(str)` | Sanitizes user content before inserting into `innerHTML` |

---

## Data Flow Summary

### Sharing a nicho (happy path)
```
Owner opens nicho page
  → carregarInfoCompartilhamento() confirms ehDono = true → "Compartilhar" button shown
  → Owner clicks "Compartilhar" → modal opens
  → Owner types nickname → buscarUsuariosDropdown() → buscar_usuarios_por_nickname RPC
  → Dropdown shows matching users with masked email
  → Owner clicks a user → chip shown, confirm enabled
  → Owner clicks "Enviar convite"
    → enviar_convite RPC (server-side):
        INSERT convites (status: 'pendente')
        INSERT notificacoes for recipient (tipo: 'convite_nicho')
  → Toast: "Convite enviado para [nickname]"
  → Modal closes
```

### Accepting an invite (Phase 4 UI — backend already ready)
```
Recipient sees notification (Phase 4 bell)
  → clicks "Aceitar"
    → responder_convite RPC (p_aceitar: true):
        UPDATE convites SET status = 'aceito'
        INSERT nicho_membros (role: 'editor')
        INSERT notificacoes for sender (tipo: 'convite_aceito')
  → Nicho now appears in recipient's dashboard (buscarNichos() RLS includes it)
```

### Revoking access
```
Owner opens modal → clicks "Remover" next to a member → confirm dialog
  → revogar_membro_e_forkar RPC (server-side):
        INSERT nichos (fork, user_id = removed user)
        INSERT categorias × N (new IDs, mapped)
        INSERT entradas × N (new IDs, remapped categoria_id)
        INSERT notificacoes for removed user (tipo: 'acesso_revogado', novo_nicho_id in payload)
        DELETE nicho_membros
  → Toast: "[nickname] foi removido. Uma cópia do nicho foi enviada a ele."
  → Modal member list + banner avatars refresh
```

### Owner "deleting" a shared nicho (Phase 4 UI — backend ready)
```
Owner clicks "Excluir" on dashboard → dashboard checks excluirNicho() returns 'transferred'
  → shows warning: "Você é o dono — isso irá transferir a posse para [next member]. Continuar?"
  → If confirmed:
      → transferir_ou_excluir_nicho RPC:
            UPDATE nichos SET user_id = oldest_member.user_id
            DELETE nicho_membros for new owner
            INSERT notificacoes (tipo: 'ownership_recebida')
      → resultado: 'transferred' → nicho disappears from original owner's dashboard
```

---

## Pending Phases

| Phase | What it covers |
|---|---|
| **Phase 4** | Notification bell in dashboard header; notification panel with accept/reject for `convite_nicho`; ownership-transfer warning in the "Excluir" flow on dashboard |
| **Phase 5** | Supabase Realtime subscriptions on `categorias` and `entradas` filtered by `nicho_id`; live re-render when collaborators make changes; "last edited by [nickname]" on entries using the `updated_by` column |

---

## Files Changed

| File | Change type |
|---|---|
| `SETUP-COMPARTILHAMENTO.sql` | New — run once in Supabase SQL Editor |
| `js/supabase-client.js` | Modified — 7 existing functions updated, 10 new functions added, exports updated |
| `index.html` | Modified — nicho banner section, share modal, toast container added |
| `js/app-nicho.js` | Modified — `estado` extended, `atualizarHeader` rewritten, `configurarEventListeners` extended, 12 new functions added |
| `css/style.css` | Modified — ~300 lines appended (nicho banner, share modal, autocomplete dropdown, member list, toast system) |
