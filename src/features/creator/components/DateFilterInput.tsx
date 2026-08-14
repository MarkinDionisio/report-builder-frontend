interface DateFilterInputProps {
  operator: string;
  value: unknown;
  fieldType: "date" | "datetime" | "time" | "string";
  onChange: (value: unknown) => void;
  onOperatorChange: (operator: string) => void;
}

export function DateFilterInput({ operator, value, fieldType, onChange }: DateFilterInputProps) {
  const isBetween = operator === "between";
  const values = Array.isArray(value) ? value : [value ?? "", ""];
  const normalize = (raw: string) => fieldType === "time" && raw.length === 5 ? `${raw}:00` : raw;
  const display = (raw: unknown) => {
    if (!raw) return "";
    if (fieldType === "datetime") {
      const date = new Date(String(raw));
      const offset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    }
    return String(raw).slice(0, fieldType === "time" ? 5 : 10);
  };
  if (fieldType === "time" || fieldType === "string") return <div style={{ flex: 1, display: "flex", gap: ".4rem", alignItems: "center" }}>
    <input className="form-input" type={fieldType === "time" ? "time" : "text"} value={display(values[0])} onChange={(e) => onChange(isBetween ? [normalize(e.target.value), values[1]] : normalize(e.target.value))} />
    {isBetween && <><span>até</span><input className="form-input" type={fieldType === "time" ? "time" : "text"} value={display(values[1])} onChange={(e) => onChange([values[0], normalize(e.target.value)])} /></>}
  </div>;
  return <div style={{ flex: 1, display: "flex", gap: ".4rem", alignItems: "center" }}>
    <DatePickerInput type={fieldType} value={String(values[0] || "")} ariaLabel="Data inicial" onChange={(next) => onChange(isBetween ? [next, values[1]] : next)} />
    {isBetween && <><span>até</span><DatePickerInput type={fieldType} value={String(values[1] || "")} ariaLabel="Data final" onChange={(next) => onChange([values[0], next])} /></>}
  </div>;
}
import { DatePickerInput } from "./DatePickerInput";
