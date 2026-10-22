import { X } from "lucide-react";

/** Clear only the text, keeping other filters and returning focus to the search input. */
export function ClearSearchButton({value,onClear}:{value:string;onClear:()=>void}) {
  if(!value)return null;
  return <button type="button" className="search-clear-button search-clear-button--overlay" aria-label="Limpar busca" title="Limpar busca" onClick={event=>{
    const input=event.currentTarget.parentElement?.querySelector<HTMLInputElement>("input");
    onClear();input?.focus({preventScroll:true});
  }}><X size={16} aria-hidden="true"/></button>;
}
