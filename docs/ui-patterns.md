# Interface and behavior standards

Central reference for all new Report Builder screens and interface changes, consolidating approved organization/data-source patterns. Apply to modified parts of existing screens; a full screen review is not required for every task.

## Language and presentation

- Technical content uses English: identifiers, comments, logs, test descriptions, API/MCP diagnostics, documentation, and instructions.
- User presentation uses Brazilian Portuguese: labels, actions, loading/empty/error/success states, accessibility, dates, local validation, notifications, and backend login/consent pages. Browser language does not change this default.
- Use the shared presentation catalog for known API error/diagnostic codes. Unknown/missing codes use contextual Portuguese messages. Never render raw English technical title/detail/errors, execution warning messages, compatibility reasons, or export errors as UI fallbacks.
- Keep raw response objects available for diagnosis; translate at the presentation boundary. Preserve user data, public contract names, routes, codes, enums, IDs, physical names, and report content. This does not introduce a language selector or a full multilingual framework.

## Layout and hierarchy

Reuse existing components/classes/styles before adding implementations. Keep spacing, alignment, and page/section/item heading hierarchy consistent.

Administration uses centered max-width 1440 px, horizontal padding 24 px desktop/16 px mobile, current breakpoint 720 px. Reserve top navigation space and preserve containers in loading/error/empty states.

Administrative modals use 24 px desktop/16 px mobile padding, constrained viewport height, and internal scrolling. Long forms keep actions in a sticky/fixed footer without obscuring content/focus. Designer and runner retain their own workflow structures while following clarity/consistency principles.

## Context and navigation

Show organization/source/table context through headers, breadcrumbs, and nearby item identification. Fields stay visibly associated with tables. Reuse selected context instead of repeated forms/selections.

Store IDs/steps needed for direct access, resume, back/forward in the URL. Check resource ownership against URL context. Credentials remain transient form state. Explain the step's purpose, what saves, and its effect on data access/report use. Derive status from persisted data; existing fields do not prove human review.

## Actions, forms, and confirmation

Emphasize the main action; group secondary/less frequent actions in clearly named menus. Avoid equally prominent competing buttons; keep mobile controls legible.

Destructive actions use ConfirmDeleteModal with item name, consequences, Cancelar, and Confirmar Exclusão. Do not use window.confirm/window.alert. Explain when only configuration is removed and source data remains.

Block duplicate operations in addition to disabling buttons. Show progress and block incompatible actions until completion. Preserve useful form values after failure, show errors in the relevant form/modal, and permit correction/retry. Cancellation must be predictable; explain when earlier steps remain saved.

Where supported, test connections before saving. Distinguish transient tests from persisted read-only verification needed for execution.

## Loading, errors, and completion

Use ContentSkeleton for initial structured lists/tables/cards while retaining headers/navigation. Hide placeholders from screen readers and announce one contextual progress message. Use NeutralLoader for unpredictable queries, verification, and initial execution, with a soft panel and required operation message. For same-query updates, retain data and use compact NeutralLoader with “Atualizando…”, aria-busy, and incompatible-action blocking. Clear prior context when switching organization/source/report. Queries say “Consultando [dados]…”; operations describe their real action. Buttons retain a spinner and short label. Respect reduced motion; avoid percentages, estimates, and artificial delays.

Make loading evident and specific: prefer “Consultando conexão, tabelas, campos e permissões desta fonte…” over generic “Carregando…”. Use prominent titles when loading occupies a page/modal.

Handle loading/empty/failure/denied/retry states with context/containers intact. Do not enable writes depending on failed reads.

After saving, update the affected catalog/summary and navigate to the correct next step. Use destination persisted IDs rather than snapshot IDs. Close modals on navigation and show clear confirmation. After template application/manual table creation, open Revisar os campos for the created table. After import, review a successfully imported table rather than retaining prior selection.

Preserve individual partial-failure results and retry only failures; do not hide them by automatically advancing. Invalidate previews when compatibility inputs change; application conflicts require fresh previews.

## Long lists, search, and selection

Group fields by table and keep public/physical identification accessible. Provide search/filter/pagination for large catalogs.

Every textual search provides accessible “Limpar busca” through ClearSearchButton inside the right side of the search box with sufficient input padding. Aa/exact-match controls remain outside the input. Clearing removes text only, retains options/filters, resets dependent pagination, and restores input focus. Do not rely on native browser clear controls.

Offer case-sensitive Aa and exact matching with SearchMatchOptions/matchesTextSearch. Exact does not mean regex.

Bulk selection offers select/deselect all with explicit scope (page, filtered results, entire list) and explains retained selections outside current results/pages. Avoid ambiguous labels. Field settings show requested selection controls and grouped filters/secondary actions. Disable incompatible items with explanations; disallow empty field selections/schemas.

## Permissions, responsiveness, and accessibility

Preserve permissions and settings outside the edited context. Source grant edits must not erase other source grants. Never grant access automatically.

The API is the authorization authority, including direct URL access. Distinguish configured catalog, verified connection, and granted access. Test desktop/mobile with long names and many tables/fields. No page-level horizontal scrolling; data regions may scroll accessibly.

