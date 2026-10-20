import { useEffect, useId, useRef, useState } from "react";
import { DayPicker } from "@daypicker/react";
import { ptBR } from "@daypicker/react/locale";
import { CalendarDays, X } from "lucide-react";

interface Props {
  type: "date" | "datetime";
  value?: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  placeholder?: string;
  required?: boolean;
}

export function DatePickerInput({ type, value = "", onChange, ariaLabel, placeholder, required }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dialogId = useId();
  const selected = parseValue(type, value);
  const time = selected ? `${pad(selected.getHours())}:${pad(selected.getMinutes())}` : "00:00";

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const selectDate = (date: Date | undefined) => {
    if (!date) return;
    if (type === "date") {
      onChange(toDateValue(date));
      setOpen(false);
      return;
    }
    const [hours, minutes] = time.split(":").map(Number);
    onChange(new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes).toISOString());
  };

  const setTime = (raw: string) => {
    const date = selected ?? new Date();
    const [hours, minutes] = raw.split(":").map(Number);
    onChange(new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes).toISOString());
  };

  return <div className="date-picker" ref={containerRef}>
    <button
      type="button"
      className="form-input date-picker__trigger"
      aria-label={ariaLabel}
      aria-expanded={open}
      aria-controls={dialogId}
      onClick={() => setOpen((current) => !current)}
    >
      <span className={selected ? undefined : "date-picker__placeholder"}>{selected ? formatDisplay(type, selected) : placeholder || (type === "date" ? "Selecione uma data" : "Selecione data e hora")}</span>
      <CalendarDays size={17} aria-hidden="true" />
    </button>
    {required && <input className="date-picker__required" tabIndex={-1} required value={value} onChange={() => undefined} aria-hidden="true" />}
    {selected && <button type="button" className="date-picker__clear" aria-label={`Limpar ${ariaLabel || "data"}`} onClick={() => onChange("")}><X size={15} /></button>}
    {open && <div id={dialogId} role="dialog" aria-label={ariaLabel || "Selecionar data"} className="date-picker__popover">
      <DayPicker mode="single" defaultMonth={selected} selected={selected} onSelect={selectDate} locale={ptBR} captionLayout="dropdown" startMonth={new Date(2000, 0)} endMonth={new Date(2100, 11)} />
      {type === "datetime" && <div className="date-picker__time">
        <label htmlFor={`${dialogId}-time`}>Horário</label>
        <input id={`${dialogId}-time`} className="form-input" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        <button type="button" className="btn btn-primary" onClick={() => setOpen(false)}>Concluir</button>
      </div>}
    </div>}
  </div>;
}

function parseValue(type: Props["type"], value: string): Date | undefined {
  if (!value) return undefined;
  if (type === "date") {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!match) return undefined;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toDateValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDisplay(type: Props["type"], date: Date): string {
  const formattedDate = new Intl.DateTimeFormat("pt-BR").format(date);
  return type === "datetime" ? `${formattedDate} ${pad(date.getHours())}:${pad(date.getMinutes())}` : formattedDate;
}

function pad(value: number): string { return String(value).padStart(2, "0"); }
