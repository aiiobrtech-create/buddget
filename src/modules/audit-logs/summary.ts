type AuditPayload = {
  entity: string;
  action: string;
  beforeJson?: unknown;
  afterJson?: unknown;
  entityId?: string | null;
};

type JsonRecord = Record<string, unknown>;

const ENTITY_LABELS: Record<string, string> = {
  actual: "Linha de realizado",
  budget_item: "Item orçamentário",
  cost_center: "Centro de custo",
  budget_line: "Linha orçamentária",
  company: "Empresa",
  user: "Usuário",
  project: "Projeto",
  supplier: "Fornecedor",
  budget: "Orçamento",
  budget_version: "Versão do orçamento",
  forecast: "Previsão",
};

const FIELD_LABELS: Record<string, string> = {
  code: "código",
  name: "nome",
  description: "descrição",
  documentNumber: "documento",
  amount: "valor",
  plannedAmount: "valor planejado",
  status: "status",
  email: "e-mail",
  legalName: "razão social",
  tradeName: "nome fantasia",
  document: "CNPJ/CPF",
  year: "ano",
  referenceMonth: "mês",
  notes: "observações",
};

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonRecord;
}

function readStr(record: JsonRecord | null, ...keys: string[]): string | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && !Number.isNaN(value)) return String(value);
  }
  return undefined;
}

function readMoney(record: JsonRecord | null, key: string): string | undefined {
  if (!record) return undefined;
  const value = record[key];
  if (value == null) return undefined;
  const amount = typeof value === "object" && value !== null && "toString" in value
    ? Number((value as { toString(): string }).toString())
    : Number(value);
  if (Number.isNaN(amount)) return undefined;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
}

function entityLabel(entity: string): string {
  return ENTITY_LABELS[entity] ?? entity.replace(/_/g, " ");
}

function pickSnapshot(payload: AuditPayload): JsonRecord | null {
  return asRecord(payload.afterJson) ?? asRecord(payload.beforeJson);
}

function identifierForEntity(entity: string, record: JsonRecord | null): string | undefined {
  if (!record) return undefined;

  switch (entity) {
    case "actual": {
      const parts = [
        readStr(record, "documentNumber"),
        readStr(record, "description"),
        readMoney(record, "amount"),
      ].filter(Boolean);
      return parts.length ? parts.join(" · ") : undefined;
    }
    case "supplier": {
      const name = readStr(record, "tradeName", "legalName");
      const doc = readStr(record, "document");
      return [name, doc].filter(Boolean).join(" · ") || undefined;
    }
    case "user": {
      return readStr(record, "name", "email");
    }
    case "budget": {
      const year = readStr(record, "year");
      const name = readStr(record, "name");
      return [year, name].filter(Boolean).join(" — ") || undefined;
    }
    case "budget_version": {
      const version = readStr(record, "versionNumber");
      const name = readStr(record, "name");
      return [version ? `v${version}` : undefined, name].filter(Boolean).join(" — ") || undefined;
    }
    case "budget_line": {
      const month = readStr(record, "referenceMonth");
      const amount = readMoney(record, "plannedAmount");
      const notes = readStr(record, "notes");
      return [
        month ? `mês ${month}` : undefined,
        amount,
        notes,
      ].filter(Boolean).join(" · ") || undefined;
    }
    default: {
      const code = readStr(record, "code");
      const name = readStr(record, "name", "description", "email", "legalName");
      if (code && name) return `${code} — ${name}`;
      return code ?? name;
    }
  }
}

function changedFields(before: JsonRecord | null, after: JsonRecord | null): string[] {
  if (!before || !after) return [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const ignored = new Set([
    "id",
    "createdAt",
    "updatedAt",
    "createdBy",
    "publishedAt",
    "publishedBy",
  ]);

  const changes: string[] = [];
  for (const key of keys) {
    if (ignored.has(key)) continue;
    const prev = before[key];
    const next = after[key];
    if (JSON.stringify(prev) === JSON.stringify(next)) continue;

    const label = FIELD_LABELS[key] ?? key;
    if (key === "amount" || key === "plannedAmount") {
      const from = readMoney(before, key);
      const to = readMoney(after, key);
      if (from && to) changes.push(`${label}: ${from} → ${to}`);
      else if (to) changes.push(`${label}: ${to}`);
      continue;
    }

    const from = readStr(before, key) ?? (prev != null ? String(prev) : undefined);
    const to = readStr(after, key) ?? (next != null ? String(next) : undefined);
    if (from && to && from !== to) changes.push(`${label}: ${from} → ${to}`);
    else if (to) changes.push(`${label}: ${to}`);
  }

  return changes.slice(0, 3);
}

export function buildAuditDescription(
  payload: AuditPayload,
  extras?: { budgetItemCode?: string },
): string {
  const label = entityLabel(payload.entity);
  const snapshot = pickSnapshot(payload);
  let identifier = identifierForEntity(payload.entity, snapshot);

  if (payload.entity === "actual" && extras?.budgetItemCode) {
    identifier = [extras.budgetItemCode, identifier].filter(Boolean).join(" · ");
  }

  const action = payload.action.toLowerCase();

  if (action === "create") {
    return identifier ? `${label}: ${identifier}` : label;
  }

  if (action === "delete") {
    return identifier ? `${label} removido: ${identifier}` : `${label} removido`;
  }

  if (action === "update") {
    const changes = changedFields(asRecord(payload.beforeJson), asRecord(payload.afterJson));
    const base = identifier ? `${label}: ${identifier}` : label;
    if (!changes.length) return base;
    return `${base} (${changes.join("; ")})`;
  }

  return identifier ? `${label}: ${identifier}` : label;
}
