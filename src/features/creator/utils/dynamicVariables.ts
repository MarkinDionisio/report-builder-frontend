import type { WhereNode, DesignerCatalog } from "../types/creatorTypes";
import { getFieldTypeInfo, toLocalIsoString } from "./dateUtils";

export const DYNAMIC_VARIABLES = [
  { id: "{{Today}}", label: "Hoje" },
  { id: "{{Yesterday}}", label: "Ontem" },
  { id: "{{Last7Days}}", label: "Últimos 7 Dias" },
  { id: "{{Last30Days}}", label: "Últimos 30 Dias" },
  { id: "{{FirstDayOfMonth}}", label: "Primeiro Dia do Mês" },
  { id: "{{LastDayOfMonth}}", label: "Último Dia do Mês" },
  { id: "{{FirstDayOfLastMonth}}", label: "Primeiro Dia do Mês Passado" },
  { id: "{{LastDayOfLastMonth}}", label: "Último Dia do Mês Passado" },
  { id: "{{FirstDayOfYear}}", label: "Primeiro Dia do Ano" },
  { id: "{{LastDayOfYear}}", label: "Último Dia do Ano" },
];

export function resolveDynamicVariable(variableName: string, fieldType: "date" | "datetime" | "time" | "string" = "date"): string | null {
  const now = new Date();
  let resultDate: Date;

  switch (variableName) {
    case "{{Today}}":
      resultDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "{{Yesterday}}":
      resultDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      break;
    case "{{Last7Days}}":
      resultDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      break;
    case "{{Last30Days}}":
      resultDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
      break;
    case "{{FirstDayOfMonth}}":
      resultDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "{{LastDayOfMonth}}":
      resultDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case "{{FirstDayOfLastMonth}}":
      resultDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      break;
    case "{{LastDayOfLastMonth}}":
      resultDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
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

  if (fieldType === "datetime") {
    return toLocalIsoString(resultDate);
  } else if (fieldType === "time") {
    const pad = (num: number) => (num < 10 ? '0' : '') + num;
    return `${pad(resultDate.getHours())}:${pad(resultDate.getMinutes())}:${pad(resultDate.getSeconds())}`;
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
  let result: WhereNode = { ...node };

  if (typeof result.value === "string" || Array.isArray(result.value)) {
    const fieldType = getFieldTypeInfo(result.fieldId || "", result.joinAlias, catalog, baseSchemaId, joins);

    const resolveValue = (val: any) => {
      if (typeof val === "string" && val.startsWith("{{") && val.endsWith("}}")) {
        const resolved = resolveDynamicVariable(val, fieldType);
        return resolved || val;
      }
      return val;
    };

    if (Array.isArray(result.value)) {
      result.value = result.value.map(resolveValue);
    } else {
      result.value = resolveValue(result.value);
    }
  }

  if (result.conditions && result.conditions.length > 0) {
    result.conditions = result.conditions.map(c => resolveWhereNodeVariables(c, catalog, baseSchemaId, joins));
  }

  return result;
}
