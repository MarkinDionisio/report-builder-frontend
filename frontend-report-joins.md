# Joins entre tabelas no frontend

Este guia descreve como uma SPA administra templates de join e como o designer
de relatórios usa esses relacionamentos. Os exemplos usam TypeScript independente
de framework.

Use o cliente autenticado de
[frontend-authentication.md](frontend-authentication.md), o catálogo
administrativo de [frontend-report-catalog.md](frontend-report-catalog.md) e o
workspace de [frontend-creator-features.md](frontend-creator-features.md).

## Modelo de segurança

O frontend nunca recebe ou envia SQL. Um usuário com `globalRole=root` cadastra
templates globais que descrevem relações permitidas entre objetos catalogados.
O creator recebe somente os templates habilitados que a API considera aplicáveis
ao datasource e ao catálogo efetivo da organização.

O catálogo efetivo já aplica schemas e fields habilitados, denies da organização,
grants dos profiles e capacidades dos fields. Não tente recriar no cliente um
join que não esteja em `catalog.joins`.

Regras estruturais:

- os tipos suportados são `inner` e `left`;
- o tipo pertence ao template e não pode ser escolhido pelo creator;
- ambos os objetos precisam estar catalogados no mesmo datasource selecionado;
- cada template usado deve ligar diretamente o schema principal a outro schema;
- não há join encadeado partindo de um schema que já foi associado;
- o template pode ser aplicado com qualquer um dos lados como schema principal;
- o mesmo schema pode aparecer mais de uma vez quando cada ocorrência usa um
  alias único.

## Administração dos templates

Todos os endpoints desta seção são exclusivos de `globalRole=root`.

### Tipos TypeScript

```ts
type JoinType = "inner" | "left";

interface ReportJoinTemplate {
  id: string;
  name: string;
  suggestedAlias: string;
  joinType: JoinType;
  leftInternalSchemaName: string;
  leftInternalObjectName: string;
  leftInternalFieldName: string;
  rightInternalSchemaName: string;
  rightInternalObjectName: string;
  rightInternalFieldName: string;
  isEnabled: boolean;
}

interface CreateReportJoinTemplateRequest {
  name: string;
  suggestedAlias: string;
  joinType: JoinType;
  leftInternalSchemaName: string;
  leftInternalObjectName: string;
  leftInternalFieldName: string;
  rightInternalSchemaName: string;
  rightInternalObjectName: string;
  rightInternalFieldName: string;
  isEnabled: boolean;
}

type UpdateReportJoinTemplateRequest = CreateReportJoinTemplateRequest;
```

Embora o endpoint de atualização use `PATCH`, todos os campos do request devem
ser reenviados. Trate o formulário como substituição completa dos dados
editáveis, não como patch parcial.

### Endpoints

| Operação | Endpoint | Sucesso |
|---|---|---:|
| Listar | `GET /api/v1/report-join-templates` | `200 ReportJoinTemplate[]` |
| Criar | `POST /api/v1/report-join-templates` | `201 ReportJoinTemplate` |
| Atualizar | `PATCH /api/v1/report-join-templates/{id}` | `200 ReportJoinTemplate` |
| Excluir | `DELETE /api/v1/report-join-templates/{id}` | `204` |

Após criar ou atualizar, substitua o item local pela resposta da API. Após
excluir, remova-o da coleção somente depois do `204`.

### Formulário assistido pelo catálogo

Carregue os schemas com `GET /api/v1/report-schemas`. Ao selecionar cada lado,
carregue seus campos com:

```http
GET /api/v1/report-schemas/{schemaId}/fields
```

Use seletores e guarde os nomes internos retornados pelo catálogo. Não permita
digitação livre para schema, objeto ou coluna, pois um erro de grafia pode gerar
um template que nunca ficará disponível no designer.

```ts
interface JoinEndpointSelection {
  schemaId: string;
  internalSchemaName: string;
  internalObjectName: string;
  fieldId: string;
  internalFieldName: string;
}

function toCreateRequest(
  name: string,
  suggestedAlias: string,
  joinType: JoinType,
  left: JoinEndpointSelection,
  right: JoinEndpointSelection,
): CreateReportJoinTemplateRequest {
  return {
    name: name.trim(),
    suggestedAlias: normalizeJoinAlias(suggestedAlias),
    joinType,
    leftInternalSchemaName: left.internalSchemaName,
    leftInternalObjectName: left.internalObjectName,
    leftInternalFieldName: left.internalFieldName,
    rightInternalSchemaName: right.internalSchemaName,
    rightInternalObjectName: right.internalObjectName,
    rightInternalFieldName: right.internalFieldName,
    isEnabled: true,
  };
}
```

Exija todos os textos, ofereça somente `inner` e `left` e bloqueie localmente um
nome já usado ou a mesma combinação esquerda/direita já carregada. A API é a
autoridade final e aplica unicidade global ao nome e à origem na mesma direção.

