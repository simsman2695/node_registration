import { config } from "./config";
import { collectNodeInfo } from "./collector";
import { reportNode } from "./reporter";
import { checkForUpdate } from "./updater";

async function run(): Promise<void> {
  try {
    const info = await collectNodeInfo();
    console.log(
      `Reporting: ${info.hostname} (${info.mac_address}) - ${info.internal_ip} / ${info.public_ip} [${info.os_info}, agent v${info.agent_version}]`
    );
    await reportNode(info.mac_address, {
      hostname: info.hostname,
      internal_ip: info.internal_ip,
      public_ip: info.public_ip,
      os_info: info.os_info,
      kernel: info.kernel,
      build: info.build,
      agent_version: info.agent_version,
    });
    console.log("Report successful");

    // Check for agent updates after successful heartbeat
    await checkForUpdate();
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

  // Start persistent WebSocket tunnel for SSH relay
  import("./tunnel")
    .then((m) => m.startTunnel())
    .catch((err) => console.error("[tunnel] Failed to load:", err.message));
}

main();
