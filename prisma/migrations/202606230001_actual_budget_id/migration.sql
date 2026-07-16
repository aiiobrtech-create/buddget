-- Vincula realizados ao orçamento para exclusão em cascata

ALTER TABLE "actuals" ADD COLUMN "budget_id" UUID;

ALTER TABLE "actuals" ADD CONSTRAINT "actuals_budget_id_fkey"
  FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "actuals_budget_id_competence_date_idx" ON "actuals"("budget_id", "competence_date");

-- Backfill: único orçamento por empresa/ano
UPDATE "actuals" a
SET "budget_id" = b."id"
FROM "budgets" b
WHERE a."budget_id" IS NULL
  AND a."company_id" = b."company_id"
  AND EXTRACT(YEAR FROM a."competence_date")::int = b."year"
  AND (
    SELECT COUNT(*)::int
    FROM "budgets" bx
    WHERE bx."company_id" = a."company_id"
      AND bx."year" = EXTRACT(YEAR FROM a."competence_date")::int
  ) = 1;
