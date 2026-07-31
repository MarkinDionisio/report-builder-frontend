export type VisibilityScope = "private" | "organization" | "global";
export type ResourceRole = "root" | "owner" | "administrator" | "creator" | "viewer";
export type VerificationStatus = "pending" | "verified" | "failed" | "suspicious";
export type JoinType = "inner" | "left";

export interface CreatorDataSourceOption {
  id: string;
  name: string;
  provider: string;
  readOnlyVerificationStatus: VerificationStatus;
}

export interface SharingTargets {
  users: Array<{ id: string; name: string; email: string }>;
  profiles: Array<{ id: string; name: string }>;
}

export interface DesignerField {
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

export interface DesignerSchema {
  id: string;
  dataSourceId: string;
  dataSourceName: string;
  name: string;
  type: string;
  fields: DesignerField[];
}

export interface DesignerJoin {
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

export interface DesignerCatalog {
  schemas: DesignerSchema[];
  joins: DesignerJoin[];
}

export interface PagedResult<T> {
  page: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
  data: T[];
}

export interface FieldReference {
  fieldId: string;
  joinAlias?: string;
}

export interface SelectItem extends FieldReference {
  alias?: string;
  aggregation?: string;
}

export interface JoinItem {
  joinTemplateId: string;
  alias: string;
}

export interface WhereNode extends Partial<FieldReference> {
  operator: string;
  value?: unknown;
  conditions?: WhereNode[];
}

export interface ReportContentV1 {
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

export interface ReportListItem {
  id: string;
  title: string;
  organizationId: string;
  organizationName: string;
  visibilityScope: VisibilityScope;
  myRole: ResourceRole;
  createdAt: string;
}

export interface ReportDetail {
  id: string;
  title: string;
  organizationId: string;
  organizationName: string;
  visibilityScope: VisibilityScope;
  myRole: ResourceRole;
  content: ReportContentV1;
  allowedFilters: Array<{ field: string; type: string; options: string[] }>;
}

export interface UpsertReportRequest {
  title: string;
  visibilityScope: VisibilityScope;
  organizationId?: string; // obrigatório apenas na criação
  content: ReportContentV1;
  availableFilters?: Array<{ field: string; type: string; options: string[] }>;
}

export interface FilterRestriction {
  field: string;
  type: string;
  values: string[];
}

export interface UpdateReportShareRequest {
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

export interface DashboardItemRequest {
  reportId: string;
  layout: Record<string, unknown>;
}

export interface CreateDashboardRequest {
  title: string;
  visibilityScope: VisibilityScope;
  organizationId: string;
  items: DashboardItemRequest[];
}

export interface UpdateDashboardRequest {
  title: string;
  visibilityScope: VisibilityScope;
  items: DashboardItemRequest[];
}

export interface UpdateDashboardShareRequest {
  visibilityScope: VisibilityScope;
  sharedWithUsers: Array<{ userId: string }>;
  sharedWithProfiles: Array<{ profileId: string }>;
}

export interface DashboardListItem {
  id: string;
  title: string;
  organizationId: string;
  organizationName: string;
  visibilityScope: VisibilityScope;
  myRole: ResourceRole;
  createdAt: string;
  reportCount: number;
}

export interface DashboardDetail {
  id: string;
  title: string;
  organizationId: string;
  organizationName: string;
  visibilityScope: VisibilityScope;
  myRole: ResourceRole;
  items: Array<{
    reportId: string;
    layout: Record<string, unknown>;
  }>;
}

export interface RuntimeFilter {
  fieldId: string;
  joinAlias?: string;
  operator: string;
  value?: unknown;
}

export interface ExecuteRequest {
  filters: RuntimeFilter[];
  page: number;
  pageSize: number;
}

export interface ExecuteResponse {
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

export interface PreviewRequest {
  organizationId: string;
  content: ReportContentV1;
  filters: RuntimeFilter[];
  page: number;
  pageSize: number;
}
