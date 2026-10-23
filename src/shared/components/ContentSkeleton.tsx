interface ContentSkeletonProps {
  message: string;
  variant?: "list" | "cards" | "table";
  rows?: number;
  columns?: number;
}
/** Structural placeholders with a single contextual announcement. */
export function ContentSkeleton({ message, variant = "list", rows = 4, columns = 4 }: ContentSkeletonProps) {
  return <div className={'content-skeleton content-skeleton--' + variant} aria-busy="true">
    <span role="status" aria-live="polite" className="loading-sr-only">{message}</span>
    <div className="content-skeleton__body" aria-hidden="true">
      {Array.from({ length: rows }, (_, row) => <div className="content-skeleton__item" key={row}>
        {variant === "table" ? Array.from({ length: columns }, (_, column) => <span className="skeleton-line" key={column}/>) : <><span className="skeleton-line skeleton-line--title"/><span className="skeleton-line"/><span className="skeleton-line skeleton-line--short"/></>}
      </div>)}
    </div>
  </div>;
}
