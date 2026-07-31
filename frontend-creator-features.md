# Workspace frontend do Creator

Este guia descreve como implementar, em uma SPA, as features de criação de
relatórios e dashboards. Os exemplos são TypeScript independente de framework.

Use a sessão de [frontend-authentication.md](frontend-authentication.md) e o
catálogo administrativo descrito em
[frontend-report-catalog.md](frontend-report-catalog.md).
Para seleção de relacionamentos, aliases e referências a campos associados, use
[frontend-report-joins.md](frontend-report-joins.md).

## Acesso e organização corrente

O papel efetivo usa a hierarquia:

```text
administrator > creator > viewer > unassigned
```

O `globalRole` vale em todas as organizações e a membership pode elevar o papel
na organização correspondente. `root` possui acesso irrestrito.

```ts
type OrganizationRole = "administrator" | "creator" | "viewer";

function canOpenCreatorWorkspace(
  me: MeResponse,
  organizationId: string,
): boolean {
  if (["root", "administrator", "creator"].includes(me.globalRole)) return true;

  const membership = me.organizations.find(item => item.id === organizationId);
  return membership?.organizationRole === "administrator"
    || membership?.organizationRole === "creator";
}
```

Use `me.organizations[n].profileIds` apenas no contexto daquela organização. No
JWT, essas associações aparecem como claims `organization_profile`. Depois de
uma alteração de profiles, renove o access token e recarregue `/me`.

## Tipos principais

```ts
type VisibilityScope = "private" | "organization" | "global";
type ResourceRole = "root" | "owner" | "administrator" | "creator" | "viewer";
type VerificationStatus = "pending" | "verified" | "failed" | "suspicious";

interface CreatorDataSourceOption {
  id: string;
  name: string;
  provider: string;
  readOnlyVerificationStatus: VerificationStatus;
}

interface SharingTargets {
  users: Array<{ id: string; name: string; email: string }>;
  profiles: Array<{ id: string; name: string }>;
}

interface DesignerField {
  id: string;
  name: string;
  type: string;
  nullable: boolean;
  selectable: boolean;
  filterable: boolean;
  sortable: boolean;
  groupable: boolean;
  aggregatable: boolean;
  allowedOperators: string[];
  allowedAggregations: string[];
}

interface DesignerSchema {
  id: string;
  dataSourceId: string;
  dataSourceName: string;
  name: string;
  type: string;
  fields: DesignerField[];
}

interface DesignerJoin {
  joinTemplateId: string;
  name: string;
  joinType: string;
  fromSchemaId: string;
  fromSchemaName: string;
  fromFieldId: string;
  toSchemaId: string;
  toSchemaName: string;
  toFieldId: string;
  suggestedAlias: string;
}

interface DesignerCatalog {
  schemas: DesignerSchema[];
  joins: DesignerJoin[];
}

interface PagedResult<T> {
  page: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
  data: T[];
}
```

## Descoberta segura

### Datasources do designer

```http
GET /api/v1/organizations/{organizationId}/report-designer/data-sources
```

Retorna somente datasources habilitados da organização e não inclui connection
strings, certificado, modo de credencial ou secrets.

```ts
async function getCreatorDataSources(
  organizationId: string,
): Promise<CreatorDataSourceOption[]> {
  const response = await apiFetch(
    `/api/v1/organizations/${organizationId}/report-designer/data-sources`,
  );
  if (!response.ok) throw await parseProblem(response);
  return response.json();
}
```

Permita abrir e salvar definições somente com datasource disponível. Para
preview ou execução, exija visualmente `readOnlyVerificationStatus ===
"verified"`; a API também bloqueia execução sem verificação.

### Alvos de compartilhamento

```http
GET /api/v1/organizations/{organizationId}/sharing-targets
```

Retorna apenas membros e profiles da organização. Use email para distinguir
nomes repetidos. Não use endpoints administrativos de membros ou profiles para
montar esse seletor.

## Catálogo efetivo do designer

Após escolher o datasource:

```http
GET /api/v1/organizations/{organizationId}/report-designer/catalog?dataSourceId={dataSourceId}
```

Codifique `dataSourceId` com `URLSearchParams`. O catálogo já considera:

- schemas e fields habilitados;
- denies da organização;
- grants dos profiles do creator naquela organização;
- capacidades de seleção, filtro, ordenação, agrupamento e agregação;
- joins aplicáveis e seguros.

Não exponha nomes internos de banco nem tente reconstruir itens ausentes. Um
controle só pode ser habilitado quando a capacidade correspondente vier `true`.

## Definição declarativa do relatório

O `content` usa `version: 1` e um `dataset`:

