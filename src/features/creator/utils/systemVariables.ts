import type { ReportSystemVariable } from "../types/creatorTypes";
export const PARAMETER_VARIABLES: Array<{ value: ReportSystemVariable; label: string; type: "date" | "datetime" }> = [
  { value: "startOfLast12Months", label: "Início dos últimos 12 meses (inclui mês atual)", type: "datetime" },
  { value: "now", label: "Agora", type: "datetime" }, { value: "currentDate", label: "Data atual", type: "date" },
  { value: "startOfToday", label: "Início de hoje", type: "datetime" }, { value: "startOfTomorrow", label: "Início de amanhã", type: "datetime" },
  { value: "startOfYesterday", label: "Início de ontem", type: "datetime" }, { value: "startOfWeek", label: "Início da semana", type: "datetime" },
  { value: "startOfNextWeek", label: "Início da próxima semana", type: "datetime" }, { value: "startOfPreviousWeek", label: "Início da semana anterior", type: "datetime" },
  { value: "startOfMonth", label: "Início do mês", type: "datetime" }, { value: "startOfNextMonth", label: "Início do próximo mês", type: "datetime" },
  { value: "startOfPreviousMonth", label: "Início do mês anterior", type: "datetime" }, { value: "startOfYear", label: "Início do ano", type: "datetime" },
  { value: "startOfNextYear", label: "Início do próximo ano", type: "datetime" }, { value: "startOfPreviousYear", label: "Início do ano anterior", type: "datetime" },
];
