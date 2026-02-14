import dotenv from "dotenv";
import os from "os";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

export const config = {
  port: parseInt(process.env.PORT || "3002", 10),
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5433/node_registration",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6380",
  sessionSecret: process.env.SESSION_SECRET || "change-me",
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      "http://localhost:3001/auth/google/callback",
  },
  defaultApiKey: process.env.DEFAULT_API_KEY || "changeme-default-api-key",
  sshKeyPath: process.env.SSH_KEY_PATH || path.join(os.homedir(), ".ssh", "id_rsa"),
};
