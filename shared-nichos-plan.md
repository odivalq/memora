Feature Plan: Nicho Sharing & Collaboration
Stack recap: Vanilla JS frontend, Supabase (PostgreSQL + Auth + Realtime), no build process, static files on Vercel.

Phase 1 — Database Foundation
This is the most critical phase. Everything else depends on getting the schema right.

New tables:

nicho_membros — maps users to nichos they have access to (beyond the owner). Columns: nicho_id, user_id, role (e.g. editor), joined_at. This is the source of truth for who can see/edit a shared nicho.
convites — pending invitations. Columns: id, nicho_id, de_user_id (sender), para_user_id (recipient), status (pendente / aceito / recusado), created_at. Prevents duplicate invites, allows rejection.
notificacoes — in-app notifications. Columns: id, user_id (recipient), tipo (e.g. convite_nicho), payload (JSONB: nicho name, description, sender name, convite_id), lida (boolean), created_at.
Schema changes to existing tables:

nichos — add a dono_id alias approach: the user_id column stays as the original owner. No change needed here structurally — membership handles the rest.
users — add a UNIQUE constraint to nickname (required for the search feature to work reliably). Also confirm nickname is mandatory on registration.
RLS policy updates (the hardest part):

The current policies use nichos.user_id = auth.uid(). These need to be expanded with OR EXISTS (SELECT 1 FROM nicho_membros WHERE nicho_membros.nicho_id = nichos.id AND nicho_membros.user_id = auth.uid()) on nichos, categorias, and entradas. Write policies (INSERT/UPDATE/DELETE) on categorias and entradas should also allow members, not just owners.

Phase 2 — Backend Functions
All new functions go into supabase-client.js and are exposed on window.WikiSupabase.

User search:

buscarUsuariosPorNickname(termo) — queries the users table for nicknames matching ILIKE '%termo%', returns id + nickname. Used for the autocomplete dropdown. Should exclude the current user from results. Should exclude users already invited or already members.
Invite system:

enviarConvite(nichoId, paraUserId) — inserts a row in convites (status pendente) and a row in notificacoes for the recipient. Should check: the sender owns the nicho, no duplicate pending invite exists.
responderConvite(conviteId, aceitar: boolean) — updates convites.status, and if accepted: inserts into nicho_membros. Should validate the current user is the para_user_id of the invite.
buscarConvitesPendentes() — returns pending invites for the current user (for the notification/dashboard view).
Notifications:

buscarNotificacoes() — fetches unread notifications for current user, ordered by created_at DESC.
marcarNotificacaoComoLida(id) — sets lida = true.
marcarTodasComoLidas() — bulk update.
Shared nichos:

Update buscarNichos() to also return nichos where the user is in nicho_membros (not just owner). A UNION or a view would work here. Tag them visually as shared.
Phase 3 — Share UI on the Nicho Page
Changes to index.html and app-nicho.js.

Share button:

Add a "Compartilhar" button to the nicho header area (top of the nicho page, near the nicho title). Only visible to the owner of the nicho.
Share modal:

A new modal dialog with:
A text input: "Buscar usuário pelo nickname"
As the user types (debounced ~300ms), call buscarUsuariosPorNickname() and render a dropdown list of matching users below the input
Each dropdown item shows the nickname. Clicking one selects them and fills the input
A "Confirmar" button, disabled until a valid user is selected from the dropdown (not just typed manually — must be a confirmed existing user from the search results)
On confirm: calls enviarConvite(), shows a success toast, closes the modal
Member list (secondary):

Below the share button or inside the modal, show current members of the nicho with an option to remove them (owner only). This can be deferred to a later phase if needed.
Phase 4 — Notifications UI on Dashboard
Changes to dashboard.html and dashboard.js.

Notification bell:

Add a notification bell icon in the dashboard header (next to the user menu)
Badge showing count of unread notifications
On click: opens a notification panel/dropdown
Notification panel:

Lists recent notifications
For convite_nicho type: shows sender name, nicho name + description, and two buttons: "Aceitar" / "Recusar"
On accept: calls responderConvite(id, true), marks as read, refreshes the nichos grid to show the new shared nicho
On reject: calls responderConvite(id, false), marks as read
"Marcar todas como lidas" button
Dashboard nicho grid:

Shared nichos should be visually distinguished — a small "shared" badge or a different border/icon on the card
Hovering the badge could show "Shared by [owner nickname]"
Phase 5 — Real-time Collaboration
This is what makes the feature feel alive.

Supabase Realtime subscriptions:

In app-nicho.js: subscribe to changes on categorias and entradas filtered by nicho_id. When a collaborator inserts, updates, or deletes content, re-render the relevant part of the UI automatically.
In dashboard.js: subscribe to notificacoes for the current user. When a new row arrives, increment the bell badge and show a toast ("Fulano compartilhou um nicho com você!") without requiring a page refresh.
Conflict handling:

