export interface TextSearchOptions {
  matchCase: boolean;
  exactMatch: boolean;
}

export function matchesTextSearch(value: string | null | undefined, query: string, options: TextSearchOptions): boolean {
  if (!query) return true;
  if (!value) return false;
  const candidate = options.matchCase ? value : value.toLocaleLowerCase("pt-BR");
  const term = options.matchCase ? query : query.toLocaleLowerCase("pt-BR");
  return options.exactMatch ? candidate === term : candidate.includes(term);
}