Exemplo para `orders.customer_id = customers.id`:

```json
{
  "name": "Pedido - cliente",
  "suggestedAlias": "customer",
  "joinType": "left",
  "leftInternalSchemaName": "public",
  "leftInternalObjectName": "orders",
  "leftInternalFieldName": "customer_id",
  "rightInternalSchemaName": "public",
  "rightInternalObjectName": "customers",
  "rightInternalFieldName": "id",
  "isEnabled": true
}
```

### Desabilitação e exclusão

Desabilitar ou excluir um template faz com que ele deixe de aparecer nos novos
catálogos do designer. Isso não altera automaticamente o JSON de relatórios já
salvos. Na próxima validação, preview ou execução, uma definição antiga pode
falhar com `report_definition.join_template_unavailable`.

Exija confirmação explícita, explique esse impacto e aguarde a resposta da API.
Não use atualização otimista nessas operações.

## Uso no designer pelo creator

Depois que o usuário escolher organização e datasource, carregue:

```http
GET /api/v1/organizations/{organizationId}/report-designer/catalog?dataSourceId={dataSourceId}
```

```ts
interface DesignerJoin {
  joinTemplateId: string;
  name: string;
  joinType: JoinType;
  fromSchemaId: string;
  fromSchemaName: string;
  fromFieldId: string;
  toSchemaId: string;
  toSchemaName: string;
  toFieldId: string;
  suggestedAlias: string;
}

interface JoinItem {
  joinTemplateId: string;
  alias: string;
}

interface FieldReference {
  fieldId: string;
  joinAlias?: string;
}

interface WhereNode extends Partial<FieldReference> {
  operator: string;
  value?: unknown;
  conditions?: WhereNode[];
}
```

O creator não precisa conhecer nomes internos. Exiba nomes públicos e use os IDs
devolvidos pela API.

### Descobrir joins aplicáveis

Ofereça somente joins que tocam o `dataset.schemaId`. O lado oposto identifica o
schema que será associado:

```ts
function getApplicableJoins(
  joins: DesignerJoin[],
  mainSchemaId: string,
): DesignerJoin[] {
  return joins.filter(join =>
    join.fromSchemaId === mainSchemaId || join.toSchemaId === mainSchemaId,
  );
}

function getJoinedSchemaId(join: DesignerJoin, mainSchemaId: string): string {
  if (join.fromSchemaId === mainSchemaId) return join.toSchemaId;
  if (join.toSchemaId === mainSchemaId) return join.fromSchemaId;
  throw new Error("Join não é aplicável ao schema principal");
}
```

Não ofereça como próximo passo os joins de um schema associado. Todos os itens de
`dataset.joins` são resolvidos diretamente contra o schema principal.

### Alias e estado normalizado

O payload do relatório guarda apenas `joinTemplateId` e `alias`. Use
`suggestedAlias` como valor inicial, normalize-o e valide a unicidade exata antes
de adicionar.

```ts
function normalizeJoinAlias(value: string): string {
  return value.trim().replace(/\s+/g, "_");
}

interface DesignerJoinInstance {
  joinTemplateId: string;
  alias: string;
  joinedSchemaId: string;
}

interface DesignerState {
  mainSchemaId: string;
  joinsByAlias: Record<string, DesignerJoinInstance>;
  select: Array<FieldReference & { alias?: string; aggregation?: string }>;
  where?: WhereNode;
  groupBy: FieldReference[];
  orderBy: Array<FieldReference & {
    direction: "asc" | "desc";
    aggregation?: string;
  }>;
}

function addJoin(
  state: DesignerState,
  template: DesignerJoin,
  requestedAlias: string,
): DesignerState {
  const alias = normalizeJoinAlias(requestedAlias);
  if (!alias) throw new Error("Alias é obrigatório");
  if (Object.hasOwn(state.joinsByAlias, alias)) {
    throw new Error("Alias já utilizado");
  }

  return {
    ...state,
    joinsByAlias: {
      ...state.joinsByAlias,
      [alias]: {
        joinTemplateId: template.joinTemplateId,
        alias,
        joinedSchemaId: getJoinedSchemaId(template, state.mainSchemaId),
      },
    },
  };
}
```

O backend compara aliases de forma ordinal. Preserve a grafia escolhida e use
sempre o mesmo valor nas referências. Não converta para maiúsculas/minúsculas em
pontos diferentes do fluxo.

### Referenciar campos associados

Campos do schema principal omitem `joinAlias`. Campos de um schema associado
devem enviar o alias em todos os locais onde aparecem:

- `select`;
- nós de campo em `where`;
- `groupBy`;
- `orderBy`;
- filtros runtime de preview ou execução.

```ts
function fieldReference(fieldId: string, joinAlias?: string): FieldReference {
  return joinAlias ? { fieldId, joinAlias } : { fieldId };
}
```

