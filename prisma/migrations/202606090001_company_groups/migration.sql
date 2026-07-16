-- Grupos de empresas (alinhado ao frontend)
CREATE TABLE IF NOT EXISTS "company_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "company_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "company_groups_code_key" ON "company_groups"("code");

ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "company_group_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companies_company_group_id_fkey'
  ) THEN
    ALTER TABLE "companies"
      ADD CONSTRAINT "companies_company_group_id_fkey"
      FOREIGN KEY ("company_group_id") REFERENCES "company_groups"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "companies_company_group_id_idx" ON "companies"("company_group_id");

ALTER TABLE "company_groups" ENABLE ROW LEVEL SECURITY;
