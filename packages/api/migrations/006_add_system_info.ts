import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("nodes", (table) => {
    table.string("os_info", 255).notNullable().defaultTo("");
    table.string("kernel", 255).notNullable().defaultTo("");
    table.string("build", 255).notNullable().defaultTo("");
    table.string("agent_version", 50).notNullable().defaultTo("");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("nodes", (table) => {
    table.dropColumn("os_info");
    table.dropColumn("kernel");
    table.dropColumn("build");
    table.dropColumn("agent_version");
  });
}