Use accessible control names, form labels, dialog identification, role=status for progress, role=alert for errors, keyboard access, visible focus, and modal/menu focus management.

## Verification and maintenance

Before concluding interface changes, verify:

- Correct organization/source/table/step context, URLs, direct access, back/forward.
- Consistent padding/alignment/headings/primary actions/menus.
- Specific visible loading plus empty/error/denied/retry states.
- Predictable cancellation, duplicate prevention, refreshed data, closed modal, correct success destination.
- Search/filter/selection scope clarity and accessible long-form actions.
- Organization isolation and preserved out-of-context settings.
- Mobile without horizontal page overflow; readable controls, keyboard, focus.
- Portuguese presentation for known/unknown errors, validation, diagnostics, warnings, notifications, and exports.

Run build/lint/relevant behavior tests proportional to code changes. Layout/flow changes require desktop/mobile browser checks with extensive content. Behavior tests cover navigation/errors/cancellation/conflicts/permissions; do not merely mirror styles/implementation. Documentation-only changes require link/consistency checks, not application builds.

Record explicitly approved standards here. Organization specifics live in [the administration guide](organization-layout.md); source flow in [source configuration](data-source-configuration.md). Legacy inconsistencies are not new standards. Report verification/limitations. Commit/push/publish require user instructions and are not automatically authorized by this guide.

## Implementation references

ContentSkeleton, NeutralLoader, and Alert centralize structural loading, operation messages, and accessible progress/errors. Always name the actual operation. ConfirmDeleteModal centralizes deletion/revocation confirmation, duplicate blocking, modal errors, and keyboard behavior. useModalFocus maintains/restores focus.

SourceActionMenu groups secondary actions. OrganizationContextHeader retains organization identity. Creator tabs persist in URL. admin-page applies administrative width/padding; admin-form-dialog keeps long form headers/actions accessible. Designer/runner keep their containers.

## Join scope and import

Distinguish organization models/global templates in the source library. Sources provide compatibility/autofill references without restricting reuse. Templates are independent snapshots; source/template deletion does not affect copies.

Root alone manually manages models/templates. Authorized global import may create models for creators/administrators without grants or management. Preview shows reused/created models; server saves report/models transactionally.

Models in use show dependencies and structural/type/enabled/delete restrictions; name/suggested alias may change. Offer Duplicar modelo for an independent alternative. Confirmation/errors stay in modals; application conflicts invalidate previews.

## Rolling sales period

“Últimos 12 meses (mês atual parcial)” includes the current month and previous eleven. API recalculates bounds in organization timezone per execution/preview. This label makes the partial month explicit.

## Report tags and descriptions

Reports support multiple organization tags for organization, without access grants. Root/administrators manage names/deletion; editors associate existing tags. Confirm tag deletion and retain reports.

Home/organization lists show short title, summarized description, and tags. Search/filters persist in URL and apply server-side before pagination. Multiple tags mean any tag; Sem etiquetas takes priority but retains selected tags for later. Description is optional plain text up to 2000 characters, fully shown during execution. Locked automatic parameters remain hidden. Global import copies descriptions and accepts local tags, without automatically copying/creating source tags.

Tag selection uses a multi-select with removable chips inside the field and dropdown checkbox options. Search stays in the field; support individual removal/clear, selected options outside results, and keyboard toggles. Escape closes the list without closing the modal; outside clicks close it. Apply padding below tabs/dashboard panels.

Home tag options/chips identify companies as Etiqueta · Empresa and search both. Creator/edit/import screens with fixed organization show tag names only. IDs remain identity across companies. If older APIs omit company names, resolve through accessible reports filtered by organization, one query per company. Never show UUID as a name; unavailable organizations display “Empresa indisponível”.

In creator lists, Abrir is the visible primary action; Editar relatório/Excluir relatório live in Opções. Reuse SourceActionMenu/ConfirmDeleteModal, name the report, explain share impact, and preserve source data. On deletion update list/count and go back a page if its last row disappears, retaining URL filters. Errors remain in the modal.

## Exports and notifications

Anyone permitted to execute a report may export its data, including shared reports; no separate export permission or ownership requirement applies. Recheck current execution access at request, processing, and download, preserving row restrictions. Root may execute/export global originals; other users import a local copy first.

For saved reports with data, Exportar dados offers Excel/CSV for all rows. Explain that it queries again using parameters from the last execution, while automatic periods resolve server-side at request time and freeze during queueing. Changed parameters require execution before requesting export. Confirm queue admission without blocking the screen during generation.

The navigation bell combines persisted notices/files with unread count and Portuguese statuses Na fila, Gerando, Disponível, Falhou, Expirada. Downloads are explicit, files last 24 hours, and new requests require report access. Never start downloads automatically.

Refresh every fifteen seconds while authenticated/visible and on tab return. Retain data on update failure, allow retries, and clear context on user changes. Support desktop/mobile, Escape closing, contained focus, and restoring focus to the bell. Persisted notification messages are Portuguese presentation; raw export errors use localized fallbacks, including historical records.

Unread export notices use a subtle tinted background, a thin accent edge, and a small dot with the Portuguese label Não lida. Derive the highlight from persisted readAt and remove it after confirmed reading; opening the panel alone does not mark notices read.
