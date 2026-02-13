import os from "os";
import https from "https";
import { config } from "./config";

const SKIP_PREFIXES = ["veth", "br-", "docker", "lo", "virbr"];

interface NodeInfo {
  hostname: string;
  mac_address: string;
  internal_ip: string;
  public_ip: string;
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

export async function collectNodeInfo(): Promise<NodeInfo> {
  const hostname = os.hostname();
  const { mac, ip } = getMacAndIp();
  const publicIp = await getPublicIp();

  return {
    hostname,
    mac_address: mac,
    internal_ip: ip,
    public_ip: publicIp,
  };
}
