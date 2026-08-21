import { AlertTriangle } from "lucide-react";
import type { BlockedReportSchema } from "../types/creatorTypes";

const capabilityLabels: Record<string, string> = {
  selectable: "seleção",
  filterable: "filtro",
  sortable: "ordenação",
  groupable: "agrupamento",
  aggregatable: "agregação",
};

function fieldBlockMessage(reason: string, capabilities: string[]) {
  if (reason === "field_grant_missing") return "acesso ao campo não concedido";
  if (reason === "field_unavailable") return "campo indisponível";
  if (reason === "capability_missing") return `permissões ausentes: ${capabilities.map((item) => capabilityLabels[item] || item).join(", ")}`;
  return "acesso insuficiente";
}

function schemaBlockMessage(reason: string) {
  if (reason === "schema_grant_missing") return "acesso ao schema não concedido";
  if (reason === "schema_unavailable") return "schema indisponível";
  return "um ou mais campos não estão disponíveis";
}

interface ReportAccessBlockPanelProps {
  blockedSchemas: BlockedReportSchema[];
  title?: string;
  description?: string;
}

export function ReportAccessBlockPanel({
  blockedSchemas,
  title = "Este relatório não pode ser executado",
  description = "Solicite a um administrador acesso aos schemas e campos abaixo.",
}: ReportAccessBlockPanelProps) {
  return <section className="report-execution-block" role="alert" aria-labelledby="report-access-block-title">
    <div className="report-execution-block__header"><AlertTriangle size={20}/><div><strong id="report-access-block-title">{title}</strong><span>{description}</span></div></div>
    <ul className="report-execution-block__schemas">{blockedSchemas.map((schema) => <li key={schema.schemaId}>
      <div><strong>{schema.schemaName || "Schema sem nome"}</strong><code>{schema.schemaId}</code><span>{schemaBlockMessage(schema.reason)}</span></div>
      {schema.blockedFields.length > 0 && <ul>{schema.blockedFields.map((field) => <li key={field.fieldId}><span><strong>{field.fieldName || "Campo sem nome"}</strong> — {fieldBlockMessage(field.reason, field.missingCapabilities)}</span><code>{field.fieldId}</code></li>)}</ul>}
    </li>)}</ul>
  </section>;
}
