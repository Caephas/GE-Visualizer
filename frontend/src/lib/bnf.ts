/** Display-only BNF parsing. Mapping itself happens in the backend via GRAPE. */

export interface BnfRule {
  nonTerminal: string;
  productions: string[];
}

export function parseBnf(text: string): BnfRule[] {
  const rules: BnfRule[] = [];
  for (const line of text.split("\n")) {
    const match = line.match(/^\s*(<[^>]+>)\s*::=\s*(.+)$/);
    if (!match) continue;
    const productions = match[2]
      .split("|")
      .map((production) => production.trim())
      .filter(Boolean);
    rules.push({ nonTerminal: match[1], productions });
  }
  return rules;
}
