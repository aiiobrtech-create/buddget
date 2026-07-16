export type NatureSectionId = "receitas" | "despesas" | "capex";

export function isCapex(name: string, nature: string) {
  const text = `${name} ${nature}`.toUpperCase();
  return text.includes("CAPEX") || text.includes("IMOBILIZADO") || nature.toLowerCase() === "ativo";
}

export function isReceita(nature: string) {
  return nature.toLowerCase().includes("receita");
}

export function resolveNatureSection(name: string, nature: string): NatureSectionId {
  if (isCapex(name, nature)) return "capex";
  if (isReceita(nature)) return "receitas";
  return "despesas";
}

export const NATURE_SECTIONS: ReadonlyArray<{ id: NatureSectionId; title: string }> = [
  { id: "receitas", title: "Receitas" },
  { id: "despesas", title: "Despesas" },
  { id: "capex", title: "Capex/Imobilizado" },
];
