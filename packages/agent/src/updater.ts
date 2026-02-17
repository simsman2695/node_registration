import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";
import { config } from "./config";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require("../package.json");

const INSTALL_DIR = path.resolve(__dirname, "..");

let updating = false;

interface VersionInfo {
  version: string;
  sha256: string;
}

function apiGet(urlPath: string): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, config.apiUrl);
    const transport = url.protocol === "https:" ? https : http;

    const req = transport.get(
      url,
      {
        headers: { "X-API-Key": config.apiKey },
        timeout: 15000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () =>
          resolve({ statusCode: res.statusCode || 0, body: data })
        );
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

function downloadToFile(urlPath: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, config.apiUrl);
    const transport = url.protocol === "https:" ? https : http;

    const file = fs.createWriteStream(dest);
    const req = transport.get(
      url,
      {
        headers: { "X-API-Key": config.apiKey },
        timeout: 120000,
      },
      (res) => {
        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(dest);
          reject(new Error(`Download failed with status ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      }
    );
    req.on("error", (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
    req.on("timeout", () => {
      req.destroy();
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(new Error("download timeout"));
    });
  });
}

function sha256File(filePath: string): string {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

function rmrf(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export async function checkForUpdate(): Promise<void> {
  if (updating) return;

  try {
    updating = true;
    const currentVersion = pkg.version;

    // Fetch latest version info
    const resp = await apiGet("/api/agent/version");
    if (resp.statusCode !== 200) {
      console.error(`[updater] Version check failed: HTTP ${resp.statusCode}`);
      return;
    }

    const info: VersionInfo = JSON.parse(resp.body);

    if (info.version === currentVersion) {
      return; // up to date
    }

    console.log(
      `[updater] Update available: ${currentVersion} -> ${info.version}`
    );

    // Download tarball to temp dir
    const tmpDir = fs.mkdtempSync(path.join(INSTALL_DIR, ".update-"));
    const tarball = path.join(tmpDir, "agent.tar.gz");

    try {
      console.log("[updater] Downloading update...");
      await downloadToFile("/api/agent/download", tarball);

      // Verify SHA256
      const hash = sha256File(tarball);
      if (hash !== info.sha256) {
        console.error(
          `[updater] SHA256 mismatch: expected ${info.sha256}, got ${hash}`
        );
        return;
      }
      console.log("[updater] SHA256 verified");

      // Extract to temp dir
      const extractDir = path.join(tmpDir, "extracted");
      fs.mkdirSync(extractDir);
      execSync(`tar -xzf ${tarball} -C ${extractDir}`, { timeout: 30000 });

      // Back up current dist
      const distDir = path.join(INSTALL_DIR, "dist");
      const distBak = path.join(INSTALL_DIR, "dist.bak");
      rmrf(distBak);
      if (fs.existsSync(distDir)) {
        fs.renameSync(distDir, distBak);
      }

      // Copy new files: dist/, node_modules/, package.json
      const newDist = path.join(extractDir, "dist");
      const newModules = path.join(extractDir, "node_modules");
      const newPkg = path.join(extractDir, "package.json");

      if (fs.existsSync(newDist)) {
        execSync(`cp -r ${newDist} ${distDir}`, { timeout: 30000 });
      }
      if (fs.existsSync(newModules)) {
        rmrf(path.join(INSTALL_DIR, "node_modules"));
        execSync(`cp -r ${newModules} ${path.join(INSTALL_DIR, "node_modules")}`, {
          timeout: 60000,
        });
      }
      if (fs.existsSync(newPkg)) {
        fs.copyFileSync(newPkg, path.join(INSTALL_DIR, "package.json"));
      }

      console.log(
        `[updater] Update applied successfully (${currentVersion} -> ${info.version}). Exiting for restart...`
      );

      // Clean up temp dir before exiting
      rmrf(tmpDir);

      // Exit — systemd will restart us with the new code
      process.exit(0);
    } catch (err: any) {
      console.error("[updater] Update failed:", err.message || err);
      // Restore backup if we moved dist
      const distDir = path.join(INSTALL_DIR, "dist");
      const distBak = path.join(INSTALL_DIR, "dist.bak");
      if (!fs.existsSync(distDir) && fs.existsSync(distBak)) {
        fs.renameSync(distBak, distDir);
        console.log("[updater] Restored dist from backup");
      }
    } finally {
      // Clean up temp dir on failure
      if (fs.existsSync(path.join(tmpDir))) {
        rmrf(tmpDir);
      }
    }
  } catch (err: any) {
    console.error("[updater] Check failed:", err.message || err);
  } finally {
    updating = false;
  }
}
