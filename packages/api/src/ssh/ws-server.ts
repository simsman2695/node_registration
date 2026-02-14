import http from "http";
import crypto from "crypto";
import { readFileSync } from "fs";
import { WebSocketServer, WebSocket } from "ws";
import { unsign } from "cookie-signature";
import redis from "../redis";
import { config } from "../config";
import db from "../db";
import { logAudit } from "../audit";

// Agent connections keyed by MAC address
const agents = new Map<string, WebSocket>();

// Active SSH sessions keyed by session UUID
interface Session {
  browserWs: WebSocket;
  agentWs: WebSocket;
}
const sessions = new Map<string, Session>();

export function setupWebSocketServer(httpServer: http.Server): void {
  const browserWss = new WebSocketServer({ noServer: true });
  const agentWss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", async (req, socket, head) => {
    if (req.url === "/ws/ssh") {
      // Browser connection — authenticate via session cookie
      const sessionId = getSessionId(req.headers.cookie);
      if (!sessionId) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      const sessionData = await redis.get(`sess:${sessionId}`);
      if (!sessionData) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      let session: { passport?: { user?: number } };
      try {
        session = JSON.parse(sessionData);
      } catch {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      if (!session.passport?.user) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      const userId = session.passport.user;
      browserWss.handleUpgrade(req, socket, head, (ws) => {
        browserWss.emit("connection", ws, req);
        handleBrowserConnection(ws, userId);
      });
    } else if (req.url === "/ws/agent") {
      // Agent connection — auth happens after WS upgrade via first message
      agentWss.handleUpgrade(req, socket, head, (ws) => {
        agentWss.emit("connection", ws, req);
        handleAgentConnection(ws);
      });
    } else {
      socket.destroy();
    }
  });
}

function getSessionId(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").reduce(
    (acc, cookie) => {
      const [key, ...rest] = cookie.trim().split("=");
      acc[key] = rest.join("=");
      return acc;
    },
    {} as Record<string, string>,
  );

  const raw = cookies["connect.sid"];
  if (!raw) return null;

  const decoded = decodeURIComponent(raw);
  if (decoded.startsWith("s:")) {
    const unsigned = unsign(decoded.slice(2), config.sessionSecret);
    return unsigned === false ? null : unsigned;
  }

  return decoded;
}

// ── Browser connection handler ──────────────────────────────────────────────

function handleBrowserConnection(ws: WebSocket, userId: number): void {
  let sessionId: string | null = null;

  // Keep alive through Cloudflare's idle timeout
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.ping();
  }, 30000);

  ws.on("message", (raw) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (msg.type) {
      case "connect": {
        if (sessionId || !msg.mac || !msg.username) return;

        const agentWs = agents.get(msg.mac);
        if (!agentWs || agentWs.readyState !== WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "error", message: "Node agent is not connected" }));
          ws.close();
          return;
        }

        sessionId = crypto.randomUUID();
        sessions.set(sessionId, { browserWs: ws, agentWs });

        let privateKey: string;
        try {
          privateKey = readFileSync(config.sshKeyPath, "utf-8");
        } catch {
          ws.send(JSON.stringify({ type: "error", message: "SSH key not found on server" }));
          ws.close();
          sessions.delete(sessionId);
          sessionId = null;
          return;
        }

        agentWs.send(JSON.stringify({
          type: "ssh-start",
          sessionId,
          username: msg.username,
          privateKey,
        }));

        // Audit log — look up user and node in parallel
        Promise.all([
          db("users").where({ id: userId }).first(),
          db("nodes").where({ mac_address: msg.mac }).first(),
        ]).then(([user, node]) => {
          logAudit({
            user_id: userId,
            user_email: user?.email,
            action: "ssh_connect",
            target_mac: msg.mac,
            target_hostname: node?.hostname,
            meta: { ssh_username: msg.username },
          });
        });
        break;
      }

      case "input": {
        if (!sessionId || !msg.data) return;
        const session = sessions.get(sessionId);
        if (!session) return;

        session.agentWs.send(JSON.stringify({
          type: "ssh-data",
          sessionId,
          data: Buffer.from(msg.data).toString("base64"),
        }));
        break;
      }

      case "resize": {
        if (!sessionId || !msg.cols || !msg.rows) return;
        const session = sessions.get(sessionId);
        if (!session) return;

        session.agentWs.send(JSON.stringify({
          type: "ssh-resize",
          sessionId,
          cols: msg.cols,
          rows: msg.rows,
        }));
        break;
      }
    }
  });

  ws.on("close", () => {
    clearInterval(pingInterval);
    if (sessionId) {
      const session = sessions.get(sessionId);
      if (session) {
        session.agentWs.send(JSON.stringify({ type: "ssh-close", sessionId }));
        sessions.delete(sessionId);
      }
    }
  });
}

