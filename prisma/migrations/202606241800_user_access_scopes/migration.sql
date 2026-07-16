-- CreateEnum
CREATE TYPE "UserScopeType" AS ENUM ('COMPANY_GROUP', 'COMPANY', 'CLASS', 'CATEGORY', 'COST_CENTER');

-- CreateTable
CREATE TABLE "user_access_scopes" (
    "user_id" UUID NOT NULL,
    "scope_type" "UserScopeType" NOT NULL,
    "scope_id" UUID NOT NULL,

    CONSTRAINT "user_access_scopes_pkey" PRIMARY KEY ("user_id","scope_type","scope_id")
);

-- CreateIndex
CREATE INDEX "user_access_scopes_scope_type_scope_id_idx" ON "user_access_scopes"("scope_type", "scope_id");

-- AddForeignKey
ALTER TABLE "user_access_scopes" ADD CONSTRAINT "user_access_scopes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
