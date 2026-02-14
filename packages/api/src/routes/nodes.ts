import { Server, Request, Response } from "restify";
import db from "../db";
import redis from "../redis";
import { requireApiKey } from "../middleware/api-key";
import { logAudit } from "../audit";
import type { PaginatedResponse, Node } from "../types";

const CACHE_TTL = 30; // seconds
const CACHE_PREFIX = "nodes:";

async function invalidateCache(): Promise<void> {
  const keys = await redis.keys(`${CACHE_PREFIX}*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

export function registerNodeRoutes(server: Server): void {
  // PUT /api/nodes/:mac - Upsert node
  server.put("/api/nodes/:mac", requireApiKey, async (req: Request, res: Response) => {
    const mac = req.params.mac?.toUpperCase();
    if (!mac || !/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(mac)) {
      res.send(400, { error: "Invalid MAC address format (expected AA:BB:CC:DD:EE:FF)" });
      return;
    }

    const { hostname, internal_ip, public_ip } = req.body || {};
    if (!hostname || !internal_ip || !public_ip) {
      res.send(400, { error: "Missing required fields: hostname, internal_ip, public_ip" });
      return;
    }

    const now = new Date();
    const existing = await db("nodes").where({ mac_address: mac }).first();

    if (existing) {
      const [node] = await db("nodes")
        .where({ mac_address: mac })
        .update({ hostname, internal_ip, public_ip, is_hidden: false, last_seen: now, updated_at: now })
        .returning("*");
      await invalidateCache();
      res.send(200, node);
    } else {
      const [node] = await db("nodes")
        .insert({ mac_address: mac, hostname, internal_ip, public_ip, last_seen: now })
        .returning("*");
      await invalidateCache();
      res.send(201, node);
    }
  });

  // GET /api/nodes - List nodes with pagination + search
  server.get("/api/nodes", requireApiKey, async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query?.limit || "50", 10), 100);
    const offset = parseInt(req.query?.offset || "0", 10);
    const search = req.query?.search || "";
    const sort = req.query?.sort || "last_seen";
    const order = req.query?.order === "asc" ? "asc" : "desc";

    const allowedSorts = ["hostname", "mac_address", "internal_ip", "public_ip", "last_seen", "created_at"];
    const sortCol = allowedSorts.includes(sort) ? sort : "last_seen";

    // Check cache
    const cacheKey = `${CACHE_PREFIX}${limit}:${offset}:${search}:${sortCol}:${order}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      res.send(200, JSON.parse(cached));
      return;
    }

    let query = db("nodes").where({ is_hidden: false });
    let countQuery = db("nodes").where({ is_hidden: false });

    if (search) {
      const searchPattern = `%${search}%`;
      const whereClause = function (this: any) {
        this.where("hostname", "ilike", searchPattern)
          .orWhere("mac_address", "ilike", searchPattern)
          .orWhere("internal_ip", "ilike", searchPattern)
          .orWhere("public_ip", "ilike", searchPattern)
          .orWhereRaw("metadata::text ilike ?", [searchPattern]);
      };
      query = query.andWhere(whereClause);
      countQuery = countQuery.andWhere(whereClause);
    }

    const [{ count }] = await countQuery.count("* as count");
    const data = await query.orderBy(sortCol, order).limit(limit).offset(offset);

    const response: PaginatedResponse<Node> = {
      data,
      pagination: { total: parseInt(count as string, 10), limit, offset },
    };

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(response));
    res.send(200, response);
  });

  // GET /api/nodes/:mac - Get single node
  server.get("/api/nodes/:mac", requireApiKey, async (req: Request, res: Response) => {
    const mac = req.params.mac?.toUpperCase();
    const node = await db("nodes").where({ mac_address: mac }).first();

    if (!node) {
      res.send(404, { error: "Node not found" });
      return;
    }

    res.send(200, node);
  });

  // PATCH /api/nodes/:mac/metadata - Update node metadata
  server.patch("/api/nodes/:mac/metadata", requireApiKey, async (req: Request, res: Response) => {
    const mac = req.params.mac?.toUpperCase();
    const { metadata } = req.body || {};

    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      res.send(400, { error: "Body must contain metadata object" });
      return;
    }

    const node = await db("nodes").where({ mac_address: mac }).first();
    if (!node) {
      res.send(404, { error: "Node not found" });
      return;
    }

    const now = new Date();
    const [updated] = await db("nodes")
      .where({ mac_address: mac })
      .update({ metadata: JSON.stringify(metadata), updated_at: now })
      .returning("*");

    const user = (req as any).user;
    logAudit({
      user_id: user?.id,
      user_email: user?.email,
      action: "update_metadata",
      target_mac: mac,
      target_hostname: node.hostname,
      meta: { metadata },
    });

    await invalidateCache();
    res.send(200, updated);
  });

  // DELETE /api/nodes/:mac - Remove node (will reappear on next agent check-in)
  server.del("/api/nodes/:mac", requireApiKey, async (req: Request, res: Response) => {
    const mac = req.params.mac?.toUpperCase();
    const node = await db("nodes").where({ mac_address: mac }).first();

    if (!node) {
      res.send(404, { error: "Node not found" });
      return;
    }

    await db("nodes").where({ mac_address: mac }).update({ is_hidden: true, updated_at: new Date() });

    const user = (req as any).user;
    logAudit({
      user_id: user?.id,
      user_email: user?.email,
      action: "delete_node",
      target_mac: mac,
      target_hostname: node.hostname,
      meta: { internal_ip: node.internal_ip, public_ip: node.public_ip },
    });

    await invalidateCache();
    res.send(204);
  });
}