Não identifique uma ocorrência associada apenas por `fieldId`: duas instâncias do
mesmo schema podem usar o mesmo field com aliases diferentes.

### Exemplo completo

O exemplo seleciona o nome do cliente associado, soma valores dos pedidos,
filtra clientes ativos, agrupa pelo nome e ordena pelo total:

```json
{
  "version": 1,
  "dataset": {
    "schemaId": "11111111-1111-1111-1111-111111111111",
    "joins": [
      {
        "joinTemplateId": "22222222-2222-2222-2222-222222222222",
        "alias": "customer"
      }
    ],
    "select": [
      {
        "fieldId": "33333333-3333-3333-3333-333333333333",
        "joinAlias": "customer",
        "alias": "Cliente"
      },
      {
        "fieldId": "44444444-4444-4444-4444-444444444444",
        "aggregation": "sum",
        "alias": "Total"
      }
    ],
    "where": {
      "fieldId": "55555555-5555-5555-5555-555555555555",
      "joinAlias": "customer",
      "operator": "eq",
      "value": true
    },
    "groupBy": [
      {
        "fieldId": "33333333-3333-3333-3333-333333333333",
        "joinAlias": "customer"
      }
    ],
    "orderBy": [
      {
        "fieldId": "44444444-4444-4444-4444-444444444444",
        "aggregation": "sum",
        "direction": "desc"
      }
    ],
    "limit": 500
  }
}
```

O tipo `left` vem do template `2222...`; ele não aparece em `dataset.joins`.

### Duas relações com o mesmo schema

Para campos como `created_by` e `approved_by` de `orders`, cadastre dois
templates apontando para `users.id`. O relatório pode usar ambos porque os
aliases são diferentes:

```json
{
  "joins": [
    { "joinTemplateId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "alias": "createdBy" },
    { "joinTemplateId": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "alias": "approvedBy" }
  ],
  "select": [
    { "fieldId": "cccccccc-cccc-cccc-cccc-cccccccccccc", "joinAlias": "createdBy", "alias": "Criado por" },
    { "fieldId": "cccccccc-cccc-cccc-cccc-cccccccccccc", "joinAlias": "approvedBy", "alias": "Aprovado por" }
  ]
}
```

### Remover um join

Antes de remover, localize todas as referências cujo `joinAlias` seja o alias da
instância. A interface deve mostrar o impacto e oferecer uma destas ações:

- cancelar a remoção; ou
- confirmar e remover, na mesma atualização de estado, o join e todas as
  referências dependentes.

Nunca deixe referências órfãs no conteúdo enviado. Elas falhariam com
`report_definition.join_alias_unavailable`.

Depois de qualquer alteração estrutural, execute `POST /api/v1/reports/preview`.
Preview usa a mesma validação da criação e atualização, mas não persiste o
relatório.

## Erros

Tome decisões pelo `ProblemDetails.code`; use `detail` somente como mensagem
auxiliar.

| Código | Tratamento sugerido |
|---|---|
| `report_catalog.root_access_required` | Ocultar administração e mostrar acesso negado |
| `report_catalog.invalid_request` | Associar ao campo inválido do formulário |
| `report_catalog.join_template_name_duplicate` | Marcar o nome como já utilizado |
| `report_catalog.join_template_source_duplicate` | Informar que a relação já existe na mesma direção |
| `report_catalog.join_template_not_found` | Remover item obsoleto e recarregar a lista |
| `report_definition.join_invalid` | Marcar a coleção de joins como inválida |
| `report_definition.join_alias_required` | Solicitar alias |
| `report_definition.duplicate_join_alias` | Destacar as instâncias com alias repetido |
| `report_definition.join_template_unavailable` | Recarregar catálogo e pedir substituição ou remoção |
| `report_definition.join_template_not_applicable` | Remover template incompatível com o schema principal |
| `report_definition.join_schema_unavailable` | Recarregar catálogo; acesso ao schema associado mudou |
| `report_definition.join_field_unavailable` | Recarregar catálogo; campo da relação ficou indisponível |
| `report_definition.join_alias_unavailable` | Destacar referências órfãs |

Em `401`, use o refresh central e repita a requisição no máximo uma vez. Em
`403`, preserve a sessão e apresente acesso negado.

## Checklist de validação

- Somente `root` vê e executa o CRUD administrativo.
- O formulário usa schemas e fields catalogados e aceita somente `inner` ou
  `left`.
- O creator não vê nomes internos, condições SQL ou joins fora do catálogo
  efetivo.
- A lista oferece apenas templates ligados ao schema principal.
- Todo field associado carrega o `joinAlias` da instância correta.
- Aliases vazios ou duplicados são bloqueados antes do preview.
- Duas relações com o mesmo schema funcionam com aliases distintos.
- A remoção de um join também trata todas as referências dependentes.
- Desabilitação e exclusão aguardam sucesso e alertam sobre relatórios antigos.
- Preview valida o conteúdo sem persistir alterações.
