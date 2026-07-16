-- Classes contábeis vinculadas à empresa (Grupo → Empresa → Classe)

ALTER TABLE "budget_classes" ADD COLUMN "company_id" UUID;

UPDATE "budget_classes" bc
SET "company_id" = c."id"
FROM (
  SELECT "id"
  FROM "companies"
  WHERE "status" = 'ACTIVE'
  ORDER BY "code"
  LIMIT 1
) c
WHERE bc."company_id" IS NULL;

UPDATE "budget_classes" bc
SET "company_id" = c."id"
FROM "companies" c
WHERE bc."company_id" IS NULL;

ALTER TABLE "budget_classes" ALTER COLUMN "company_id" SET NOT NULL;

ALTER TABLE "budget_classes" DROP CONSTRAINT IF EXISTS "budget_classes_code_key";
DROP INDEX IF EXISTS "budget_classes_code_key";

CREATE UNIQUE INDEX "budget_classes_company_id_code_key" ON "budget_classes"("company_id", "code");
CREATE INDEX "budget_classes_company_id_status_idx" ON "budget_classes"("company_id", "status");

ALTER TABLE "budget_classes" ADD CONSTRAINT "budget_classes_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
