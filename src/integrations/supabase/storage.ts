import { IntegrationError } from "../../common/errors/app-error";
import { env } from "../../config/env";
import { supabaseAdmin } from "./client";

export async function uploadToBucket(bucket: string, path: string, content: Buffer | Uint8Array | ArrayBuffer, contentType: string) {
  const { error } = await supabaseAdmin.storage.from(bucket).upload(path, content, {
    contentType,
    upsert: true
  });

  if (error) {
    throw new IntegrationError("Failed to upload file to Supabase Storage", error);
  }

  return { bucket, path };
}

export async function downloadFromBucket(bucket: string, path: string) {
  const { data, error } = await supabaseAdmin.storage.from(bucket).download(path);
  if (error || !data) {
    throw new IntegrationError("Failed to download file from Supabase Storage", error);
  }

  const bytes = await data.arrayBuffer();
  return Buffer.from(bytes);
}

export async function createSignedUrl(bucket: string, path: string, expiresIn = 300) {
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    throw new IntegrationError("Failed to create signed URL", error);
  }

  return data.signedUrl;
}

export const storageBuckets = {
  imports: env.SUPABASE_STORAGE_BUCKET_IMPORTS,
  exports: env.SUPABASE_STORAGE_BUCKET_EXPORTS,
  attachments: env.SUPABASE_STORAGE_BUCKET_ATTACHMENTS
};
