import type { FieldReference, ReportPresentation, SelectItem } from "../types/creatorTypes";
import { aggregatedColumns, canUseMetric } from "../utils/reportPresentationUtils";
import { Info } from "lucide-react";

interface Props {
  presentation?: ReportPresentation;
  select: SelectItem[];
  groupBy?: FieldReference[];
  onChange: (presentation: ReportPresentation) => void;
}

export function ReportPresentationEditor({ presentation = { type: "table" }, select, groupBy = [], onChange }: Props) {
  const metricOptions = aggregatedColumns(select);
  const metricAvailable = canUseMetric(select, groupBy);
  return <div className="card presentation-editor"><h4>Apresentação</h4><div className="presentation-editor__grid">
    <div className="presentation-editor__type"><label><span className="form-label">Tipo de apresentação</span><select aria-label="Tipo de apresentação" className="form-input" value={presentation.type} onChange={(event) => { if (event.target.value === "metric") { const alias = metricOptions[0]?.alias; if (alias) onChange({ type: "metric", valueColumnAlias: alias, label: alias }); } else onChange({ type: "table" }); }}><option value="table">Tabela</option><option value="metric" disabled={!metricAvailable}>Indicador</option></select></label>
      {!metricAvailable && <div className="presentation-editor__hint" role="note"><Info size={17}/><span>Para usar um indicador, deixe apenas uma coluna com cálculo, como soma, média ou contagem. Remova as demais colunas selecionadas.</span></div>}
    </div>
    {presentation.type === "metric" && <><label><span className="form-label">Coluna do valor</span><select aria-label="Coluna do valor" className="form-input" value={presentation.valueColumnAlias} onChange={(event) => onChange({ ...presentation, valueColumnAlias: event.target.value })}>{metricOptions.map((item) => <option key={item.alias} value={item.alias}>{item.alias}</option>)}</select></label><label><span className="form-label">Label do indicador</span><input aria-label="Label do indicador" className="form-input" value={presentation.label || ""} placeholder={presentation.valueColumnAlias} onChange={(event) => onChange({ ...presentation, label: event.target.value })}/></label></>}
  </div></div>;
}
