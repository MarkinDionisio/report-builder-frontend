import type { SelectItem } from "../types/creatorTypes";

export function defaultAggregationAlias(aggregation: string, fieldName: string): string {
  const name = fieldName.trim();
  switch (aggregation) {
    case "sum": return /^total(?:\b|\s)/i.test(name) ? name : `Total de ${name}`;
    case "avg": return `Média de ${name}`;
    case "min": return `Mínimo de ${name}`;
    case "max": return `Máximo de ${name}`;
    case "count": return `Quantidade de ${name}`;
    case "countDistinct": return `Valores distintos de ${name}`;
    default: return name;
  }
}

export function nextAvailableAlias(baseAlias: string, usedAliases: Iterable<string>): string {
  const used = new Set([...usedAliases].map((alias) => alias.trim().toLocaleLowerCase("pt-BR")));
  const base = baseAlias.trim();
  if (!used.has(base.toLocaleLowerCase("pt-BR"))) return base;
  let suffix = 2;
  while (used.has(`${base} (${suffix})`.toLocaleLowerCase("pt-BR"))) suffix++;
  return `${base} (${suffix})`;
}

export function fillMissingColumnAliases(select: SelectItem[], resolveFieldName: (item: SelectItem) => string): SelectItem[] {
  const used = select.flatMap((item) => item.alias?.trim() ? [item.alias] : []);
  return select.map((item) => {
    if (item.alias?.trim()) return item;
    const base = item.target === "rows" ? "Quantidade de Registros" : resolveFieldName(item).trim() || "Coluna";
    const alias = nextAvailableAlias(base, used);
    used.push(alias);
    return { ...item, alias };
  });
}

export function validateColumnAliases(select: SelectItem[]): Map<number, string> {
  const errors = new Map<number, string>();
  const aliases = new Map<string, number[]>();

  select.forEach((item, index) => {
    const alias = item.alias?.trim() || "";
    if (!alias) {
      errors.set(index, "Informe o título da coluna.");
      return;
    }
    const key = alias.toLocaleLowerCase("pt-BR");
    aliases.set(key, [...(aliases.get(key) || []), index]);
  });

  aliases.forEach((indexes) => {
    if (indexes.length > 1) indexes.forEach((index) => errors.set(index, "Use um título diferente para cada coluna."));
  });
  return errors;
}
