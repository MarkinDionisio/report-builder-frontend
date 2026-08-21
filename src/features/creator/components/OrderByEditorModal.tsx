import { useState } from "react";
import { X } from "lucide-react";
import { SearchableFieldSelect } from "./SearchableFieldSelect";

export interface OrderByOption {
  label: string;
  fieldId: string;
  joinAlias: string;
  aggregation?: string;
  group?: string;
}

export interface OrderByDraft {
  fieldId?: string;
  joinAlias?: string;
  target?: "rows";
  aggregation?: string;
  direction: "asc" | "desc";
}

interface Props {
  orderBy?: OrderByDraft;
  options: OrderByOption[];
  onClose: () => void;
  onSave: (orderBy: OrderByDraft) => void;
}

const optionValue = (option: OrderByOption) => `${option.fieldId}|${option.joinAlias}|${option.aggregation || ""}`;
const draftValue = (draft?: OrderByDraft) => draft ? `${draft.target === "rows" ? "ROWS" : draft.fieldId || ""}|${draft.joinAlias || ""}|${draft.aggregation || ""}` : "";

export function OrderByEditorModal({ orderBy, options, onClose, onSave }: Props) {
  const [fieldKey, setFieldKey] = useState(draftValue(orderBy));
  const [direction, setDirection] = useState<"asc" | "desc">(orderBy?.direction || "asc");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!fieldKey) return;
    const [fieldId, joinAlias, aggregation] = fieldKey.split("|");
    onSave(fieldId === "ROWS"
      ? { target: "rows", aggregation: aggregation || "count", direction }
      : { fieldId, ...(joinAlias ? { joinAlias } : {}), ...(aggregation ? { aggregation } : {}), direction });
  };

  return <div className="modal-backdrop filter-editor-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-container order-editor" role="dialog" aria-modal="true" aria-labelledby="order-editor-title">
      <div className="modal-header"><div><h2 id="order-editor-title">{orderBy ? "Editar ordenação" : "Adicionar ordenação"}</h2><p>Escolha o campo e a direção em que os resultados serão organizados.</p></div><button type="button" className="btn-icon" aria-label="Fechar editor de ordenação" onClick={onClose}><X size={20}/></button></div>
      <form onSubmit={submit}>
        <div className="order-editor__body">
          <div className="filter-editor__control"><label className="form-label">Campo *</label><SearchableFieldSelect options={options.map((option) => ({ ...option, value: optionValue(option) }))} value={fieldKey} onChange={setFieldKey} placeholder="Selecione o campo para ordenar..." inlineMenu/></div>
          <div className="filter-editor__control"><label className="form-label" htmlFor="order-editor-direction">Direção *</label><select id="order-editor-direction" className="form-input" value={direction} onChange={(event) => setDirection(event.target.value as "asc" | "desc")}><option value="asc">Crescente (A–Z / menor–maior)</option><option value="desc">Decrescente (Z–A / maior–menor)</option></select></div>
        </div>
        <div className="filter-editor__footer"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={!fieldKey}>Salvar ordenação</button></div>
      </form>
    </div>
  </div>;
}
