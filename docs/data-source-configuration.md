# Configure data sources

Open **Organizações → organização → Fontes de dados → Configurar fonte**. Include sources with no tables. The header retains organization/source identity.

1. **Conectar o banco:** create a connection in the selected organization. Test before saving; transient testing does not replace persisted read-only verification. Check status and use Validar somente leitura. Saving grants no access and exposes no tables by itself.
2. **Escolher tabelas:** Importar do banco discovers tables/views, selection, and preview. Import registers metadata, not source data. Keep individual results and retry only failures. Initial catalog templates require an empty catalog; existing catalogs can add tables via import. Manual creation belongs under Opções avançadas.
3. **Revisar os campos:** select a table and edit public names, enabled/sensitive states, operations, operators, aggregations. Search offers Aa/exact matching. Filtros groups filters; Selecionar shows bulk checkboxes. Mobile Opções da tabela → Trocar tabela opens tables. Pagination/bulk selection support large catalogs. Marcar resultados includes every filtered page; bulk actions include retained selections outside filters. Existing fields do not imply human review. Catalog settings limit what may be granted.
4. **Definir acesso:** choose/create a profile and edit grants with source preselected. Preserve other source grants; access is never automatic. Read failures block edits. Associate members with profiles. Final summary shows connection, read-only verification, tables, fields, permissions, and entry to report creation.

## Reusable models

Open **Mais opções → Modelos reutilizáveis** inside the source. Catalog templates are global independent table/field snapshots without credentials/permissions. Deletion does not remove copies. Saving requires registered fields. Application introspects and selects only compatible items; conflicts require fresh preview. Cancelling preserves the source connection.

**Modelos de junção** separates:

- Organization models: used by organization reports in any compatible source. Current source supports autofill/compatibility. Root can create/edit/duplicate/inspect dependencies/save global templates. Models in use allow name/suggested alias edits; structure/type/enabling/deletion are protected. Duplicate for alternatives.
- Global templates: shared independent snapshots applied with preview to create local models. Save a new template to change content. Deletion does not affect applied models. Conflicts require fresh preview.

Joins are advanced/optional and do not block initial setup. Models/templates grant no permissions. Global report import previews models to reuse/create automatically. This exception is available to authorized importers without manual management. Report/models save together and roll back together.

## Access, resuming, and compatibility

Only root creates connections/tables/fields/models. Administrators retain authorized source/profile/grant access. API authorization is authoritative; source ownership must match URL organization.

Route: /organizations/:organizationId/data-sources/:dataSourceId. step values connection/tables/fields/access, schemaId, profileId retain context and browser navigation. Credentials remain transient.

Legacy source/catalog/model links redirect when source/schema context exists; otherwise show organization/source selection. Navigation creates no second catalog. Join migration preserves old definitions as global templates without remapping reports; legacy joined reports require adjustment/recreation.

Execution requires enabled/read-verified sources plus catalog/permissions. Catalog preparation can precede verification.
