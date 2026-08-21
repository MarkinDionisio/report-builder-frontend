import { useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Pencil, X } from "lucide-react";
import type { OrderByDraft, OrderByOption } from "./OrderByEditorModal";

interface Props {
  index: number;
  orderBy: OrderByDraft;
  options: OrderByOption[];
  warning?: string;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  onDragStart: (index: number) => void;
  onDragOver: (event: React.DragEvent, index: number) => void;
  onDrop: (event: React.DragEvent, index: number) => void;
  isDragOver: boolean;
  dragPosition: "above" | "below" | null;
}

export function OrderBySummaryRow({ index, orderBy, options, warning, onEdit, onRemove, onDragStart, onDragOver, onDrop, isDragOver, dragPosition }: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const selected = options.find((option) => option.fieldId === (orderBy.target === "rows" ? "ROWS" : orderBy.fieldId) && option.joinAlias === (orderBy.joinAlias || "") && (option.aggregation || "") === (orderBy.aggregation || ""));
  const fieldName = selected?.label || "Campo indisponível";
  if (confirmingDelete) return <div className="filter-summary filter-summary--confirm"><span>Remover a ordenação “{fieldName}”?</span><div className="filter-summary__actions"><button type="button" className="btn btn-secondary" onClick={() => setConfirmingDelete(false)}>Cancelar</button><button type="button" className="btn filter-summary__danger" onClick={() => onRemove(index)}>Remover</button></div></div>;

  return <div className="order-summary-wrap">
    {isDragOver && dragPosition === "above" && <div className="filter-summary__drop filter-summary__drop--above"/>}
    {isDragOver && dragPosition === "below" && <div className="filter-summary__drop filter-summary__drop--below"/>}
    <div className={`filter-summary order-summary${isDragOver ? " filter-summary--drag-over" : ""}${warning ? " order-summary--warning" : ""}`} draggable onDragStart={() => onDragStart(index)} onDragOver={(event) => onDragOver(event, index)} onDrop={(event) => onDrop(event, index)}>
      <div className="filter-summary__identity"><GripVertical size={16} className="filter-summary__drag"/><span className="filter-summary__number">#{index + 1}</span><span className="filter-summary__conjunction">{index === 0 ? "ORDENAR POR" : "DEPOIS POR"}</span></div>
      <div className="filter-summary__icon">{orderBy.direction === "asc" ? <ArrowUp size={16}/> : <ArrowDown size={16}/>}</div>
      <div className="filter-summary__content"><strong className="filter-summary__field" title={fieldName}>{fieldName}</strong><span className="filter-summary__sentence">Ordem <b>{orderBy.direction === "asc" ? "crescente" : "decrescente"}</b></span>{warning && <small className="order-summary__warning">{warning}</small>}</div>
      <span className="filter-summary__badge filter-summary__badge--fixed">{orderBy.direction === "asc" ? "A–Z / menor–maior" : "Z–A / maior–menor"}</span>
      <div className="filter-summary__actions"><button type="button" className="btn-icon" aria-label={`Editar ordenação ${fieldName}`} title="Editar ordenação" onClick={() => onEdit(index)}><Pencil size={15}/></button><button type="button" className="btn-icon filter-summary__remove" aria-label={`Remover ordenação ${fieldName}`} title="Remover ordenação" onClick={() => setConfirmingDelete(true)}><X size={16}/></button></div>
    </div>
  </div>;
}
