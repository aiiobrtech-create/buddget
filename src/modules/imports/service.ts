import { FastifyRequest } from "fastify";
import ExcelJS from "exceljs";
import { prisma } from "../../config/prisma";
import { ValidationError } from "../../common/errors/app-error";
import { downloadFromBucket, storageBuckets, uploadToBucket } from "../../integrations/supabase/storage";
import { writeAuditLog } from "../audit-logs/service";

function detectCsvDelimiter(headerLine: string): string {
  const semis = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return semis >= commas ? ";" : ",";
}

function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const delimiter = detectCsvDelimiter(lines[0]);
  const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^\uFEFF/, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(delimiter);
    return headers.reduce<Record<string, string>>((acc, h, idx) => {
      acc[h] = (values[idx] ?? "").trim();
      return acc;
    }, {});
  });
}

/** Aceita cabeçalhos do modelo (Código/Data/Descrição/Valor) e aliases legados. */
const ACTUAL_HEADER_ALIASES: Record<string, string> = {
  code: "code",
  codigo: "code",
  "codigo composto": "code",
  date: "date",
  data: "date",
  launchdate: "date",
  "data lancamento": "date",
  datalancamento: "date",
  competencedate: "date",
  "data competencia": "date",
  datacompetencia: "date",
  description: "description",
  descricao: "description",
  amount: "amount",
  valor: "amount",
  companyid: "companyId",
  costcenterid: "costCenterId",
  categoryid: "categoryId",
  classid: "classId",
  natureid: "natureId",
  documentnumber: "documentNumber",
  projectid: "projectId",
  supplierid: "supplierId",
};

function normalizeHeaderKey(header: string): string {
  const cleaned = header.trim().replace(/^\uFEFF/, "");
  const normalized = cleaned
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return ACTUAL_HEADER_ALIASES[normalized] ?? ACTUAL_HEADER_ALIASES[normalized.replace(/[^a-z0-9]/g, "")] ?? cleaned;
}

function normalizeImportRow(row: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    mapped[normalizeHeaderKey(key)] = String(value ?? "").trim();
  }
  return mapped;
}

function parseAmount(raw: string): number {
  let cleaned = raw.trim().replace(/\u00a0/g, " ").replace(/\s/g, "");
  cleaned = cleaned.replace(/^R\$ ?/i, "");
  if (!cleaned) return Number.NaN;

  // 1.500,50 → 1500.50
  if (cleaned.includes(",") && cleaned.includes(".")) {
    return Number(cleaned.replace(/\./g, "").replace(",", "."));
  }
  // 1500,50 → 1500.50
  if (cleaned.includes(",")) {
    return Number(cleaned.replace(",", "."));
  }
  // 25.000 → 25000 (milhar BR sem decimais)
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    return Number(cleaned.replace(/\./g, ""));
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : Number.NaN;
}

function cellRoleForHeader(header: string): "date" | "amount" | "text" {
  const key = normalizeHeaderKey(header);
  if (key === "date" || key === "launchDate" || key === "competenceDate") return "date";
  if (key === "amount") return "amount";
  return "text";
}

function formatBrDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function formatExcelSerial(serial: number): string {
  const excelEpoch = Date.UTC(1899, 11, 30);
  const ms = excelEpoch + Math.round(serial) * 24 * 60 * 60 * 1000;
  return formatBrDate(new Date(ms));
}

function unwrapExcelValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value !== "object") return value;
  const obj = value as Record<string, unknown>;
  if ("result" in obj) return unwrapExcelValue(obj.result);
  if ("text" in obj) return obj.text;
  if (Array.isArray(obj.richText)) {
    return (obj.richText as Array<{ text?: string }>).map((part) => part.text ?? "").join("");
  }
  if ("hyperlink" in obj && "text" in obj) return obj.text;
  return value;
}

function cellToString(value: unknown, role: "date" | "amount" | "text" = "text"): string {
  const raw = unwrapExcelValue(value);
  if (raw == null || raw === "") return "";

  if (role === "amount") {
    if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
    return String(raw).trim();
  }

  if (role === "date") {
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) return formatBrDate(raw);
    if (typeof raw === "number" && Number.isFinite(raw) && raw > 20000 && raw < 60000) {
      return formatExcelSerial(raw);
    }
    return String(raw).trim();
  }

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return formatBrDate(raw);
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  return String(raw).trim();
}

