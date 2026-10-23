import { Loader2 } from "lucide-react";
interface NeutralLoaderProps {
  message: string;
  title?: string;
  minHeight?: string;
  compact?: boolean;
}
/** A single accessible pattern for data loading, including compact regions. */
export function NeutralLoader({message,title="Carregando dados",minHeight,compact=false}:NeutralLoaderProps) {
  const Container=compact?"span":"div";
  return <Container aria-busy="true" role="status" aria-live="polite" aria-atomic="true" className={"data-loading"+(compact?" data-loading--compact":"")} style={minHeight?{minHeight}:undefined}>
    <Loader2 size={compact?16:24} className="animate-spin" aria-hidden="true"/>
    {compact?<span>{message}</span>:<div><strong>{title}</strong><p>{message}</p></div>}
  </Container>;
}
