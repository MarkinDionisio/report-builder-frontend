export interface Profile {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
  description: string | null;
}

export interface UpsertProfileRequest {
  name: string;
  description?: string | null;
}

export type DataSourceProvider = "postgresql";
export type ExecutionCredentialMode =
  | "managedReadOnlyUser"
  | "existingReadOnlyUser";
export type ReadOnlyVerificationStatus =
  | "pending"
  | "verified"
  | "failed"
  | "suspicious";

export interface DataSource {
  id: string;
  organizationId: string;
  name: string;
  provider: DataSourceProvider;
  executionCredentialMode: ExecutionCredentialMode;
  readOnlyVerificationStatus: ReadOnlyVerificationStatus;
  isEnabled: boolean;
  adminConnectionStringMasked: string;
  executionConnectionStringMasked: string;
  hasClientCertificate: boolean;
}

export interface ClientCertificateRequest {
  pfxBase64: string;
  password?: string | null;
}

export type ClientCertificateUpdate =
  | { operation: "keep" }
  | { operation: "remove" }
  | { operation: "replace"; pfxBase64: string; password?: string | null };

export interface CreateDataSourceRequest {
  organizationId: string;
  name: string;
  provider: DataSourceProvider;
  adminConnectionString: string;
  executionConnectionString: string;
  executionCredentialMode: ExecutionCredentialMode;
  isEnabled: boolean;
  clientCertificate?: ClientCertificateRequest | null;
}

export interface UpdateDataSourceRequest {
  name: string;
  executionCredentialMode: ExecutionCredentialMode;
  isEnabled: boolean;
  clientCertificateUpdate?: ClientCertificateUpdate | null;
}

export interface IntrospectionObject {
  schemaName: string;
  objectName: string;
  objectType: string;
}

export interface IntrospectionField {
  fieldName: string;
  databaseType: string;
  isNullable: boolean;
  suggestedPublicType: string;
}

export interface RootReportSchema {
  id: string;
  dataSourceId: string;
  publicName: string;
  publicType: string;
  internalSchemaName: string;
  internalObjectName: string;
  description: string | null;
  isEnabled: boolean;
}

export interface CreateReportSchemaRequest {
  dataSourceId: string;
  internalSchemaName: string;
  internalObjectName: string;
  publicName: string;
  publicType: string;
  description?: string | null;
  isEnabled: boolean;
}

export interface UpdateReportSchemaRequest {
  publicName: string;
  publicType: string;
  description?: string | null;
  isEnabled: boolean;
}

export interface RootReportField {
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
  internalFieldName: string;
  isSensitive: boolean;
  isEnabled: boolean;
}

export interface UpsertReportFieldRequest {
  internalFieldName?: string | null;
  publicName: string;
  publicType: string;
  isNullable: boolean;
  isSelectable: boolean;
  isFilterable: boolean;
  isSortable: boolean;
  isGroupable: boolean;
  isAggregatable: boolean;
  isSensitive: boolean;
  isEnabled: boolean;
  allowedOperators: string[];
  allowedAggregations: string[];
}

export interface ImportReportSchemaRequest {
  dataSourceId: string;
  internalSchemaName: string;
  internalObjectName: string;
  publicName?: string | null;
  publicType: string;
}

export interface ImportFieldPreview {
  existingFieldId: string | null;
  internalFieldName: string;
  publicName: string;
  databaseType: string;
  publicType: string;
  isNullable: boolean;
  isSelectable: boolean;
  isFilterable: boolean;
  isSortable: boolean;
  isGroupable: boolean;
  isAggregatable: boolean;
  isSensitive: boolean;
  isEnabled: boolean;
  alreadyExists: boolean;
  allowedOperators: string[];
  allowedAggregations: string[];
}

export interface ImportSchemaPreview {
  existingSchemaId: string | null;
  dataSourceId: string;
  internalSchemaName: string;
  internalObjectName: string;
  publicName: string;
  publicType: string;
  schemaExists: boolean;
  fields: ImportFieldPreview[];
}

export interface ImportSchemaResponse {
  schema: RootReportSchema;
  createdFields: RootReportField[];
  existingFields: RootReportField[];
}

export interface BootstrapRequest {
  dataSourceId: string;
  schemaNames: string[];
  objectTypes: string[];
  publicType: string;
}

export interface BootstrapPreviewItem {
  succeeded: boolean;
  error: string | null;
  schema: ImportSchemaPreview | null;
  internalSchemaName: string;
  internalObjectName: string;
  objectType: string;
}

export interface BootstrapPreview {
  dataSourceId: string;
  objectsDiscovered: number;
  schemasToCreate: number;
  schemasExisting: number;
  fieldsToCreate: number;
  fieldsExisting: number;
  schemas: BootstrapPreviewItem[];
}

export interface BootstrapResultItem {
  succeeded: boolean;
  error: string | null;
  import: ImportSchemaResponse | null;
  internalSchemaName: string;
  internalObjectName: string;
  objectType: string;
}

export interface BootstrapResult {
  dataSourceId: string;
  objectsDiscovered: number;
  schemasCreated: number;
  schemasExisting: number;
  fieldsCreated: number;
  fieldsExisting: number;
  schemas: BootstrapResultItem[];
}

export interface AvailableCatalogField {
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

export interface AvailableCatalogSchema {
  id: string;
  dataSourceId: string;
  dataSourceName: string;
  name: string;
  type: string;
  fields: AvailableCatalogField[];
}

export interface ProfileFieldGrant {
  fieldId: string;
  selectable: boolean;
  filterable: boolean;
  sortable: boolean;
  groupable: boolean;
  aggregatable: boolean;
}

export interface ProfileSchemaGrant {
  schemaId: string;
  fields: ProfileFieldGrant[];
}

export interface ProfileGrants {
  schemas: ProfileSchemaGrant[];
}

export interface UpdateProfileGrantsRequest {
  schemas: ProfileSchemaGrant[];
}

export interface GrantAllRequest {
  dataSourceId: string;
}

export type JoinType = "inner" | "left";

export interface ReportJoinTemplate {
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

export interface CreateReportJoinTemplateRequest {
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

export type UpdateReportJoinTemplateRequest = CreateReportJoinTemplateRequest;
