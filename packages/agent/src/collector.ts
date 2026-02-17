import os from "os";
import { execSync } from "child_process";
import https from "https";
import { config } from "./config";

const SKIP_PREFIXES = ["veth", "br-", "docker", "lo", "virbr"];

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require("../package.json");

interface NodeInfo {
  hostname: string;
  mac_address: string;
  internal_ip: string;
  public_ip: string;
  os_info: string;
  kernel: string;
  build: string;
  agent_version: string;
}

function getMacAndIp(): { mac: string; ip: string } {
  if (config.macOverride) {
    // Still need to find an IP
    const interfaces = os.networkInterfaces();
    let ip = "127.0.0.1";
    for (const [, addrs] of Object.entries(interfaces)) {
      for (const addr of addrs || []) {
        if (!addr.internal && addr.family === "IPv4") {
          ip = addr.address;
          break;
        }
      }
    }
    return { mac: config.macOverride.toUpperCase(), ip };
  }

  const interfaces = os.networkInterfaces();
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (SKIP_PREFIXES.some((p) => name.startsWith(p))) continue;

    for (const addr of addrs || []) {
      if (!addr.internal && addr.family === "IPv4" && addr.mac !== "00:00:00:00:00:00") {
        return {
          mac: addr.mac.toUpperCase(),
          ip: addr.address,
        };
      }
    }
  }

  throw new Error("No suitable network interface found");
}

const PUBLIC_IP_SERVICES = [
  "https://api.ipify.org?format=json",
  "https://ifconfig.me/ip",
  "https://icanhazip.com",
];

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 5000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data.trim()));
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
  });
}

async function getPublicIp(): Promise<string> {
  for (const url of PUBLIC_IP_SERVICES) {
    try {
      const body = await fetchUrl(url);
      // ipify returns JSON, others return plain text
      if (body.startsWith("{")) {
        return JSON.parse(body).ip;
      }
      return body;
    } catch {
      continue;
    }
  }
  return "unknown";
}

function shellExec(cmd: string): string {
  try {
    return execSync(cmd, { timeout: 5000 }).toString().trim();
  } catch {
    return "unknown";
  }
}

function getSystemInfo(): { os_info: string; kernel: string; build: string } {
  const platform = os.platform();

  if (platform === "linux") {
    // e.g. "Ubuntu 22.04.3 LTS" or falls back to generic
    const osInfo =
      shellExec("lsb_release -ds 2>/dev/null") ||
      shellExec("cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2 | tr -d '\"'") ||
      `${platform} ${os.arch()}`;
    const kernel = shellExec("uname -r");
    const build = shellExec("uname -v");
    return { os_info: osInfo, kernel, build };
  }

  if (platform === "darwin") {
    const osInfo = shellExec("sw_vers -productName") + " " + shellExec("sw_vers -productVersion");
    const kernel = shellExec("uname -r");
    const build = shellExec("sw_vers -buildVersion");
    return { os_info: osInfo.trim(), kernel, build };
  }

  if (platform === "win32") {
    const osInfo = shellExec('wmic os get Caption /value 2>nul | find "="').replace("Caption=", "") || "Windows";
    const kernel = os.release();
    const build = shellExec('wmic os get BuildNumber /value 2>nul | find "="').replace("BuildNumber=", "") || "unknown";
    return { os_info: osInfo.trim(), kernel, build };
  }

  return { os_info: `${platform} ${os.arch()}`, kernel: os.release(), build: "unknown" };
}

export async function collectNodeInfo(): Promise<NodeInfo> {
  const hostname = os.hostname();
  const { mac, ip } = getMacAndIp();
  const publicIp = await getPublicIp();
  const { os_info, kernel, build } = getSystemInfo();

  return {
    hostname,
    mac_address: mac,
    internal_ip: ip,
    public_ip: publicIp,
    os_info,
    kernel,
    build,
    agent_version: pkg.version,
  };
}
