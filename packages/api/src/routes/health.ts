import { Request, Response, Server } from "restify";
import db from "../db";
import redis from "../redis";

export function registerHealthRoutes(server: Server): void {
  server.get("/health", async (req: Request, res: Response) => {
    try {
      await db.raw("SELECT 1");
      await redis.ping();
      res.send(200, { status: "ok" });
    } catch (err: any) {
      res.send(503, { status: "unhealthy", error: err.message });
    }
  });
}
