import React, { useState } from "react";
import { GripVertical, X, ArrowUp, ArrowDown } from "lucide-react";

interface OrderByItem {
  fieldId?: string;
  joinAlias?: string;
  target?: string;
  direction: "asc" | "desc";
  aggregation?: string;
}

interface OrderByCompatibility {
  compatible: boolean;
  reason?: string;
}

interface OrderByRowProps {
  index: number;
  orderBy: OrderByItem;
  fieldOptions: Array<{ label: string; fieldId: string; joinAlias: string; aggregation?: string }>;
  compat: OrderByCompatibility;
  backendWarning?: { message: string } | null;
  onUpdate: (index: number, key: string, value: any) => void;
  onRemove: (index: number) => void;
  /** Drag & Drop handlers */
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  isDragOver: boolean;
  dragPosition: "above" | "below" | null;
}

/**
 * A single order-by row with drag handle, numbering, direction toggle,
 * delete confirmation, and compatibility warnings.
 */
export const OrderByRow: React.FC<OrderByRowProps> = ({
  index,
  orderBy: o,
  fieldOptions,
  compat,
  backendWarning,
  onUpdate,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
  dragPosition,
}) => {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleRemoveClick = () => {
    // Always confirm since order-by always has a field selected
    setConfirmingDelete(true);
  };

  // Confirmation state UI
  if (confirmingDelete) {
    return (
      <div>
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
            Remover ordenação #{index + 1}?
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
      </div>
    );
  }

  const hasWarning = !compat.compatible || backendWarning;

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
      >
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            background: isDragOver ? "rgba(99, 102, 241, 0.05)" : "var(--surface-color)",
            padding: "0.5rem 0.75rem",
            borderRadius: "8px",
            border: `1px solid ${hasWarning ? "var(--warning-500)" : isDragOver ? "var(--primary-500)" : "var(--border-color)"}`,
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

          {/* Number badge + ORDER BY / THEN BY label */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", minWidth: "90px", flexShrink: 0 }}>
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
            <span style={{ fontWeight: 600, color: "var(--primary-400)", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
              {index === 0 ? "ORDER BY" : "THEN BY"}
            </span>
          </div>

          {/* Field selector */}
          <select
            className="form-input"
            style={{
              flex: 2,
              padding: "0.5rem",
              borderColor: hasWarning ? "var(--warning-500)" : undefined,
            }}
            value={`${(o as any).target === "rows" ? "ROWS" : o.fieldId}|${o.joinAlias || ""}|${o.aggregation || ""}`}
            onChange={(e) => onUpdate(index, "field", e.target.value)}
          >
            {fieldOptions.map((opt: any) => (
              <option
                key={`${opt.fieldId}|${opt.joinAlias}|${opt.aggregation || ""}`}
                value={`${opt.fieldId}|${opt.joinAlias}|${opt.aggregation || ""}`}
              >
                {opt.label}
              </option>
            ))}
          </select>

          {/* Direction toggle */}
          <button
            className="btn btn-secondary"
            style={{ padding: "0.5rem", flexShrink: 0 }}
            title={o.direction === "asc" ? "Ascending (A-Z)" : "Descending (Z-A)"}
            onClick={() => onUpdate(index, "direction", o.direction === "asc" ? "desc" : "asc")}
          >
            {o.direction === "asc" ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
          </button>

          {/* Delete button */}
          <button
            className="btn-icon"
            title="Remove order"
            style={{ color: "var(--danger-500)", padding: "0.25rem", flexShrink: 0 }}
            onClick={handleRemoveClick}
          >
            <X size={16} />
          </button>
        </div>

        {/* Warning message */}
        {hasWarning && (
          <div style={{ fontSize: "0.8rem", color: "var(--warning-500)", marginTop: "0.25rem", marginLeft: "2rem" }}>
            {backendWarning
              ? backendWarning.message
              : `Field ignored or incompatible with the current query shape (${compat.reason})`}
          </div>
        )}
      </div>
    </div>
  );
};