```ts
interface FieldReference {
  fieldId: string;
  joinAlias?: string;
}

interface SelectItem extends FieldReference {
  alias?: string;
  aggregation?: string;
}

interface JoinItem {
  joinTemplateId: string;
  alias: string;
}

interface WhereNode extends Partial<FieldReference> {
  operator: string;
  value?: unknown;
  conditions?: WhereNode[];
}

interface ReportContentV1 {
  version: 1;
  dataset: {
    schemaId: string;
    select: SelectItem[];
    joins?: JoinItem[];
    where?: WhereNode;
    groupBy?: FieldReference[];
    orderBy?: Array<FieldReference & {
      direction: "asc" | "desc";
      aggregation?: string;
    }>;
    limit?: number;
  };
}
```

Exemplo:

```json
{
  "version": 1,
  "dataset": {
    "schemaId": "00000000-0000-0000-0000-000000000000",
    "select": [
      {
        "fieldId": "00000000-0000-0000-0000-000000000001",
        "alias": "Cliente"
      },
      {
        "fieldId": "00000000-0000-0000-0000-000000000002",
        "aggregation": "sum",
        "alias": "Total"
      }
    ],
    "where": {
      "operator": "gte",
      "fieldId": "00000000-0000-0000-0000-000000000002",
      "value": 100
    },
    "groupBy": [
      { "fieldId": "00000000-0000-0000-0000-000000000001" }
    ],
    "orderBy": [
      {
        "fieldId": "00000000-0000-0000-0000-000000000002",
        "aggregation": "sum",
        "direction": "desc"
      }
    ],
    "limit": 500
  }
}
```

Regras relevantes:

- `select` exige ao menos um item;
- joins devem vir de `catalog.joins` e aliases devem ser únicos;
- fields não agregados precisam estar em `groupBy` quando houver agregação;
- operador/agregação devem estar nas listas do field;
- no máximo 5 níveis lógicos, 50 condições, 5 itens em `groupBy`, 5 em
  `orderBy` e `limit` máximo de 1000;
- a API valida novamente tudo; apresente erros por `code` junto ao controle
  correspondente.

Cada join liga diretamente o schema principal a outro schema. Inclua
`joinAlias` em toda referência a field associado e não tente encadear um novo
join a partir dele. O fluxo completo, inclusive remoção segura de dependências e
uso repetido do mesmo schema, está em
[frontend-report-joins.md](frontend-report-joins.md).

## Preview e execução

Faça preview antes de salvar:

```http
POST /api/v1/reports/preview
```

```ts
interface RuntimeFilter {
  fieldId: string;
  joinAlias?: string;
  operator: string;
  value?: unknown;
}

interface ExecuteRequest {
  filters: RuntimeFilter[];
  page: number;
  pageSize: number;
}

interface ExecuteResponse {
  columns: Array<{
    alias: string;
    type: string;
    fieldId: string | null;
    joinAlias: string | null;
  }>;
  rows: Array<Record<string, unknown>>;
  page: number;
  pageSize: number;
  rowCount: number;
  durationMs: number;
}
```

Payload de preview:

```json
{
  "organizationId": "00000000-0000-0000-0000-000000000000",
  "content": { "version": 1, "dataset": {} },
  "filters": [],
  "page": 1,
  "pageSize": 100
}
```

Preview não persiste. Para relatório salvo, use:

```http
POST /api/v1/reports/{reportId}/execute
```

Renderize colunas na ordem recebida, leia as células pelo `alias` e mostre
`durationMs`. Cancele visualmente requisições obsoletas e impeça execução
duplicada.

## CRUD de relatórios

| Operação | Endpoint | Sucesso |
|---|---|---:|
| Listar | `GET /api/v1/reports?page=1&pageSize=20` | `200 PagedResult<ReportListItem>` |
| Detalhar | `GET /api/v1/reports/{id}` | `200 ReportDetail` |
| Criar | `POST /api/v1/reports` | `201 ReportDetail` |
| Editar | `PATCH /api/v1/reports/{id}` | `200 ReportDetail` |
| Executar | `POST /api/v1/reports/{id}/execute` | `200 ExecuteResponse` |
| Excluir | `DELETE /api/v1/reports/{id}` | `204` |

```ts
interface ReportListItem {
  id: string;
  title: string;
  organizationId: string;
  organizationName: string;
  visibilityScope: VisibilityScope;
  myRole: ResourceRole;
  createdAt: string;
}

interface ReportDetail {
  id: string;
  title: string;
  organizationId: string;
  organizationName: string;
  visibilityScope: VisibilityScope;
  myRole: ResourceRole;
  content: ReportContentV1;
  allowedFilters: Array<{ field: string; type: string; options: string[] }>;
}

interface UpsertReportRequest {
  title: string;
  visibilityScope: VisibilityScope;
  organizationId?: string; // obrigatório apenas na criação
  content: ReportContentV1;
  availableFilters: Array<{ field: string; type: string; options: string[] }>;
}
```

