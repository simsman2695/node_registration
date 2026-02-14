import WebSocket from "ws";
import { Client, ClientChannel } from "ssh2";
import { config } from "./config";
import { collectNodeInfo } from "./collector";

interface SshSession {
  ssh: Client;
  stream: ClientChannel;
}

const sshSessions = new Map<string, SshSession>();
let ws: WebSocket | null = null;
let reconnectDelay = 1000;
const MAX_RECONNECT_DELAY = 30000;

export function startTunnel(): void {
  connect();
}

function getWsUrl(): string {
  // Convert http(s)://host:port/api -> ws(s)://host:port/ws/agent
  const url = new URL(config.apiUrl);
  const protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${url.host}/ws/agent`;
}

async function connect(): Promise<void> {
  let mac: string;
  try {
    const info = await collectNodeInfo();
    mac = info.mac_address;
  } catch (err: any) {
    console.error("[tunnel] Failed to get MAC address:", err.message);
    scheduleReconnect();
    return;
  }

  const url = getWsUrl();
  console.log(`[tunnel] Connecting to ${url}`);

  ws = new WebSocket(url);

  let pingInterval: ReturnType<typeof setInterval> | null = null;

  ws.on("open", () => {
    console.log("[tunnel] Connected, authenticating...");
    ws!.send(JSON.stringify({
      type: "auth",
      apiKey: config.apiKey,
      mac,
    }));

    // Keep alive through Cloudflare's idle timeout
    pingInterval = setInterval(() => {
      if (ws!.readyState === WebSocket.OPEN) {
        ws!.ping();
      }
    }, 30000);
  });

  ws.on("message", (raw) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (msg.type) {
      case "auth-ok":
        console.log("[tunnel] Authenticated");
        reconnectDelay = 1000; // Reset on successful auth
        break;

      case "auth-fail":
        console.error("[tunnel] Authentication failed");
        break;

      case "ssh-start":
        handleSshStart(msg.sessionId, msg.username, msg.privateKey);
        break;

      case "ssh-data":
        handleSshData(msg.sessionId, msg.data);
        break;

      case "ssh-resize":
        handleSshResize(msg.sessionId, msg.cols, msg.rows);
        break;

      case "ssh-close":
        handleSshClose(msg.sessionId);
        break;
    }
  });

  ws.on("close", () => {
    console.log("[tunnel] Connection closed");
    if (pingInterval) clearInterval(pingInterval);
    cleanupAllSessions();
    ws = null;
    scheduleReconnect();
  });

  ws.on("error", (err) => {
    console.error("[tunnel] WebSocket error:", err.message);
    // 'close' event will fire after this, triggering reconnect
  });
}

function scheduleReconnect(): void {
  console.log(`[tunnel] Reconnecting in ${reconnectDelay / 1000}s...`);
  setTimeout(() => {
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
    connect();
  }, reconnectDelay);
}

function sendToApi(data: object): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function handleSshStart(sessionId: string, username: string, privateKey: string): void {
  if (!privateKey) {
    sendToApi({ type: "ssh-error", sessionId, message: "No private key provided" });
    return;
  }

  const ssh = new Client();

  ssh.on("ready", () => {
    ssh.shell({ cols: 80, rows: 24, term: "xterm-256color" }, (err, stream) => {
      if (err) {
        sendToApi({ type: "ssh-error", sessionId, message: err.message });
        ssh.end();
        return;
      }

      sshSessions.set(sessionId, { ssh, stream });
      sendToApi({ type: "ssh-ready", sessionId });

      stream.on("data", (data: Buffer) => {
        sendToApi({
          type: "ssh-data",
          sessionId,
          data: data.toString("base64"),
        });
      });

      stream.stderr.on("data", (data: Buffer) => {
        sendToApi({
          type: "ssh-data",
          sessionId,
          data: data.toString("base64"),
        });
      });

      stream.on("close", () => {
        sendToApi({ type: "ssh-close", sessionId });
        sshSessions.delete(sessionId);
        ssh.end();
      });
    });
  });

  ssh.on("error", (err) => {
    sendToApi({ type: "ssh-error", sessionId, message: err.message });
    sshSessions.delete(sessionId);
  });

  ssh.connect({
    host: "localhost",
    port: 22,
    username,
    privateKey,
  });
}

function handleSshData(sessionId: string, data: string): void {
  const session = sshSessions.get(sessionId);
  if (session) {
    session.stream.write(Buffer.from(data, "base64"));
  }
}

function handleSshResize(sessionId: string, cols: number, rows: number): void {
  const session = sshSessions.get(sessionId);
  if (session) {
    session.stream.setWindow(rows, cols, 0, 0);
  }
}

function handleSshClose(sessionId: string): void {
  const session = sshSessions.get(sessionId);
  if (session) {
    session.stream.close();
    session.ssh.end();
    sshSessions.delete(sessionId);
  }
}

function cleanupAllSessions(): void {
  for (const [sessionId, session] of sshSessions) {
    session.stream.close();
    session.ssh.end();
    sshSessions.delete(sessionId);
  }
}
