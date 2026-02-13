import type { Knex } from "knex";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });

const config: Knex.Config = {
  client: "pg",
  connection:
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5433/node_registration",
  migrations: {
    directory: "./migrations",
    extension: "ts",
  },
  seeds: {
    directory: "./seeds",
    extension: "ts",
  },
};

export default config;
