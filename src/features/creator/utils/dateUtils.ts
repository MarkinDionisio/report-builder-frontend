import type { DesignerCatalog } from "../types/creatorTypes";

export function toLocalIsoString(date: Date): string {
  const tzo = -date.getTimezoneOffset();
  const dif = tzo >= 0 ? '+' : '-';
  const pad = (num: number) => {
    const norm = Math.floor(Math.abs(num));
    return (norm < 10 ? '0' : '') + norm;
  };
  return date.getFullYear() +
    '-' + pad(date.getMonth() + 1) +
    '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) +
    ':' + pad(date.getMinutes()) +
    ':' + pad(date.getSeconds()) +
    dif + pad(tzo / 60) +
    ':' + pad(tzo % 60);
}

export function formatDateTimeValue(value: string, fieldType: "date" | "datetime" | "time" | "string" = "string", isEndDateOfInterval: boolean = false): string {
  if (fieldType === "string" || !value) return value;
  
  // If value is a dynamic variable, it should be resolved before calling this,
  // but if not, we leave it as is.
  if (value.startsWith("{{") && value.endsWith("}}")) return value;

  // Assume value is a YYYY-MM-DD or similar string from input
  // Or it could be an existing ISO string
  
  // Try to parse the date. If it's just YYYY-MM-DD, new Date("YYYY-MM-DD") parses as UTC midnight.
  // We want it as local midnight.
  let dateObj = new Date(value);
  if (value.length === 10 && value.includes("-")) { // YYYY-MM-DD
    dateObj = new Date(value + "T00:00:00");
  }

  if (isNaN(dateObj.getTime())) return value; // Invalid date, return as is

  if (isEndDateOfInterval && value.length === 10) {
    // If it's the end of a closed-open interval for a day, we add 1 day
    dateObj.setDate(dateObj.getDate() + 1);
  }

  if (fieldType === "datetime") {
    return toLocalIsoString(dateObj);
  } else if (fieldType === "time") {
    const pad = (num: number) => (num < 10 ? '0' : '') + num;
    return `${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}`;
  } else {
    // date
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}

export function getFieldTypeInfo(fieldId: string, joinAlias?: string, catalog?: DesignerCatalog | null, baseSchemaId?: string, joins?: any[]): "date" | "datetime" | "time" | "string" {
  let fieldType: "date" | "datetime" | "time" | "string" = "string";
  if (catalog && baseSchemaId && fieldId) {
    let schemaId = baseSchemaId;
    if (joinAlias && joins) {
      const joinInfo = joins.find(j => j.alias === joinAlias);
      if (joinInfo) {
        const joinTemplate = catalog.joins.find(j => j.joinTemplateId === joinInfo.joinTemplateId);
        if (joinTemplate) schemaId = joinTemplate.toSchemaId;
      }
    }
    
    const schema = catalog.schemas.find(s => s.id === schemaId);
    if (schema) {
      const field = schema.fields.find(f => f.id === fieldId);
      if (field) {
        const typeStr = (field.type || "").toLowerCase();
        if (typeStr.includes("timestamp") || typeStr.includes("datetime")) fieldType = "datetime";
        else if (typeStr.includes("time")) fieldType = "time";
        else if (typeStr.includes("date")) fieldType = "date";
      }
    }
  }
  return fieldType;
}
