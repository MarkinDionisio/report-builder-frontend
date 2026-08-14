import React, { useState } from "react";
import { GripVertical, Copy, X, Calendar, Hash, Type } from "lucide-react";
import { SearchableFieldSelect, type FieldOption } from "./SearchableFieldSelect";
import { DateFilterInput } from "./DateFilterInput";
import type { RelativePeriodPreset, ReportParameterDefinition } from "../types/creatorTypes";
import { PERIOD_PRESETS } from "../utils/filterParameterUtils";

interface FilterCondition {
  fieldId: string;
  joinAlias?: string;
  operator: string;
  value?: unknown;
  ui?: { kind: "relativePeriod"; preset: RelativePeriodPreset };
}

interface FilterRowProps {
  index: number;
  condition: FilterCondition;
  fieldOptions: FieldOption[];
  /** The resolved field metadata for this condition (reserved for future use) */
  field: unknown;
  isDate: boolean;
  isNumber: boolean;
  parsedFieldType: "date" | "datetime" | "time" | "string";
  allowedOps: string[];
  parameters: ReportParameterDefinition[];
  onValueModeChange: (index: number, mode: "fixed" | "input" | "automatic") => void;
  onParameterMetadataChange: (name: string, patch: Partial<ReportParameterDefinition>) => void;
  onPeriodPresetChange: (index: number, preset: RelativePeriodPreset) => void;
  onUpdate: (index: number, key: string, value: any) => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => void;
  /** Drag & Drop handlers */
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  isDragOver: boolean;
  dragPosition: "above" | "below" | null;
}

/**
 * Inline tags input for "in" operator values.
 */
const InlineTagsInput = ({ value, onChange }: { value: string[]; onChange: (val: string[]) => void }) => {
  const [inputValue, setInputValue] = useState("");
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = inputValue.trim();
      if (val && !value.includes(val)) {
        onChange([...value, val]);
      }
      setInputValue("");
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };
  return (
    <div
      className="form-input"
      style={{
        flex: 2,
        display: "flex",
        flexWrap: "wrap",
        gap: "0.25rem",
        padding: "0.25rem",
        minHeight: "38px",
        height: "auto",
      }}
    >
      {value.map((tag, i) => (
        <div
          key={i}
          style={{
            background: "var(--primary-100)",
            color: "var(--primary-700)",
            padding: "0.1rem 0.4rem",
            borderRadius: "4px",
            fontSize: "0.8rem",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
        >
          {tag}
          <X
            size={12}
            style={{ cursor: "pointer" }}
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
          />
        </div>
      ))}
      <input
        type="text"
        style={{
          border: "none",
          outline: "none",
          background: "transparent",
          flex: 1,
          minWidth: "80px",
          fontSize: "0.9rem",
          color: "var(--text-primary)",
        }}
        placeholder={value.length === 0 ? "Type and press Enter..." : ""}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          const val = inputValue.trim();
          if (val && !value.includes(val)) {
            onChange([...value, val]);
            setInputValue("");
          }
        }}
      />
    </div>
  );
};

/**
 * Returns a human-readable label for an operator.
 */
const getOpLabel = (op: string, isDate: boolean, _isNumber: boolean): string => {
  const normalizedOp = op.toLowerCase();
  switch (normalizedOp) {
    case "=":
    case "eq":
      return "= (É exatamente)";
    case "!=":
    case "neq":
      return "!= (É diferente de)";
    case "like":
    case "ilike":
      return "LIKE (Contém)";
    case "not like":
    case "not ilike":
      return "NOT LIKE (Não contém)";
    case "in":
      return "IN (É um de da lista)";
    case "not in":
      return "NOT IN (Não é nenhum da lista)";
    case "between":
      return "BETWEEN (Está entre)";
    case "isnull":
      return "IS NULL (Está vazio)";
    case "isnotnull":
      return "IS NOT NULL (Não está vazio)";
    case ">":
    case "gt":
      if (isDate) return "> (Depois de)";
      return "> (Maior que)";
    case "<":
    case "lt":
      if (isDate) return "< (Antes de)";
      return "< (Menor que)";
    case ">=":
    case "gte":
      if (isDate) return ">= (A partir de)";
      return ">= (Maior ou igual a)";
    case "<=":
    case "lte":
      if (isDate) return "<= (Até no máximo)";
      return "<= (Menor ou igual a)";
    default: return op;
  }
};

