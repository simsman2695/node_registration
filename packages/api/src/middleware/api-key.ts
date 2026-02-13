import { Next, Request, Response } from "restify";
import crypto from "crypto";
import db from "../db";

export function apiKeyAuth(req: Request, res: Response, next: Next): void {
  const apiKey = req.header("X-API-Key");
  if (!apiKey) {
    return next();
  }

  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
  db("api_keys")
    .where({ key_hash: keyHash, is_active: true })
    .first()
    .then((row) => {
      if (row) {
        (req as any).apiKeyAuthenticated = true;
      }
      return next();
    })
    .catch((err) => next(err));
}

export function requireApiKey(
  req: Request,
  res: Response,
  next: Next
): void {
  if ((req as any).apiKeyAuthenticated || (req as any).session?.passport?.user) {
    return next();
  }
  res.send(401, { error: "Unauthorized" });
  return next(false);
}
