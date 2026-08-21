interface Props {
  matchCase: boolean;
  exactMatch: boolean;
  onMatchCaseChange: (value: boolean) => void;
  onExactMatchChange: (value: boolean) => void;
}

export function SearchMatchOptions({ matchCase, exactMatch, onMatchCaseChange, onExactMatchChange }: Props) {
  return <div className="search-match-options" aria-label="Opções de busca">
    <button type="button" aria-pressed={matchCase} title="Diferenciar letras maiúsculas e minúsculas" onClick={() => onMatchCaseChange(!matchCase)}>Aa</button>
    <button type="button" aria-pressed={exactMatch} title="Buscar expressão exata" onClick={() => onExactMatchChange(!exactMatch)}>ab</button>
  </div>;
}
