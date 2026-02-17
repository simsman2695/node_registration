import fs from "fs";
import path from "path";
import { Server, Request, Response } from "restify";
import { requireApiKey } from "../middleware/api-key";
import { config } from "../config";

interface Manifest {
  version: string;
  sha256: string;
  filename: string;
  timestamp: string;
}

function readManifest(): Manifest | null {
  const manifestPath = path.join(config.agentReleasesDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) return null;
  return JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
}

export function registerAgentReleaseRoutes(server: Server): void {
  // GET /api/agent/version — return latest version info
  server.get(
    "/api/agent/version",
    requireApiKey,
    async (req: Request, res: Response) => {
      const manifest = readManifest();
      if (!manifest) {
        res.send(404, { error: "No agent release available" });
        return;
      }
      res.send(200, { version: manifest.version, sha256: manifest.sha256 });
    }
  );

  // GET /api/agent/download — stream the tarball
  server.get(
    "/api/agent/download",
    requireApiKey,
    async (req: Request, res: Response) => {
      const manifest = readManifest();
      if (!manifest) {
        res.send(404, { error: "No agent release available" });
        return;
      }

      const tarballPath = path.join(
        config.agentReleasesDir,
        manifest.filename
      );
      if (!fs.existsSync(tarballPath)) {
        res.send(404, { error: "Release tarball not found" });
        return;
      }

      const stat = fs.statSync(tarballPath);
      res.writeHead(200, {
        "Content-Type": "application/gzip",
        "Content-Length": stat.size,
        "Content-Disposition": `attachment; filename="${manifest.filename}"`,
      });
      fs.createReadStream(tarballPath).pipe(res);
    }
  );
}
