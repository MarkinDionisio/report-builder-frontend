import React, { useState } from "react";
import { Calendar, Copy, GripVertical, Hash, Pencil, Type, X } from "lucide-react";
import type { ReportParameterDefinition, WhereNode } from "../types/creatorTypes";
import { PERIOD_PRESETS } from "../utils/filterParameterUtils";
import { fieldKindFromType, operatorLabel } from "../utils/filterOperatorUtils";

interface Props {
  index: number;
  condition: WhereNode;
  fieldName: string;
  fieldType: string;
  parameters: ReportParameterDefinition[];
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => void;
  onDragStart: (index: number) => void;
  onDragOver: (event: React.DragEvent, index: number) => void;
  onDrop: (event: React.DragEvent, index: number) => void;
  isDragOver: boolean;
  dragPosition: "above" | "below" | null;
}

export const FilterRow: React.FC<Props> = ({ index, condition, fieldName, fieldType, parameters, onEdit, onRemove, onDuplicate, onDragStart, onDragOver, onDrop, isDragOver, dragPosition }) => {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const summary = summarizeFilter(condition, parameters, fieldType);
  const displayName = condition.ui?.kind === "relativePeriod" && condition.ui.label ? condition.ui.label : fieldName;

  if (confirmingDelete) return <div className="filter-summary filter-summary--confirm">
    <span>Remover o filtro “{fieldName}”?</span>
    <div className="filter-summary__actions">
      <button type="button" className="btn btn-secondary" onClick={() => setConfirmingDelete(false)}>Cancelar</button>
      <button type="button" className="btn filter-summary__danger" onClick={() => onRemove(index)}>Remover</button>
    </div>
  </div>;

  return <div style={{ position: "relative" }}>
    {isDragOver && dragPosition === "above" && <div className="filter-summary__drop filter-summary__drop--above" />}
    {isDragOver && dragPosition === "below" && <div className="filter-summary__drop filter-summary__drop--below" />}
    <div className={`filter-summary${isDragOver ? " filter-summary--drag-over" : ""}`} draggable onDragStart={() => onDragStart(index)} onDragOver={(event) => onDragOver(event, index)} onDrop={(event) => onDrop(event, index)}>
      <div className="filter-summary__identity">
        <GripVertical size={16} className="filter-summary__drag" />
        <span className="filter-summary__number">#{index + 1}</span>
        <span className="filter-summary__conjunction">{index === 0 ? "WHERE" : "AND"}</span>
      </div>
      <div className="filter-summary__icon">{fieldIcon(fieldType)}</div>
      <div className="filter-summary__content">
        <strong className="filter-summary__field" title={displayName}>{displayName}</strong>
        <span className="filter-summary__sentence">{summary.operator} <b>{summary.value}</b></span>
      </div>
      <span className={`filter-summary__badge filter-summary__badge--${summary.mode}`}>{summary.modeLabel}</span>
      <div className="filter-summary__actions">
        <button type="button" className="btn-icon" aria-label={`Editar filtro ${fieldName}`} title="Editar filtro" onClick={() => onEdit(index)}><Pencil size={15} /></button>
        <button type="button" className="btn-icon" aria-label={`Duplicar filtro ${fieldName}`} title="Duplicar filtro" onClick={() => onDuplicate(index)}><Copy size={15} /></button>
        <button type="button" className="btn-icon filter-summary__remove" aria-label={`Remover filtro ${fieldName}`} title="Remover filtro" onClick={() => setConfirmingDelete(true)}><X size={16} /></button>
      </div>
    </div>
  </div>;
};

function summarizeFilter(condition: WhereNode, parameters: ReportParameterDefinition[], fieldType: string) {
  if (condition.ui?.kind === "relativePeriod") {
    const preset = PERIOD_PRESETS.find((item) => item.value === condition.ui?.preset)?.label || condition.ui.preset;
    return { operator: "Período", value: preset, mode: "automatic", modeLabel: "Automático" } as const;
  }
  const parameterName = getParameterName(condition.value);
  const parameter = parameters.find((item) => item.name === parameterName);
  if (parameter?.source === "system") return { operator: "Data", value: "Hoje", mode: "automatic", modeLabel: "Automático" } as const;
  if (parameter) return { operator: operatorLabel(condition.operator, fieldKindFromType(fieldType)), value: parameter.label || "Informado na execução", mode: "input", modeLabel: "Perguntar ao executar" } as const;
  return { operator: operatorLabel(condition.operator, fieldKindFromType(fieldType)), value: formatValue(condition.value, fieldType), mode: "fixed", modeLabel: "Valor fixo" } as const;
}

function getParameterName(value: unknown): string | undefined {
  return value && typeof value === "object" && !Array.isArray(value) && "parameter" in value ? String((value as { parameter: string }).parameter) : undefined;
}

function formatValue(value: unknown, fieldType: string): string {
  if (value === undefined || value === null || value === "") return "Sem valor";
  if (Array.isArray(value)) {
    const formatted = value.map((item) => formatScalar(item, fieldType));
    return formatted.length === 2 ? `${formatted[0]} e ${formatted[1]}` : formatted.join(", ");
  }
  return formatScalar(value, fieldType);
}

function formatScalar(value: unknown, fieldType: string): string {
  if ((fieldType.includes("date") || fieldType.includes("timestamp")) && typeof value === "string") {
    const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
    if (!Number.isNaN(date.getTime())) return new Intl.DateTimeFormat("pt-BR", fieldType.includes("time") || fieldType.includes("timestamp") ? { dateStyle: "short", timeStyle: "short" } : { dateStyle: "short" }).format(date);
  }
  return String(value);
}

function fieldIcon(fieldType: string) {
  const normalized = fieldType.toLowerCase();
  if (normalized.includes("date") || normalized.includes("time")) return <Calendar size={16} />;
  if (["int", "decimal", "numeric", "float", "double", "number", "real"].some((type) => normalized.includes(type))) return <Hash size={16} />;
  return <Type size={16} />;
}
