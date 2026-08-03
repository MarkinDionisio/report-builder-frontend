import React, { useState, useEffect } from "react";


interface DateFilterInputProps {
  operator: string;
  value: any;
  fieldType: "date" | "datetime" | "time" | "string";
  onChange: (val: any) => void;
  onOperatorChange: (op: string) => void;
}

const PREDEFINED_RANGES = [
  { id: "custom", label: "Customizado" },
  { id: "today", label: "Hoje" },
  { id: "yesterday", label: "Ontem" },
  { id: "last7days", label: "Últimos 7 Dias" },
  { id: "last30days", label: "Últimos 30 Dias" },
  { id: "thisMonth", label: "Este Mês" },
  { id: "lastMonth", label: "Mês Passado" },
];

export function DateFilterInput({ operator, value, fieldType, onChange, onOperatorChange }: DateFilterInputProps) {
  const isBetween = operator === "between";
  const valArray = Array.isArray(value) ? value : [value || "", ""];
  
  const getDisplayValue = (val: string) => {
    if (typeof val === "string" && val.includes("T") && !val.startsWith("{{")) {
      return val.split("T")[0];
    }
    // Se for uma variável dinâmica, não podemos mostrar num input type=date nativo!
    if (typeof val === "string" && val.startsWith("{{")) {
      return ""; // Deixaremos vazio o input customizado pois não é modo custom
    }
    return val || "";
  };

  const determineMode = (arr: any[]) => {
    const s = String(arr[0] || "");
    const e = String(arr[1] || "");
    
    if (s === "{{Today}}" && (e === "{{Today}}" || e === "")) return "today";
    if (s === "{{Yesterday}}" && (e === "{{Yesterday}}" || e === "")) return "yesterday";
    if (s === "{{Last7Days}}" && e === "{{Today}}") return "last7days";
    if (s === "{{Last30Days}}" && e === "{{Today}}") return "last30days";
    if (s === "{{FirstDayOfMonth}}" && e === "{{LastDayOfMonth}}") return "thisMonth";
    if (s === "{{FirstDayOfLastMonth}}" && e === "{{LastDayOfLastMonth}}") return "lastMonth";
    
    return "custom";
  };

  const [mode, setMode] = useState<string>(determineMode(valArray));
  const [customStart, setCustomStart] = useState<string>(getDisplayValue(valArray[0]));
  const [customEnd, setCustomEnd] = useState<string>(getDisplayValue(valArray[1]));
  const [error, setError] = useState<string>("");

  useEffect(() => {
    setMode(determineMode(valArray));
    setCustomStart(getDisplayValue(valArray[0]));
    setCustomEnd(getDisplayValue(valArray[1]));
  }, [value]);

  const applyRange = (startVar: string, endVar: string) => {
    if (!isBetween && startVar !== endVar) {
      onOperatorChange("between");
    }
    // Se não for between e as variáveis forem idênticas (ex: Hoje),
    // podemos enviar apenas a string solta. Mas enviar o array pro onChange tbm
    // funciona, o pai tratará? O pai aceita array pra between.
    // Pra garantir retrocompatibilidade com =
    if (isBetween || startVar !== endVar) {
       onChange([startVar, endVar]);
    } else {
       onChange(startVar);
    }
  };

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMode = e.target.value;
    setMode(newMode);

    switch (newMode) {
      case "today":
        applyRange("{{Today}}", "{{Today}}");
        break;
      case "yesterday":
        applyRange("{{Yesterday}}", "{{Yesterday}}");
        break;
      case "last7days":
        applyRange("{{Last7Days}}", "{{Today}}");
        break;
      case "last30days":
        applyRange("{{Last30Days}}", "{{Today}}");
        break;
      case "thisMonth":
        applyRange("{{FirstDayOfMonth}}", "{{LastDayOfMonth}}");
        break;
      case "lastMonth":
        applyRange("{{FirstDayOfLastMonth}}", "{{LastDayOfLastMonth}}");
        break;
      case "custom":
        if (isBetween) {
          onChange([customStart, customEnd]);
        } else {
          onChange(customStart);
        }
        break;
    }
  };

  const handleCustomChange = (type: "start" | "end", val: string) => {
    const newStart = type === "start" ? val : customStart;
    const newEnd = type === "end" ? val : customEnd;
    
    setCustomStart(newStart);
    setCustomEnd(newEnd);

    if (isBetween) {
      if (newStart && newEnd && newStart > newEnd) {
        setError("Data Final deve ser maior ou igual à Data Inicial.");
      } else {
        setError("");
        let finalEnd = newEnd;
        if (fieldType === "datetime" && newEnd && newEnd.length === 10) {
          finalEnd = `${newEnd}T23:59:59`;
        }
        onChange([newStart, finalEnd]);
      }
    } else {
      let finalVal = newStart;
      if (fieldType === "datetime" && newStart && newStart.length === 10 && (operator === "<=" || operator === "=")) {
         finalVal = `${newStart}T23:59:59`;
      }
      onChange(finalVal);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: 0 }}>
      <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
        <select 
          className="form-input" 
          style={{ width: "150px", minWidth: "150px", flexShrink: 0, display: isBetween ? "block" : "none", padding: "0.5rem" }}
          value={mode}
          onChange={handleModeChange}
        >
          {PREDEFINED_RANGES.map(r => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>

        {(mode === "custom" || !isBetween) && (
          <div style={{ display: "flex", flex: 1, gap: "0.25rem", alignItems: "center", minWidth: "270px" }}>
            <div style={{ position: "relative", flex: 1, minWidth: "125px" }}>
              <input 
                type="date"
                className="form-input"
                style={{ width: "100%", padding: "0.5rem 0.25rem" }}
                value={customStart}
                onChange={(e) => handleCustomChange("start", e.target.value)}
              />
            </div>

            {isBetween && (
              <>
                <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 500, whiteSpace: "nowrap" }}>até</span>
                <div style={{ position: "relative", flex: 1, minWidth: "125px" }}>
                  <input 
                    type="date"
                    className="form-input"
                    style={{ width: "100%", padding: "0.5rem 0.25rem", borderColor: error ? "var(--danger-500)" : undefined }}
                    value={customEnd}
                    onChange={(e) => handleCustomChange("end", e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {error && <span style={{ color: "var(--danger-500)", fontSize: "0.8rem", marginTop: "0.25rem" }}>{error}</span>}
    </div>
  );
}