async function parseRowsFromBuffer(fileName: string, content: Buffer): Promise<Record<string, string>[]> {
  let rows: Record<string, string>[] = [];
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(content as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) return [];

    const headerRow = sheet.getRow(1);
    const headers = new Map<number, string>();
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const label = String(cell.text ?? cell.value ?? "").trim();
      if (label) headers.set(colNumber, label);
    });

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const mapped: Record<string, string> = {};
      for (const [colNumber, header] of headers.entries()) {
        const cell = row.getCell(colNumber);
        mapped[header] = cellToString(cell.value, cellRoleForHeader(header));
      }
      rows.push(mapped);
    });
  } else {
    rows = parseCsv(content.toString("utf-8"));
  }

  return rows.map(normalizeImportRow);
}

/** Aceita DD/MM/AAAA (preferencial) e AAAA-MM-DD. */
function parseImportDate(raw: string): Date {
  const value = raw.trim();
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (br) {
    const day = Number(br[1]);
    const month = Number(br[2]);
    const year = Number(br[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new Error(`Data inválida "${raw}". Use DD/MM/AAAA`);
    }
    return date;
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    return new Date(Date.UTC(year, month - 1, day));
  }

  throw new Error(`Data inválida "${raw}". Use DD/MM/AAAA`);
}

async function resolveNatureIdForCategory(budgetClassId: string) {
  const existing = await prisma.budgetNature.findFirst({
    where: { classId: budgetClassId },
    orderBy: { displayOrder: "asc" },
  });
  if (existing) return existing.id;

  const created = await prisma.budgetNature.upsert({
    where: { classId_code: { classId: budgetClassId, code: "1" } },
    create: { classId: budgetClassId, code: "1", name: "Padrão", displayOrder: 1 },
    update: {},
  });
  return created.id;
}

/**
 * Resolve código composto Grupo.Empresa.Classe.Categoria.CentroDeCusto[.Item]
 * para os IDs usados em Actual (mapeamento interno de classe/categoria).
 */
async function resolvePlanningLineFromCode(code: string) {
  const parts = code
    .trim()
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 5) {
    throw new Error(
      `Código inválido "${code}". Use Grupo.Empresa.Classe.Categoria.CentroDeCusto[.Item]`,
    );
  }

  const [groupCode, companyCode, classCode, categoryCode, costCenterCode, itemCode] = parts;

  const group = await prisma.companyGroup.findFirst({ where: { code: groupCode } });
  if (!group) throw new Error(`Grupo "${groupCode}" não encontrado`);

  const company = await prisma.company.findFirst({
    where: { code: companyCode, companyGroupId: group.id },
  });
  if (!company) throw new Error(`Empresa "${companyCode}" não encontrada no grupo ${groupCode}`);

  const ledgerClass = await prisma.budgetCategory.findFirst({
    where: { companyId: company.id, code: classCode },
  });
  if (!ledgerClass) throw new Error(`Classe "${classCode}" não encontrada na empresa ${companyCode}`);

  const category = await prisma.budgetClass.findFirst({
    where: { classId: ledgerClass.id, code: categoryCode },
  });
  if (!category) throw new Error(`Categoria "${categoryCode}" não encontrada na classe ${classCode}`);

  const costCenter =
    (await prisma.costCenter.findFirst({
      where: { categoryId: category.id, code: costCenterCode, companyId: company.id },
    })) ??
    (await prisma.costCenter.findFirst({
      where: { categoryId: category.id, code: costCenterCode },
    }));
  if (!costCenter) {
    throw new Error(`Centro de custo "${costCenterCode}" não encontrado na categoria ${categoryCode}`);
  }

  let budgetItemId: string | undefined;
  if (itemCode) {
    const item = await prisma.budgetItem.findFirst({
      where: { costCenterId: costCenter.id, code: itemCode },
    });
    if (!item) throw new Error(`Item "${itemCode}" não encontrado no centro de custo ${costCenterCode}`);
    budgetItemId = item.id;
  }

  const natureId = await resolveNatureIdForCategory(category.id);

  return {
    companyId: company.id,
    // Actual: categoryId = classe contábil (BudgetCategory); classId = categoria (BudgetClass)
    categoryId: ledgerClass.id,
    classId: category.id,
    costCenterId: costCenter.id,
    budgetItemId,
    natureId,
  };
}