For now, last-write-wins (Supabase's default behavior). No locking needed at this stage.
Optionally: show a small "last edited by [nickname]" line on entries — this requires adding updated_by (UUID FK to users) on entradas and categorias.
Suggested implementation order

Phase 1 (DB)  →  Phase 2 (Functions)  →  Phase 3 (Share UI)
                                      →  Phase 4 (Notifications)
                                      →  Phase 5 (Realtime)
Phases 3 and 4 can be developed in parallel once Phase 2 is done. Phase 5 layers on top of everything.

Revised Plan — Key Changes
Phase 1 — Database Foundation (updated)
nicho_membros — same as before, but the role column becomes important groundwork:

role TEXT NOT NULL DEFAULT 'editor' — enforced now only as a value, not in RLS. When roles are implemented later, we add conditions against this column in policies without changing the table.
Add convidado_por UUID FK to auth.users — tracks who invited this member, needed for the revoke+fork flow.
Ownership transfer logic (new consideration):

When an owner deletes a nicho that has members, it is NOT a hard delete — it's an "owner leave." Ownership transfers to the member with the oldest joined_at in nicho_membros. The original owner is then removed from nicho_membros and no longer has access.
If there are no members, it's a normal hard delete.
A Supabase stored procedure (rpc() call) handles this atomically: transferir_ou_excluir_nicho(nicho_id). This avoids race conditions and keeps the client-side logic simple.
Revoke access + fork (new — the complex one):

When an owner removes a member, it triggers a "fork": a full copy of the nicho is created for the removed user (their own independent clone — new IDs, new user_id, completely separate from the original).
This also goes into a stored procedure: revogar_membro_e_forkar(nicho_id, user_id_a_remover). It will:
Copy the nicho row with user_id = removed_user_id
Copy all categorias rows with new IDs and the new nicho_id
Copy all entradas rows with new IDs, new nicho_id, and updated categoria_id references
Insert a notificacoes row for the removed user: "You lost access to [nicho], but a copy was saved to your dashboard."
Delete the nicho_membros row
users table disambiguation — since nicknames are not unique, the user search dropdown must show both nickname AND the first part of their email (e.g. johndoe · john***@gmail.com) so the sharer can tell users apart. No schema change needed — just show both fields in the UI.

updated_by UUID FK to auth.users — add to both categorias and entradas. Null-able, set on every update. Enables the "last edited by [nickname]" display in Phase 5.

Phase 2 — Backend Functions (updated)
buscarUsuariosPorNickname(termo) — returns id, nickname, and masked email (e.g. j***@gmail.com — mask everything before the @ except first char). This lets the UI show enough to distinguish same-nickname users without fully exposing emails.
transferirOuExcluirNicho(nichoId) — calls the stored procedure. Used by the existing "Excluir" button logic.
revogarMembroEForkar(nichoId, userId) — calls the stored procedure. Used by the remove-member UI.
Everything else as previously planned.
Phases 3, 4, 5 — Unchanged
The rest of the plan stands as written. The only addition to Phase 3 is:

The member list inside the share modal shows current members with a "Remover acesso" button (owner only), which calls revogarMembroEForkar and shows a confirmation warning: "This will remove their access and give them an independent copy of this nicho."
And to Phase 4:

The fork notification for the removed user: "[Owner] removed your access to [Nicho]. A copy has been saved to your dashboard." No accept/reject — just informational.
Final phased order

Phase 1: DB schema + stored procedures (foundation)
Phase 2: Backend functions in supabase-client.js
Phase 3: Share modal + member list on nicho page
Phase 4: Notification bell + panel on dashboard
Phase 5: Realtime subscriptions (live collaboration)

#question
One remaining question before I start: where should ownership-transfer happen UX-wise? Right now the "Excluir" button on the dashboard just deletes the nicho. When you click it on a shared nicho (as owner), should the UI:

A) Silently transfer ownership and remove the owner (they just disappear from the nicho), or
B) Show a warning: "You are the owner — deleting will transfer ownership to [next member]. Continue?"

Option B is safer and less surprising. Just confirming before I wire up that flow.

#answer
Lets go with Option B.

#Status
##Phase 1 implemented (check SETUP_COMPARTILHAMENTO.sql for reference of schemas and SQL policies implemented in Supabase now):
Phase 1 is done. Here's a summary of what SETUP-COMPARTILHAMENTO.sql does and why each piece was built the way it was:

New tables (3):

nicho_membros — the membership source of truth. Has a role TEXT DEFAULT 'editor' column that does nothing yet but is the groundwork for the future permissions system. convidado_por tracks invite history.
convites — stores the full invite lifecycle (pendente → aceito/recusado). A partial unique index (WHERE status = 'pendente') prevents duplicate pending invites while still preserving historical records of past invites.
notificacoes — uses a JSONB payload column so every notification type (convite_nicho, convite_aceito, acesso_revogado, ownership_recebida) can carry its own fields without needing separate columns or tables.
Schema additions:

