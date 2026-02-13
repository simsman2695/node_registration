import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("nodes", (table) => {
    table.increments("id").primary();
    table.string("mac_address", 17).unique().notNullable();
    table.string("hostname", 255).notNullable();
    table.string("internal_ip", 45).notNullable();
    table.string("public_ip", 45).notNullable();
    table.timestamp("last_seen", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("nodes");
}
