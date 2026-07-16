import { beforeAll, afterAll, describe, expect, it } from "vitest";

let app: { inject: Function; close: Function } | undefined;

describe("health endpoint", () => {
  beforeAll(async () => {
    // Fixos para o suite não depender do .env real e passar validação env.ts:
    // DATABASE_URL local + SUPABASE_URL que não seja *.supabase.co (senão exige URI pooler).
    process.env.DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/buddget";
    process.env.DIRECT_URL = "postgresql://postgres:postgres@127.0.0.1:5432/buddget";
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test_secret_access_123456789";
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test_secret_refresh_123456789";
    process.env.SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "anon";
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "service";
    process.env.SUPABASE_STORAGE_BUCKET_IMPORTS = process.env.SUPABASE_STORAGE_BUCKET_IMPORTS ?? "imports";
    process.env.SUPABASE_STORAGE_BUCKET_EXPORTS = process.env.SUPABASE_STORAGE_BUCKET_EXPORTS ?? "exports";
    process.env.SUPABASE_STORAGE_BUCKET_ATTACHMENTS = process.env.SUPABASE_STORAGE_BUCKET_ATTACHMENTS ?? "attachments";

    const mod = await import("../../src/app/build-app");
    app = await mod.buildApp();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it("returns server status", async () => {
    const res = await app!.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });
});