/**
 * Returns the appropriate icon component for a field type.
 */
const FieldTypeIcon: React.FC<{ isDate: boolean; isNumber: boolean }> = ({ isDate, isNumber }) => {
  if (isDate) return <Calendar size={13} style={{ color: "var(--primary-400)", flexShrink: 0 }} />;
  if (isNumber) return <Hash size={13} style={{ color: "var(--success-500, #22c55e)", flexShrink: 0 }} />;
  return <Type size={13} style={{ color: "var(--warning-500, #f59e0b)", flexShrink: 0 }} />;
};

/**
 * A single filter condition row with drag handle, numbering, type icon,
 * duplicate button, delete confirmation, and value inputs.
 */
export const FilterRow: React.FC<FilterRowProps> = ({
  index,
  condition: c,
  fieldOptions,
  field,
  isDate,
  isNumber,
  parsedFieldType,
  allowedOps,
  parameters,
  onValueModeChange,
  onParameterMetadataChange,
  onPeriodPresetChange,
  onUpdate,
  onRemove,
  onDuplicate,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
  dragPosition,
}) => {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const op = (c.operator || "").toLowerCase();
  const isNoValue = op === "isnull" || op === "isnotnull";
  const isBetween = op === "between";
  const isIn = op === "in" || op === "not in";
  const valArray = Array.isArray(c.value) ? c.value : [c.value || "", ""];
  const parameterName = c.value && typeof c.value === "object" && !Array.isArray(c.value) && "parameter" in c.value ? String((c.value as { parameter: string }).parameter) : "";
  const catalogType = String((field as { type?: string } | null)?.type || parsedFieldType).toLowerCase();
  const expectedType = (["string", "integer", "number", "boolean", "uuid", "date", "datetime", "time"].includes(catalogType) ? catalogType : isNumber ? "number" : parsedFieldType);
  const compatibleParameters = parameters.filter((parameter) => parameter.type === expectedType || (isNumber && parameter.type === "integer"));
  const selectedParameter = parameters.find((parameter) => parameter.name === parameterName);
  const valueMode = c.ui?.kind === "relativePeriod" || selectedParameter?.source === "system" ? "automatic" : parameterName ? "input" : "fixed";

  const hasValue = (() => {
    if (isNoValue) return false;
    if (Array.isArray(c.value)) return c.value.some((v) => v !== "");
    return c.value !== "" && c.value !== undefined && c.value !== null;
  })();

  const handleRemoveClick = () => {
    if (hasValue) {
      setConfirmingDelete(true);
    } else {
      onRemove(index);
    }
  };

  // Confirmation state UI
  if (confirmingDelete) {
    return (
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          background: "rgba(239, 68, 68, 0.08)",
          padding: "0.6rem 0.75rem",
          borderRadius: "8px",
          border: "1px solid var(--danger-500)",
          animation: "fadeIn 0.15s ease",
        }}
      >
        <span style={{ fontSize: "0.85rem", color: "var(--danger-500)", fontWeight: 500, flex: 1 }}>
          Remover filtro #{index + 1}?
        </span>
        <button
          className="btn btn-secondary"
          style={{ padding: "0.25rem 0.75rem", fontSize: "0.8rem" }}
          onClick={() => setConfirmingDelete(false)}
        >
          Não
        </button>
        <button
          className="btn"
          style={{
            padding: "0.25rem 0.75rem",
            fontSize: "0.8rem",
            background: "var(--danger-500)",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
          onClick={() => onRemove(index)}
        >
          Sim, remover
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Drop indicator line */}
      {isDragOver && dragPosition === "above" && (
        <div
          style={{
            position: "absolute",
            top: "-4px",
            left: 0,
            right: 0,
            height: "3px",
            background: "var(--primary-500)",
            borderRadius: "2px",
            zIndex: 10,
          }}
        />
      )}
      {isDragOver && dragPosition === "below" && (
        <div
          style={{
            position: "absolute",
            bottom: "-4px",
            left: 0,
            right: 0,
            height: "3px",
            background: "var(--primary-500)",
            borderRadius: "2px",
            zIndex: 10,
          }}
        />
      )}

      <div
        draggable
        onDragStart={() => onDragStart(index)}
        onDragOver={(e) => onDragOver(e, index)}
        onDrop={(e) => onDrop(e, index)}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          alignItems: "center",
          background: isDragOver ? "rgba(99, 102, 241, 0.05)" : "var(--surface-color)",
          padding: "0.5rem",
          borderRadius: "8px",
          border: `1px solid ${isDragOver ? "var(--primary-500)" : "var(--border-color)"}`,
          transition: "background 0.15s ease, border-color 0.15s ease",
        }}
      >
        {/* Drag handle */}
        <GripVertical
          size={16}
          style={{
            color: "var(--text-secondary)",
            cursor: "grab",
            flexShrink: 0,
            opacity: 0.5,
          }}
        />

        {/* Number badge + WHERE/AND label */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", minWidth: "70px", flexShrink: 0 }}>
          <span
            style={{
              fontSize: "0.65rem",
              color: "var(--text-secondary)",
              background: "var(--bg-primary)",
              padding: "0.1rem 0.3rem",
              borderRadius: "4px",
              fontWeight: 600,
              fontFamily: "monospace",
            }}
          >
            #{index + 1}
          </span>
          <span style={{ fontWeight: 600, color: "var(--primary-400)", fontSize: "0.85rem" }}>
            {index === 0 ? "WHERE" : "AND"}
          </span>
        </div>

        {/* Field type icon + Field selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", flex: 1, minWidth: "320px" }}>
          <FieldTypeIcon isDate={isDate} isNumber={isNumber} />
          <SearchableFieldSelect
            options={fieldOptions}
            value={`${c.fieldId}|${c.joinAlias || ""}`}
            onChange={(val) => onUpdate(index, "field", val)}
            placeholder="Select field..."
            style={{ flex: 1, minWidth: "100px" }}
          />
        </div>

        {/* Operator select */}
        {valueMode === "automatic" ? <div className="form-input" style={{ flex: 1, minWidth: "110px", padding: "0.5rem", color: "var(--text-secondary)" }}>Período</div> : <select
          className="form-input"
          style={{ flex: 1, minWidth: "110px", padding: "0.5rem" }}
          value={c.operator}
          onChange={(e) => onUpdate(index, "operator", e.target.value)}
        >
          {allowedOps.map((op: string) => (
            <option key={op} value={op}>
              {getOpLabel(op, isDate, isNumber)}
            </option>
          ))}
        </select>}

        {/* Value input area */}
        {!isNoValue && (
          <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: "0.4rem", minWidth: "220px" }}>
            <div style={{ display: "flex", gap: ".35rem", alignItems: "center" }}>
            {!isIn && !isBetween && <select className="form-input" aria-label="Como definir o valor?" style={{ maxWidth: "205px" }} value={valueMode} onChange={(e) => onValueModeChange(index, e.target.value as "fixed" | "input" | "automatic")}><option value="fixed">Valor fixo</option><option value="input">Perguntar ao executar</option>{isDate && parsedFieldType !== "time" && <option value="automatic">Data/período automático</option>}</select>}
            {valueMode === "automatic" ? <select className="form-input" value={c.ui?.preset || "today"} onChange={(e) => onPeriodPresetChange(index, e.target.value as RelativePeriodPreset)}>{(parsedFieldType === "date" ? PERIOD_PRESETS.filter((preset) => preset.value === "today") : PERIOD_PRESETS).map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}</select> : parameterName ? <span style={{ color: "var(--text-secondary)", fontSize: ".85rem" }}>O valor será solicitado antes da execução.</span> : isDate ? (
              <DateFilterInput
                operator={c.operator}
                value={c.value}
                fieldType={parsedFieldType}
                onChange={(val) => onUpdate(index, "value", val)}
                onOperatorChange={(op) => onUpdate(index, "operator", op)}
              />
            ) : isIn ? (
              <InlineTagsInput
                value={
                  Array.isArray(c.value)
                    ? c.value
                    : typeof c.value === "string"
                    ? c.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    : []
                }
                onChange={(newTags) => onUpdate(index, "value", newTags)}
              />
            ) : isBetween ? (
              <div style={{ flex: 1, display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <BoundValue value={valArray[0]} parameters={compatibleParameters} placeholder="Min..." onChange={(value) => onUpdate(index, "value", [value, valArray[1] || ""])} />
                <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>e</span>
                <BoundValue value={valArray[1]} parameters={compatibleParameters} placeholder="Max..." onChange={(value) => onUpdate(index, "value", [valArray[0] || "", value])} />
              </div>
            ) : (
              <input
                type="text"
                className="form-input"
                style={{ flex: 1 }}
                placeholder="Value..."
                value={(c.value as string) || ""}
                onChange={(e) => onUpdate(index, "value", e.target.value)}
              />
            )}
            </div>
            {valueMode === "input" && selectedParameter && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".35rem", padding: ".5rem", background: "var(--bg-primary)", borderRadius: 6 }}>
              <input className="form-input" aria-label="Rótulo para o usuário" placeholder="Rótulo exibido" value={selectedParameter.label || ""} onChange={(e) => onParameterMetadataChange(selectedParameter.name, { label: e.target.value })}/>
              <input className="form-input" aria-label="Exemplo do valor" placeholder="Exemplo ou placeholder" value={selectedParameter.placeholder || ""} onChange={(e) => onParameterMetadataChange(selectedParameter.name, { placeholder: e.target.value })}/>
              <input className="form-input" style={{ gridColumn: "1 / -1" }} aria-label="Texto de ajuda" placeholder="Explique o que deve ser informado (opcional)" value={selectedParameter.description || ""} onChange={(e) => onParameterMetadataChange(selectedParameter.name, { description: e.target.value })}/>
            </div>}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.15rem", flexShrink: 0 }}>
          <button
            className="btn-icon"
            title="Duplicate filter"
            style={{ color: "var(--text-secondary)", padding: "0.25rem" }}
            onClick={() => onDuplicate(index)}
          >
            <Copy size={14} />
          </button>
          <button
            className="btn-icon"
            title="Remove filter"
            style={{ color: "var(--danger-500)", padding: "0.25rem" }}
            onClick={handleRemoveClick}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

function BoundValue({ value, parameters, placeholder, onChange }: { value: unknown; parameters: ReportParameterDefinition[]; placeholder: string; onChange: (value: unknown) => void }) {
  const parameterName = value && typeof value === "object" && "parameter" in value ? String((value as { parameter: string }).parameter) : "";
  return <div style={{ flex: 1, display: "flex", gap: ".25rem" }}>
    {parameters.length > 0 && <select className="form-input" style={{ maxWidth: 105 }} value={parameterName ? "parameter" : "literal"} onChange={(e) => onChange(e.target.value === "parameter" ? { parameter: parameters[0].name } : "")}><option value="literal">Literal</option><option value="parameter">Parâmetro</option></select>}
    {parameterName ? <select className="form-input" value={parameterName} onChange={(e) => onChange({ parameter: e.target.value })}>{parameters.map((parameter) => <option key={parameter.name}>{parameter.name}</option>)}</select> : <input type="text" className="form-input" placeholder={placeholder} value={String(value || "")} onChange={(e) => onChange(e.target.value)} />}
  </div>;
}
