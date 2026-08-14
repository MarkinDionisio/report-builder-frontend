import type { FieldReference, ReportPresentation, SelectItem } from "../types/creatorTypes";
import { aggregatedColumns, canUseMetric } from "../utils/reportPresentationUtils";

interface Props {
  presentation?: ReportPresentation;
  select: SelectItem[];
  groupBy?: FieldReference[];
  onChange: (presentation: ReportPresentation) => void;
}

export function ReportPresentationEditor({ presentation = { type: "table" }, select, groupBy = [], onChange }: Props) {
  const metricOptions = aggregatedColumns(select);
  const metricAvailable = canUseMetric(select, groupBy);
  return <div className="card" style={{ marginBottom: "1rem" }}><h4 style={{ marginTop: 0 }}>Apresentação</h4><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: ".75rem" }}>
    <label><span className="form-label">Tipo de apresentação</span><select aria-label="Tipo de apresentação" className="form-input" value={presentation.type} onChange={(event) => { if (event.target.value === "metric") { const alias = metricOptions[0]?.alias; if (alias) onChange({ type: "metric", valueColumnAlias: alias, label: alias }); } else onChange({ type: "table" }); }}><option value="table">Tabela</option><option value="metric" disabled={!metricAvailable}>Indicador</option></select></label>
    {presentation.type === "metric" && <><label><span className="form-label">Coluna do valor</span><select aria-label="Coluna do valor" className="form-input" value={presentation.valueColumnAlias} onChange={(event) => onChange({ ...presentation, valueColumnAlias: event.target.value })}>{metricOptions.map((item) => <option key={item.alias} value={item.alias}>{item.alias}</option>)}</select></label><label><span className="form-label">Label do indicador</span><input aria-label="Label do indicador" className="form-input" value={presentation.label || ""} placeholder={presentation.valueColumnAlias} onChange={(event) => onChange({ ...presentation, label: event.target.value })}/></label></>}
    {!metricAvailable && <small style={{ color: "var(--text-muted)", alignSelf: "end" }}>Indicadores exigem apenas colunas agregadas e nenhum agrupamento.</small>}
  </div></div>;
}
