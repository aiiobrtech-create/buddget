-- Itens de orçamento (nível abaixo de centro de custo)

CREATE TABLE "budget_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cost_center_id" UUID NOT NULL,
    "company_id" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "budget_items_cost_center_id_code_key" ON "budget_items"("cost_center_id", "code");
CREATE INDEX "budget_items_company_id_status_idx" ON "budget_items"("company_id", "status");

ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_cost_center_id_fkey"
  FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "budget_lines" ADD COLUMN "budget_item_id" UUID;
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_budget_item_id_fkey"
  FOREIGN KEY ("budget_item_id") REFERENCES "budget_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "budget_items" ("cost_center_id", "company_id", "code", "name", "status")
SELECT cc."id", cc."company_id", '1', 'Padrão', 'ACTIVE'
FROM "cost_centers" cc
WHERE NOT EXISTS (
  SELECT 1 FROM "budget_items" bi WHERE bi."cost_center_id" = cc."id" AND bi."code" = '1'
);

UPDATE "budget_lines" bl
SET "budget_item_id" = bi."id"
FROM "budget_items" bi
WHERE bi."cost_center_id" = bl."cost_center_id"
  AND bi."code" = '1'
  AND bl."budget_item_id" IS NULL;
