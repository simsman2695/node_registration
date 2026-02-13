import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("api_keys", (table) => {
    table.increments("id").primary();
    table.string("key_hash", 64).unique().notNullable();
    table.string("label", 255).notNullable();
    table.boolean("is_active").defaultTo(true);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("api_keys");
}