categorias.updated_by and entradas.updated_by — nullable UUID FK, sets the groundwork for "last edited by" in Phase 5 realtime.
RLS updates:

users — added a SELECT policy for all authenticated users, required for nickname search.
nichos SELECT — expanded to include nicho_membros membership check.
categorias and entradas — all 4 CRUD policies replaced to allow both owners and members.
5 stored procedures (all SECURITY DEFINER):

buscar_usuarios_por_nickname — returns masked email (j***@gmail.com) for disambiguation between same-name users.
enviar_convite — atomic: creates the invite + the recipient's notification in one transaction.
responder_convite — on accept: inserts into nicho_membros and notifies the sender; on reject: just flips the status.
transferir_ou_excluir_nicho — the Option B flow: transfers to oldest member or hard-deletes if no members.
revogar_membro_e_forkar — the most complex one: full deep copy of nicho → categorias → entradas with remapped IDs, then notifies and removes the member.

##Phase 2 implemented
Phase 2 is done. Here's a summary of all changes made to supabase-client.js:

Existing functions updated:

buscarNichos() — removed the .eq('user_id', userId) filter (RLS now handles access). Tags each returned nicho with isOwner and isShared boolean fields for the dashboard UI to use.

validarAcessoNicho() — removed the .eq('user_id', userId) filter. The new RLS SELECT policy on nichos already restricts results to owned + shared nichos, so a simple .eq('id', nichoId) is sufficient.

excluirNicho() — now calls transferir_ou_excluir_nicho via .rpc() instead of a direct DELETE. Returns { sucesso, resultado } where resultado is 'deleted' or 'transferred'. The dashboard will use this to show the Option B warning in Phase 3.

criarCategoriaEmNicho() / criarEntradaEmNicho() — now explicitly set user_id on the inserted row. Previously this was missing, which would leave user_id null for content created by collaborators.

atualizarCategoriaEmNicho() / atualizarEntradaEmNicho() — now inject updated_by: userId into the update payload, populating the new column from Phase 1 for Phase 5's "last edited by" feature.

New functions (10):

Function	What it does
verificarSeEhDono(nichoId)	Checks owner status for UI decisions
buscarUsuariosPorNickname(termo)	Autocomplete search, calls buscar_usuarios_por_nickname RPC
enviarConvite(nichoId, paraUserId)	Calls enviar_convite RPC, re-throws for UI error display
responderConvite(conviteId, aceitar)	Calls responder_convite RPC
revogarMembroEForkar(nichoId, userId)	Calls revogar_membro_e_forkar RPC
buscarMembrosNicho(nichoId)	Two-query fetch (membros + user profiles), merged client-side
buscarNotificacoes(apenasNaoLidas?)	Fetches up to 50 notifications, newest first
contarNotificacoesNaoLidas()	HEAD count query for the bell badge
marcarNotificacaoComoLida(id)	Single notification mark-read
marcarTodasNotificacoesComoLidas()	Bulk mark-read (RLS scopes to current user automatically)

##Phase 2 implemented
Phase 3 is done. Here's a summary of every change made:

style.css — ~300 lines added at the end:

.nicho-banner — white bar between header and content, full-width, with flex layout for info + actions
.membro-avatar — stacked circle avatars with negative left margin for the overlap effect
.badge-compartilhado — small green pill shown next to nicho name for non-owner members
.modal-compartilhar — wider variant of the existing modal (560px)
.modal-header — flex row for title + close button
.compartilhar-dropdown — absolutely positioned autocomplete list below the input
.dropdown-item — each search result row with avatar + nickname + masked email
.usuario-selecionado — green-tinted chip shown after a user is picked from the dropdown
.membro-item — row in the current members list with optional Remover button
.toast-container + .toast — fixed bottom-right toast system with enter/exit animations
index.html — 3 blocks added:

#nichoBanner section between </header> and <main> — icon, name, description, member avatars, share button
#modalCompartilharOverlay modal before <script> tags — search input, selected user chip, members list, action buttons
#toastContainer div for toast notifications
app-nicho.js — several targeted changes:

estado — added ehDono, membros, usuarioSelecionado
atualizarHeader() — now populates the banner and calls carregarInfoCompartilhamento() async (non-blocking)
carregarInfoCompartilhamento() (new) — fetches ownership + members in parallel, shows/hides share button, adds shared badge for non-owners
renderizarMembrosPreview() (new) — renders stacked avatars with color rotation and "+N" overflow
configurarEventListeners() — added all modal event listeners including debounced search and click-outside-closes-dropdown
mostrarErro/mostrarSucesso — now delegate to mostrarToast() instead of alert()
8 new sharing functions: abrirModalCompartilhar, fecharModalCompartilhar, renderizarListaMembros, buscarUsuariosDropdown, selecionarUsuario, limparSelecao, confirmarCompartilhar, revogarMembro
mostrarToast(mensagem, tipo) — creates and auto-removes toast elements
escapeHtml(str) — safe HTML escaping for all user-supplied strings inserted via innerHTML