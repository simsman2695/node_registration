import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

export const config = {
  apiUrl: process.env.API_URL || "http://localhost:3002",
  apiKey: process.env.API_KEY || "changeme-default-api-key",
  intervalMs: parseInt(process.env.INTERVAL_MS || "60000", 10),
  macOverride: process.env.MAC_OVERRIDE || "",
};