// ── Agent connection handler ────────────────────────────────────────────────

function handleAgentConnection(ws: WebSocket): void {
  let authenticated = false;
  let agentMac: string | null = null;

  // Require auth within 10 seconds
  const authTimeout = setTimeout(() => {
    if (!authenticated) {
      ws.close(4001, "Auth timeout");
    }
  }, 10000);

  ws.on("message", (raw) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (!authenticated) {
      if (msg.type !== "auth" || !msg.apiKey || !msg.mac) {
        ws.close(4002, "Invalid auth");
        return;
      }

      // Validate API key (same logic as api-key middleware)
      const keyHash = crypto.createHash("sha256").update(msg.apiKey).digest("hex");
      db("api_keys")
        .where({ key_hash: keyHash, is_active: true })
        .first()
        .then((row) => {
          if (!row) {
            ws.send(JSON.stringify({ type: "auth-fail" }));
            ws.close(4003, "Invalid API key");
            return;
          }

          clearTimeout(authTimeout);
          authenticated = true;
          agentMac = msg.mac.toUpperCase();

          // Close any existing connection for this MAC
          const existing = agents.get(agentMac!);
          if (existing && existing.readyState === WebSocket.OPEN) {
            existing.close(4004, "Replaced by new connection");
          }

          agents.set(agentMac!, ws);
          ws.send(JSON.stringify({ type: "auth-ok" }));
          console.log(`Agent connected: ${agentMac}`);
        })
        .catch(() => {
          ws.send(JSON.stringify({ type: "auth-fail" }));
          ws.close(4003, "Auth error");
        });
      return;
    }

    // Authenticated agent messages
    switch (msg.type) {
      case "ssh-ready": {
        if (!msg.sessionId) return;
        const session = sessions.get(msg.sessionId);
        if (session) {
          session.browserWs.send(JSON.stringify({ type: "connected" }));
        }
        break;
      }

      case "ssh-data": {
        if (!msg.sessionId || !msg.data) return;
        const session = sessions.get(msg.sessionId);
        if (session && session.browserWs.readyState === WebSocket.OPEN) {
          session.browserWs.send(JSON.stringify({
            type: "output",
            data: Buffer.from(msg.data, "base64").toString("utf-8"),
          }));
        }
        break;
      }

      case "ssh-error": {
        if (!msg.sessionId) return;
        const session = sessions.get(msg.sessionId);
        if (session) {
          session.browserWs.send(JSON.stringify({
            type: "error",
            message: msg.message || "SSH error on agent",
          }));
        }
        break;
      }

      case "ssh-close": {
        if (!msg.sessionId) return;
        const session = sessions.get(msg.sessionId);
        if (session) {
          session.browserWs.send(JSON.stringify({ type: "disconnected" }));
          session.browserWs.close();
          sessions.delete(msg.sessionId);
        }
        break;
      }
    }
  });

  ws.on("close", () => {
    clearTimeout(authTimeout);

    if (agentMac) {
      // Only remove from registry if this is still the current connection
      if (agents.get(agentMac) === ws) {
        agents.delete(agentMac);
        console.log(`Agent disconnected: ${agentMac}`);
      }

      // Close all sessions that were using this agent
      for (const [sid, session] of sessions) {
        if (session.agentWs === ws) {
          session.browserWs.send(JSON.stringify({
            type: "error",
            message: "Agent disconnected",
          }));
          session.browserWs.close();
          sessions.delete(sid);
        }
      }
    }
  });
}
