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
  fieldId?: string;
  joinAlias?: string;
  target?: "rows";
  dateGranularity?: DateGranularity;
}

export type DateGranularity = "day" | "month" | "year";

export interface SelectItem extends FieldReference {
  alias?: string;
  aggregation?: string;
}

export interface JoinItem {
  joinTemplateId: string;
  alias: string;
}

export interface WhereNode extends Partial<FieldReference> {
  caseSensitive?: boolean;
  operator: string;
  value?: unknown;
  conditions?: WhereNode[];
  ui?: { kind: "relativePeriod"; preset: RelativePeriodPreset; label?: string };
}

export type RelativePeriodPreset = "today" | "yesterday" | "currentWeek" | "previousWeek" | "currentMonth" | "previousMonth" | "currentYear" | "previousYear";

export type ReportParameterType = "string" | "integer" | "number" | "boolean" | "uuid" | "date" | "datetime" | "time";
export type ReportSystemVariable = "now" | "currentDate" | "startOfToday" | "startOfTomorrow" | "startOfYesterday" | "startOfWeek" | "startOfNextWeek" | "startOfPreviousWeek" | "startOfMonth" | "startOfNextMonth" | "startOfPreviousMonth" | "startOfYear" | "startOfNextYear" | "startOfPreviousYear";

export interface ReportParameterDefinition {
  name: string;
  type: ReportParameterType;
  source: "input" | "system";
  variable?: ReportSystemVariable;
  allowOverride?: boolean;
  required?: boolean;
  label?: string;
  description?: string;
  placeholder?: string;
}

export interface ParameterReference { parameter: string; }

export type ReportPresentation =
  | { type: "table" }
  | { type: "groupedTable"; groupColumnAlias: string; direction: "asc" | "desc" }
  | { type: "metric"; valueColumnAlias: string; label?: string };

export interface ReportContentV1 {
  version: 1;
  parameters?: ReportParameterDefinition[];
  presentation?: ReportPresentation;
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
  canExecute: boolean;
  canEdit: boolean;
  executionBlockCode: string | null;
  blockedSchemas: BlockedReportSchema[];
}

export type ReportFieldCapability = "selectable" | "filterable" | "sortable" | "groupable" | "aggregatable";

export interface BlockedReportField {
  fieldId: string;
  fieldName: string | null;
  reason: "field_grant_missing" | "field_unavailable" | "capability_missing";
  missingCapabilities: ReportFieldCapability[];
}

export interface BlockedReportSchema {
  schemaId: string;
  schemaName: string | null;
  reason: "schema_grant_missing" | "schema_unavailable" | "field_unavailable" | "capability_missing";
  blockedFields: BlockedReportField[];
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
  layout: DashboardItemLayout;
}

export interface DashboardItemLayout {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  presentation?: ReportPresentation;
  [key: string]: unknown;
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
    itemId: string;
    reportId: string;
    layout: DashboardItemLayout;
  }>;
}

export interface RuntimeFilter {
  fieldId: string;
  joinAlias?: string;
  operator: string;
  value?: unknown;
}

export interface ExecuteRequest {
  parameters: Record<string, unknown>;
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
  resolvedParameters: Record<string, unknown>;
  warnings?: Array<{
    code: "report_execution.order_by_ignored";
    message: string;
    itemIndex: number;
    fieldId: string;
    joinAlias: string | null;
  }>;
}

export interface PreviewRequest {
  organizationId: string;
  content: ReportContentV1;
  parameters: Record<string, unknown>;
  filters: RuntimeFilter[];
  page: number;
  pageSize: number;
}
