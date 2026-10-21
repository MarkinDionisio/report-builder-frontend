import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CopyPlus, Database, Edit2, FileInput, Layers, MoreHorizontal, Trash2 } from "lucide-react";
import "./DataSourceActions.css";

interface Props {
  name: string;
  isEnabled: boolean;
  onIntrospect: () => void;
  onEdit: () => void;
  onBootstrap: () => void;
  onSaveTemplate: () => void;
  onApplyTemplate: () => void;
  onDelete: () => void;
}

function menuPosition(trigger: HTMLButtonElement) {
  const rect = trigger.getBoundingClientRect();
  const width = Math.min(272, window.innerWidth - 32);
  const height = Math.min(216, window.innerHeight - 32);
  return {
    width,
    left: Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16)),
    top: Math.max(16, rect.bottom + height + 8 <= window.innerHeight - 16 ? rect.bottom + 8 : rect.top - height - 8),
  };
}

export function DataSourceActions(props: Props) {
  const menuId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const open = position !== null;

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setPosition(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setPosition(null); trigger.current?.focus(); }
    };
    const reposition = (event: Event) => {
      if (event.type === "scroll" && menu.current?.contains(event.target as Node)) return;
      if (trigger.current) setPosition(menuPosition(trigger.current));
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  function toggle() {
    if (position) { setPosition(null); return; }
    setPosition(menuPosition(trigger.current!));
  }

  function select(action: () => void) {
    setPosition(null);
    trigger.current?.focus();
    action();
  }

  return <div className="data-source-actions" role="group" aria-label={`Ações de ${props.name}`}>
    <button className="btn btn-secondary data-source-actions__primary" onClick={props.onIntrospect}>
      <Database size={14} /> Introspecção
    </button>
    <button className="btn-icon" title="Editar DataSource" aria-label={`Editar ${props.name}`} onClick={props.onEdit}><Edit2 size={16} /></button>
    <button ref={trigger} className="btn-icon" title="Mais ações" aria-label={`Mais ações de ${props.name}`} aria-haspopup="menu" aria-expanded={Boolean(position)} aria-controls={position ? menuId : undefined} onClick={toggle}><MoreHorizontal size={18} /></button>
    {position && createPortal(<div ref={menu} id={menuId} className="data-source-actions-menu" role="menu" aria-label={`Mais ações de ${props.name}`} style={position}
      onKeyDown={event => {
        if (event.key === "Tab") { setPosition(null); return; }
        const items = [...menu.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
        const index = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === "ArrowDown" ? (index + 1) % items.length : event.key === "ArrowUp" ? (index - 1 + items.length) % items.length : event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : null;
        if (next !== null) { event.preventDefault(); items[next].focus(); }
      }}>
      <button role="menuitem" disabled={!props.isEnabled} onClick={() => select(props.onApplyTemplate)}><FileInput size={16} />Aplicar template</button>
      <button role="menuitem" onClick={() => select(props.onSaveTemplate)}><CopyPlus size={16} />Salvar catálogo como template</button>
      <button role="menuitem" onClick={() => select(props.onBootstrap)}><Layers size={16} />Bootstrap em massa</button>
      <div role="separator" />
      <button role="menuitem" className="data-source-actions-menu__danger" onClick={() => select(props.onDelete)}><Trash2 size={16} />Excluir fonte de dados</button>
    </div>, document.body)}
  </div>;
}