async function parseRowsFromStorage(bucket: string, path: string): Promise<Record<string, string>[]> {
  const content = await downloadFromBucket(bucket, path);
  return parseRowsFromBuffer(path, content);
}

async function readRequestFile(request: FastifyRequest, folder: string) {
  const file = await request.file();
  if (!file) {
    throw new ValidationError("Arquivo é obrigatório");
  }

  const content = await file.toBuffer();
  const filePath = `${folder}/${Date.now()}-${file.filename}`;

  // Storage é opcional: o processamento usa o buffer em memória.
  try {
    await uploadToBucket(storageBuckets.imports, filePath, content, file.mimetype);
  } catch {
    // Ambientes locais sem Supabase Storage seguem normalmente.
  }

  return {
    fileName: file.filename,
    filePath,
    mimeType: file.mimetype,
    content,
  };
}

/** @deprecated Use readRequestFile — mantido para outros imports. */
async function uploadRequestFile(request: FastifyRequest, folder: string) {
  const uploaded = await readRequestFile(request, folder);
  return {
    fileName: uploaded.fileName,
    filePath: uploaded.filePath,
    mimeType: uploaded.mimeType,
  };
}

function validateBudgetLineRow(row: Record<string, string>) {
  const required = ["versionId", "companyId", "costCenterId", "categoryId", "classId", "natureId", "referenceMonth", "plannedAmount"];
  const missing = required.filter((field) => !row[field]);
  return {
    valid: missing.length === 0,
    errors: missing.map((m) => `Missing ${m}`)
  };
}

