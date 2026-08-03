import type { WhereNode, DesignerCatalog } from "../types/creatorTypes";

export const DYNAMIC_VARIABLES = [
  { id: "{{Today}}", label: "Hoje" },
  { id: "{{FirstDayOfMonth}}", label: "Primeiro Dia do Mês" },
  { id: "{{LastDayOfMonth}}", label: "Último Dia do Mês" },
  { id: "{{FirstDayOfYear}}", label: "Primeiro Dia do Ano" },
  { id: "{{LastDayOfYear}}", label: "Último Dia do Ano" },
];

export function resolveDynamicVariable(variableName: string, isDateTime: boolean = false): string | null {
  const now = new Date();
  let resultDate: Date;

  switch (variableName) {
    case "{{Today}}":
      resultDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "{{FirstDayOfMonth}}":
      resultDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "{{LastDayOfMonth}}":
      resultDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case "{{FirstDayOfYear}}":
      resultDate = new Date(now.getFullYear(), 0, 1);
      break;
    case "{{LastDayOfYear}}":
      resultDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    default:
      return null;
  }

  if (isDateTime) {
    return resultDate.toISOString();
  } else {
    // Return YYYY-MM-DD in local time
    const yyyy = resultDate.getFullYear();
    const mm = String(resultDate.getMonth() + 1).padStart(2, '0');
    const dd = String(resultDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}

export function resolveWhereNodeVariables(
  node: WhereNode, 
  catalog?: DesignerCatalog | null, 
  baseSchemaId?: string,
  joins?: any[]
): WhereNode {
  const result: WhereNode = { ...node };

  if (typeof result.value === "string" && result.value.startsWith("{{") && result.value.endsWith("}}")) {
    let isDateTime = false;
    
    if (catalog && baseSchemaId && result.fieldId) {
      let schemaId = baseSchemaId;
      if (result.joinAlias && joins) {
        const joinInfo = joins.find(j => j.alias === result.joinAlias);
        if (joinInfo) {
          const joinTemplate = catalog.joins.find(j => j.joinTemplateId === joinInfo.joinTemplateId);
          if (joinTemplate) schemaId = joinTemplate.toSchemaId;
        }
      }
      
      const schema = catalog.schemas.find(s => s.id === schemaId);
      if (schema) {
        const field = schema.fields.find(f => f.id === result.fieldId);
        if (field) {
          const typeStr = (field.type || "").toLowerCase();
          isDateTime = typeStr.includes("timestamp") || typeStr.includes("time") || typeStr.includes("datetime");
        }
      }
    }

    const resolved = resolveDynamicVariable(result.value, isDateTime);
    if (resolved) {
      result.value = resolved;
    }
  }

  if (result.conditions && result.conditions.length > 0) {
    result.conditions = result.conditions.map(c => resolveWhereNodeVariables(c, catalog, baseSchemaId, joins));
  }

  return result;
}
