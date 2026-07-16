import ExcelJS from "exceljs";
import { Prisma } from "@prisma/client";
import PDFDocument from "pdfkit";
import { prisma } from "../../config/prisma";
import { createSignedUrl, storageBuckets, uploadToBucket } from "../../integrations/supabase/storage";

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => JSON.stringify(row[h] ?? "")).join(","));
  }
  return lines.join("\n");
}

async function toXlsx(rows: Record<string, unknown>[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("report");
  if (rows.length > 0) {
    sheet.columns = Object.keys(rows[0]).map((key) => ({ header: key, key }));
    rows.forEach((row) => sheet.addRow(row));
  }
  return workbook.xlsx.writeBuffer();
}

function toPdf(rows: Record<string, unknown>[]) {
  const doc = new PDFDocument({ margin: 40 });
  const chunks: Buffer[] = [];

  doc.on("data", (c) => chunks.push(c));
  doc.fontSize(14).text("BUDDGET Report", { underline: true });
  doc.moveDown();

  rows.forEach((row, idx) => {
    doc.fontSize(10).text(`${idx + 1}. ${JSON.stringify(row)}`);
  });

  doc.end();

  return new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

export async function createExport(type: string, format: "csv" | "xlsx" | "pdf", filters: Record<string, unknown>, actorId: string) {
  const job = await prisma.exportJob.create({
    data: {
      type,
      filtersJson: filters as Prisma.InputJsonValue,
      status: "PROCESSING",
      createdBy: actorId
    }
  });

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    "SELECT * FROM budget_lines ORDER BY created_at DESC LIMIT 500"
  );

  let content: Buffer;
  let contentType = "text/csv";
  if (format === "csv") {
    content = Buffer.from(toCsv(rows), "utf-8");
  } else if (format === "xlsx") {
    contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const buffer = await toXlsx(rows);
    content = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  } else {
    contentType = "application/pdf";
    content = await toPdf(rows);
  }

  const extension = format;
  const path = `${type}/${job.id}.${extension}`;

  await uploadToBucket(storageBuckets.exports, path, content, contentType);

  const done = await prisma.exportJob.update({
    where: { id: job.id },
    data: {
      status: "DONE",
      storageBucket: storageBuckets.exports,
      filePath: path,
      finishedAt: new Date()
    }
  });

  return {
    ...done,
    signedUrl: await createSignedUrl(storageBuckets.exports, path)
  };
}
