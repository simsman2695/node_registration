import { config } from "./config";
import { collectNodeInfo } from "./collector";
import { reportNode } from "./reporter";

async function run(): Promise<void> {
  try {
    const info = await collectNodeInfo();
    console.log(
      `Reporting: ${info.hostname} (${info.mac_address}) - ${info.internal_ip} / ${info.public_ip}`
    );
    await reportNode(info.mac_address, {
      hostname: info.hostname,
      internal_ip: info.internal_ip,
      public_ip: info.public_ip,
    });
    console.log("Report successful");
  } catch (err: any) {
    console.error("Report failed:", err.message || err.code || err);
  }
}

async function main(): Promise<void> {
  console.log(
    `Node registration agent starting (interval: ${config.intervalMs}ms)`
  );
  // Run immediately, then on interval
  await run();
  setInterval(run, config.intervalMs);
}

main();
