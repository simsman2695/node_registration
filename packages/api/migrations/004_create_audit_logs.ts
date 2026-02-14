import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("audit_logs", (table) => {
    table.increments("id").primary();
    table.integer("user_id").references("id").inTable("users").onDelete("SET NULL");
    table.string("user_email", 255);
    table.string("action", 50).notNullable();
    table.string("target_mac", 17);
    table.string("target_hostname", 255);
    table.jsonb("meta").defaultTo("{}");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("user_id");
    table.index("action");
    table.index("created_at");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("audit_logs");
}
