import type { ReportTag } from "../types/creatorTypes";
import "../styles/reportMetadata.css";

export function ReportMetadata({ description, tags = [], full = false }: { description?: string | null; tags?: ReportTag[]; full?: boolean }) {
  return <div className="report-metadata">{description && <p className={full ? "report-description" : "report-description report-description--summary"}>{description}</p>}{tags.length > 0 && <ul className="report-tags" aria-label="Etiquetas do relatório">{tags.map(tag => <li key={tag.id}>{tag.name}</li>)}</ul>}</div>;
}
