import type { Knex } from "knex";
import crypto from "crypto";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

export async function seed(knex: Knex): Promise<void> {
  const apiKey = process.env.DEFAULT_API_KEY || "changeme-default-api-key";
  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

  const existing = await knex("api_keys").where({ key_hash: keyHash }).first();
  if (!existing) {
    await knex("api_keys").insert({
      key_hash: keyHash,
      label: "Default API Key",
      is_active: true,
    });
  }
}
