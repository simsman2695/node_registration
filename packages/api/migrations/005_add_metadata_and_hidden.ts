import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("nodes", (table) => {
    table.jsonb("metadata").notNullable().defaultTo("{}");
    table.boolean("is_hidden").notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("nodes", (table) => {
    table.dropColumn("metadata");
    table.dropColumn("is_hidden");
  });
}