Creator pode usar `private` ou `organization`; não ofereça `global`, reservado a
root. Use `myRole` para definir ações, mas trate `403` porque permissões podem
mudar. A API permite ao papel efetivo creator administrar os relatórios da
organização, não apenas aqueles com `myRole=owner`.

Atualize coleções com a resposta do servidor. Exija confirmação para exclusão e
remova apenas após `204`.

## Compartilhar relatório

```http
PATCH /api/v1/reports/{id}/share
```

```ts
interface FilterRestriction {
  field: string;
  type: string;
  values: string[];
}

interface UpdateReportShareRequest {
  visibilityScope: VisibilityScope;
  sharedWithUsers: Array<{
    userId: string;
    filterRestrictions: FilterRestriction[];
  }>;
  sharedWithProfiles: Array<{
    profileId: string;
    filterRestrictions: FilterRestriction[];
  }>;
}
```

As coleções são snapshots completos. Remova IDs duplicados, limite profiles aos
alvos da organização e envie arrays vazios para limpar compartilhamentos. As
restrições reduzem `availableFilters` para o destinatário; o creator mantém as
opções completas. Após salvar, invalide detalhe e listagem.

## CRUD de dashboards

| Operação | Endpoint | Sucesso |
|---|---|---:|
| Listar | `GET /api/v1/dashboards?page=1&pageSize=20` | `200 PagedResult<DashboardListItem>` |
| Detalhar | `GET /api/v1/dashboards/{id}` | `200 DashboardDetail` |
| Criar | `POST /api/v1/dashboards` | `201 DashboardDetail` |
| Editar | `PATCH /api/v1/dashboards/{id}` | `200 DashboardDetail` |
| Compartilhar | `PATCH /api/v1/dashboards/{id}/share` | `200 DashboardDetail` |
| Excluir | `DELETE /api/v1/dashboards/{id}` | `204` |

```ts
interface DashboardItemRequest {
  reportId: string;
  layout: Record<string, unknown>;
}

interface CreateDashboardRequest {
  title: string;
  visibilityScope: VisibilityScope;
  organizationId: string;
  items: DashboardItemRequest[];
}

interface UpdateDashboardRequest {
  title: string;
  visibilityScope: VisibilityScope;
  items: DashboardItemRequest[];
}

interface UpdateDashboardShareRequest {
  visibilityScope: VisibilityScope;
  sharedWithUsers: Array<{ userId: string }>;
  sharedWithProfiles: Array<{ profileId: string }>;
}
```

Use apenas relatórios acessíveis da mesma organização e não repita `reportId`.
`layout` é um JSON opaco para a API: versione sua estrutura no frontend se ela
evoluir. Um dashboard visível pode omitir itens cujos relatórios não sejam
acessíveis ao usuário; não trate a diferença entre `reportCount` e os itens
originais como corrupção.

Creator pode usar apenas `private` e `organization`. Compartilhamento também é
substitutivo. Aguarde `204` antes de remover um dashboard da coleção.

## Erros essenciais

Use `status` e `code` de `ProblemDetails`:

| Prefixo/código | Tratamento |
|---|---|
| `report_catalog.organization_membership_required` | Fechar designer e atualizar `/me` |
| `report_execution.data_source_not_verified` | Bloquear execução e pedir verificação ao administrador |
| `report_execution.preview_forbidden` | Fechar preview e atualizar permissões |
| `report_execution.runtime_filters_unavailable` | Recarregar detalhe e filtros permitidos |
| `report_execution.paging_invalid` | Corrigir página/tamanho |
| `report_definition.*` | Associar ao nó correspondente do designer |
| `reports.create_forbidden` / `reports.manage_forbidden` | Preservar sessão e fechar edição |
| `reports.global_visibility_forbidden` | Remover opção global |
| `reports.shared_profiles_not_found` | Recarregar sharing targets |
| `dashboards.report_unavailable` | Recarregar relatórios elegíveis |
| `dashboards.report_duplicate` | Remover item repetido |
| `dashboards.global_visibility_forbidden` | Remover opção global |
| `dashboards.shared_profile_not_found` | Recarregar sharing targets |

Em `401`, use o refresh central e repita no máximo uma vez. Em `403`, não faça
logout. Respostas `not_found_or_inaccessible` não devem revelar se o recurso
existe.

## Checklist

- Workspace aparece apenas para papel efetivo creator ou superior.
- Datasources do seletor não contêm dados administrativos ou secrets.
- Preview ocorre antes de salvar e nunca persiste.
- Controles respeitam capacidades do catálogo.
- Relatórios e dashboards de creator nunca enviam visibilidade global.
- Compartilhamentos usam apenas alvos da organização e snapshots sem duplicatas.
- Dashboard aceita apenas relatórios acessíveis da mesma organização.
- Resultados antigos são descartados quando organização/datasource muda.
- `401` renova sessão; `403` preserva sessão; exclusões aguardam `204`.
