import http from "http";
import https from "https";
import { config } from "./config";

interface ReportData {
  hostname: string;
  internal_ip: string;
  public_ip: string;
}

export function reportNode(mac: string, data: ReportData): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = new URL(`/api/nodes/${encodeURIComponent(mac)}`, config.apiUrl);
    const body = JSON.stringify(data);
    const transport = url.protocol === "https:" ? https : http;

    const req = transport.request(
      url,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": config.apiKey,
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let responseData = "";
        res.on("data", (chunk) => (responseData += chunk));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(
              new Error(
                `API responded with ${res.statusCode}: ${responseData}`
              )
            );
          }
        });
      }
    );

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}
