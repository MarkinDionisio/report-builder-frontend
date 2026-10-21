export interface CatalogTemplateField {
  id: string; internalFieldName: string; publicName: string; publicType: string;
  isNullable: boolean; isSelectable: boolean; isFilterable: boolean; isSortable: boolean;
  isGroupable: boolean; isAggregatable: boolean; isSensitive: boolean; isEnabled: boolean;
  allowedOperators: string[]; allowedAggregations: string[]; compatible: boolean; reason: string | null;
}
export interface CatalogTemplateSchema {
  id: string; internalSchemaName: string; internalObjectName: string; publicName: string;
  publicType: string; description: string | null; isEnabled: boolean;
  compatible: boolean; reason: string | null; fields: CatalogTemplateField[];
}
export interface CatalogTemplate { id: string; name: string; description: string | null; schemas: CatalogTemplateSchema[]; }
export interface CatalogTemplateSelection { schemaId: string; fieldIds: string[]; }
