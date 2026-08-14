import type { ReportParameterDefinition } from "../types/creatorTypes";

const SYSTEM_VARIABLE_TYPES: Record<string, "date" | "datetime"> = { currentDate: "date", now: "datetime", startOfToday: "datetime", startOfTomorrow: "datetime", startOfYesterday: "datetime", startOfWeek: "datetime", startOfNextWeek: "datetime", startOfPreviousWeek: "datetime", startOfMonth: "datetime", startOfNextMonth: "datetime", startOfPreviousMonth: "datetime", startOfYear: "datetime", startOfNextYear: "datetime", startOfPreviousYear: "datetime" };

export function validateParameters(parameters: ReportParameterDefinition[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const parameter of parameters) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(parameter.name)) errors.push(`Nome inválido: ${parameter.name || "(vazio)"}`);
    if (seen.has(parameter.name)) errors.push(`Nome duplicado: ${parameter.name}`);
    seen.add(parameter.name);
    if (parameter.source === "system" && (!parameter.variable || SYSTEM_VARIABLE_TYPES[parameter.variable] !== parameter.type)) errors.push(`Variável incompatível: ${parameter.name}`);
  }
  return errors;
}

export function requiredParametersMissing(parameters: ReportParameterDefinition[], values: Record<string, unknown>): boolean {
  return parameters.some((parameter) => parameter.source === "input" && (values[parameter.name] === undefined || values[parameter.name] === ""));
}
