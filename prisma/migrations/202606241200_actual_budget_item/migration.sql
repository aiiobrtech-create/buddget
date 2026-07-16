-- Vincula realizados ao item de orçamento (hierarquia completa)

ALTER TABLE "actuals" ADD COLUMN "budget_item_id" UUID;

CREATE INDEX "actuals_budget_item_id_idx" ON "actuals"("budget_item_id");

ALTER TABLE "actuals" ADD CONSTRAINT "actuals_budget_item_id_fkey"
  FOREIGN KEY ("budget_item_id") REFERENCES "budget_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
