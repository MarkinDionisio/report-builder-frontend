import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import "../styles/dataSourceWorkspace.css";

/** Secondary actions stay anchored to their trigger, including inside scrollable tables. */
export function SourceActionMenu({ label = "Mais opções", children, disabled = false }: { label?: string; children: ReactNode; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 16, left: 16 });
  useLayoutEffect(() => {
    if (!open || !trigger.current || !popover.current) return;
    const anchor = trigger.current.getBoundingClientRect();
    const bounds = popover.current.getBoundingClientRect();
    popover.current.querySelector<HTMLElement>("button:not(:disabled),a[href],select:not(:disabled),input:not(:disabled)")?.focus({ preventScroll: true });
    setPosition({ left: Math.max(16, Math.min(anchor.right - bounds.width, window.innerWidth - bounds.width - 16)), top: Math.max(16, Math.min(anchor.bottom + 8, window.innerHeight - bounds.height - 16)) });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!trigger.current?.contains(event.target as Node) && !popover.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    const resize = () => setOpen(false);
    const scroll = () => {if (!trigger.current || !popover.current) return; const anchor=trigger.current.getBoundingClientRect(), bounds=popover.current.getBoundingClientRect();setPosition({left:Math.max(16,Math.min(anchor.right-bounds.width,window.innerWidth-bounds.width-16)),top:Math.max(16,Math.min(anchor.bottom+8,window.innerHeight-bounds.height-16))});};
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", scroll, true);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); window.removeEventListener("resize", resize); window.removeEventListener("scroll", scroll, true); };
  }, [open]);
  return <><button ref={trigger} type="button" className="btn btn-secondary source-action-menu__trigger" disabled={disabled} aria-expanded={open} onClick={() => {if(!open&&trigger.current){const anchor=trigger.current.getBoundingClientRect();const width=Math.min(288,window.innerWidth-32);setPosition({left:Math.max(16,Math.min(anchor.right-width,window.innerWidth-width-16)),top:Math.max(16,Math.min(anchor.bottom+8,window.innerHeight-64))});}setOpen(value => !value);}}>{label}<ChevronDown size={15} aria-hidden="true" /></button>
    {open && createPortal(<div ref={popover} role="group" aria-label={label} className="source-action-menu__popover" style={position} onClick={event => { const action = (event.target as HTMLElement).closest("button,a"); if (action && !action.hasAttribute("disabled")) { trigger.current?.focus({preventScroll:true}); setOpen(false); } }}>{children}</div>, document.body)}
  </>;
}