function validateActualRow(row: Record<string, string>) {
  const errors: string[] = [];
  const hasCode = Boolean(row.code?.trim());
  const hasLegacyIds = Boolean(row.companyId && row.costCenterId && row.categoryId && row.classId && row.natureId);

  if (!hasCode && !hasLegacyIds) {
    errors.push("informe o Código (Grupo.Empresa.Classe.Categoria.CentroDeCusto[.Item])");
  }
  if (!(row.date || row.launchDate || row.competenceDate)) {
    errors.push("informe a Data (DD/MM/AAAA)");
  } else {
    try {
      parseImportDate(row.date || row.launchDate || row.competenceDate);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Data inválida");
    }
  }
  if (!row.description) {
    errors.push("informe a Descrição");
  }
  if (!row.amount || !Number.isFinite(parseAmount(row.amount))) {
    errors.push(
      row.amount
        ? `informe um Valor numérico válido (recebido: "${row.amount}")`
        : "informe um Valor numérico válido",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

async function finalizeBatch(batchId: string, totalRows: number, validRows: number, invalidRows: number, errorReportPath?: string) {
  await prisma.importBatch.update({
    where: { id: batchId },
    data: {
      totalRows,
      validRows,
      invalidRows,
      errorReportPath,
      status: invalidRows > 0 ? "FAILED" : "DONE",
      finishedAt: new Date()
    }
  });
}

export async function runBudgetLineImport(request: FastifyRequest, actorId: string) {
  const previewOnly = (request.query as { preview?: string }).preview === "true";
  const upload = await uploadRequestFile(request, "budget-lines");

  const batch = await prisma.importBatch.create({
    data: {
      type: "budget-lines",
      fileName: upload.fileName,
      filePath: upload.filePath,
      storageBucket: storageBuckets.imports,
      status: "PROCESSING",
      startedAt: new Date(),
      createdBy: actorId
    }
  });

  const rows = await parseRowsFromStorage(storageBuckets.imports, upload.filePath);
  const errors: string[] = [];
  let validRows = 0;

  if (!previewOnly) {
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const validation = validateBudgetLineRow(row);
      if (!validation.valid) {
        errors.push(`row ${i + 1}: ${validation.errors.join("; ")}`);
        continue;
      }

      validRows += 1;

      await prisma.budgetLine.create({
        data: {
          versionId: row.versionId,
          companyId: row.companyId,
          costCenterId: row.costCenterId,
          categoryId: row.categoryId,
          classId: row.classId,
          natureId: row.natureId,
          projectId: row.projectId || null,
          supplierId: row.supplierId || null,
          referenceMonth: Number(row.referenceMonth),
          plannedAmount: Number(row.plannedAmount),
          notes: row.notes || null
        }
      });
    }
  } else {
    for (let i = 0; i < rows.length; i += 1) {
      const validation = validateBudgetLineRow(rows[i]);
      if (!validation.valid) {
        errors.push(`row ${i + 1}: ${validation.errors.join("; ")}`);
      } else {
        validRows += 1;
      }
    }
  }

  let errorReportPath: string | undefined;
  if (errors.length > 0) {
    errorReportPath = `errors/${batch.id}.txt`;
    await uploadToBucket(storageBuckets.imports, errorReportPath, Buffer.from(errors.join("\n"), "utf-8"), "text/plain");
  }

  await finalizeBatch(batch.id, rows.length, validRows, rows.length - validRows, errorReportPath);

  await writeAuditLog({
    module: "imports",
    entity: "import_batch",
    entityId: batch.id,
    action: "import",
    userId: actorId,
    afterJson: { previewOnly, totalRows: rows.length, validRows }
  });

  return {
    batchId: batch.id,
    previewOnly,
    totalRows: rows.length,
    validRows,
    invalidRows: rows.length - validRows,
    errorReportPath
  };
}

export async function runActualImport(request: FastifyRequest, actorId: string) {
  const previewOnly = (request.query as { preview?: string }).preview === "true";
  const upload = await readRequestFile(request, "actuals");

  const batch = await prisma.importBatch.create({
    data: {
      type: "actuals",
      fileName: upload.fileName,
      filePath: upload.filePath,
      storageBucket: storageBuckets.imports,
      status: "PROCESSING",
      startedAt: new Date(),
      createdBy: actorId
    }
  });

  const rows = await parseRowsFromBuffer(upload.fileName, upload.content);
  const errors: string[] = [];
  let validRows = 0;

  if (!previewOnly) {
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const validation = validateActualRow(row);
      if (!validation.valid) {
        errors.push(`Linha ${i + 2}: ${validation.errors.join("; ")}`);
        continue;
      }

      try {
        const dateRaw = row.date || row.launchDate || row.competenceDate;
        const amount = parseAmount(row.amount);
        const competenceDate = parseImportDate(dateRaw);
        let companyId = row.companyId;
        let costCenterId = row.costCenterId;
        let categoryId = row.categoryId;
        let classId = row.classId;
        let natureId = row.natureId;
        let budgetItemId = row.budgetItemId || null;

        if (row.code?.trim()) {
          const resolved = await resolvePlanningLineFromCode(row.code);
          companyId = resolved.companyId;
          costCenterId = resolved.costCenterId;
          categoryId = resolved.categoryId;
          classId = resolved.classId;
          natureId = resolved.natureId;
          budgetItemId = resolved.budgetItemId ?? null;
        }

        if (!companyId || !costCenterId || !categoryId || !classId || !natureId) {
          errors.push(`Linha ${i + 2}: não foi possível resolver os cadastros do lançamento`);
          continue;
        }

        validRows += 1;
        await prisma.actual.create({
          data: {
            companyId,
            launchDate: competenceDate,
            competenceDate,
            costCenterId,
            categoryId,
            classId,
            natureId,
            budgetItemId,
            projectId: row.projectId || null,
            supplierId: row.supplierId || null,
            documentNumber: row.documentNumber || null,
            description: row.description,
            amount,
            source: "IMPORT",
            importBatchId: batch.id,
            createdBy: actorId,
          },
        });
      } catch (error) {
        errors.push(`Linha ${i + 2}: ${error instanceof Error ? error.message : "falha ao importar"}`);
      }
    }
  } else {
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const validation = validateActualRow(row);
      if (!validation.valid) {
        errors.push(`Linha ${i + 2}: ${validation.errors.join("; ")}`);
        continue;
      }
      if (row.code?.trim()) {
        try {
          await resolvePlanningLineFromCode(row.code);
          validRows += 1;
        } catch (error) {
          errors.push(`Linha ${i + 2}: ${error instanceof Error ? error.message : "código inválido"}`);
        }
      } else {
        validRows += 1;
      }
    }
  }

  const errorMessages = errors.map((message) => message.trim()).filter(Boolean);
  const errorReportTxt =
    errorMessages.length > 0
      ? [
          "Relatório de erros — Importação de Realizado",
          `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
          `Arquivo: ${upload.fileName}`,
          `Total de linhas: ${rows.length}`,
          `Importados: ${validRows}`,
          `Erros: ${errorMessages.length}`,
          "",
          "Detalhes:",
          ...errorMessages,
          "",
        ].join("\r\n")
      : "";

  let errorReportPath: string | undefined;
  if (errorReportTxt) {
    errorReportPath = `errors/${batch.id}.txt`;
    try {
      await uploadToBucket(
        storageBuckets.imports,
        errorReportPath,
        Buffer.from(errorReportTxt, "utf-8"),
        "text/plain",
      );
    } catch {
      errorReportPath = undefined;
    }
  }

  await finalizeBatch(batch.id, rows.length, validRows, errorMessages.length, errorReportPath);

  await writeAuditLog({
    module: "imports",
    entity: "import_batch",
    entityId: batch.id,
    action: "import",
    userId: actorId,
    afterJson: {
      previewOnly,
      totalRows: rows.length,
      validRows,
      invalidRows: errorMessages.length,
      errors: errorMessages.slice(0, 50),
    },
  });

  return {
    batchId: batch.id,
    previewOnly,
    totalRows: rows.length,
    validRows,
    invalidRows: errorMessages.length,
    errorReportPath: errorReportPath ?? null,
    errors: errorMessages,
    errorReportTxt: errorReportTxt || null,
    errorReportFileName:
      errorMessages.length > 0 ? `erros-importacao-realizado-${batch.id.slice(0, 8)}.txt` : null,
    message:
      errorMessages.length > 0
        ? errorMessages[0]
        : `${validRows} lançamento(s) importado(s)`,
  };
}

export async function runMasterDataImport(request: FastifyRequest, actorId: string) {
  const type = (request.query as { type?: string }).type;
  if (!type || !["suppliers", "projects", "cost-centers"].includes(type)) {
    throw new ValidationError("Query param type must be suppliers, projects, or cost-centers");
  }

  const upload = await uploadRequestFile(request, `master-data/${type}`);
  const rows = await parseRowsFromStorage(storageBuckets.imports, upload.filePath);

  let imported = 0;
  for (const row of rows) {
    if (type === "suppliers") {
      if (!row.document || !row.legalName) continue;
      await prisma.supplier.upsert({
        where: { document: row.document },
        update: {
          legalName: row.legalName,
          tradeName: row.tradeName || null,
          email: row.email || null,
          phone: row.phone || null
        },
        create: {
          document: row.document,
          legalName: row.legalName,
          tradeName: row.tradeName || null,
          email: row.email || null,
          phone: row.phone || null
        }
      });
      imported += 1;
    }

    if (type === "projects") {
      if (!row.companyId || !row.code || !row.name || !row.startDate) continue;
      await prisma.project.upsert({
        where: { companyId_code: { companyId: row.companyId, code: row.code } },
        update: {
          name: row.name,
          startDate: new Date(row.startDate),
          endDate: row.endDate ? new Date(row.endDate) : null
        },
        create: {
          companyId: row.companyId,
          costCenterId: row.costCenterId || null,
          code: row.code,
          name: row.name,
          startDate: new Date(row.startDate),
          endDate: row.endDate ? new Date(row.endDate) : null
        }
      });
      imported += 1;
    }

    if (type === "cost-centers") {
      if (!row.companyId || !row.categoryId || !row.code || !row.name) continue;
      await prisma.costCenter.upsert({
        where: { categoryId_code: { categoryId: row.categoryId, code: row.code } },
        update: { name: row.name, companyId: row.companyId },
        create: {
          companyId: row.companyId,
          categoryId: row.categoryId,
          code: row.code,
          name: row.name,
        },
      });
      imported += 1;
    }
  }

  await writeAuditLog({
    module: "imports",
    entity: "master_data",
    action: "import",
    userId: actorId,
    afterJson: { type, imported, totalRows: rows.length }
  });

  return {
    type,
    filePath: upload.filePath,
    imported,
    totalRows: rows.length
  };
}
