"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

interface TerminalViewProps {
  mac: string;
  username: string;
}

export default function TerminalView({ mac, username }: TerminalViewProps) {
  const termRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("connecting");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!termRef.current) return;

    const isMobile = window.innerWidth < 600;
    const terminal = new Terminal({
      cursorBlink: true,
      theme: {
        background: "#121212",
        foreground: "#e0e0e0",
      },
      fontFamily: "'Fira Code', 'Cascadia Code', 'Menlo', monospace",
      fontSize: isMobile ? 10 : 14,
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(termRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitRef.current = fitAddon;

    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${location.host}/ws/ssh`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "connect", mac, username }));
    };

    ws.onmessage = (event) => {
      let msg: { type: string; data?: string; message?: string };
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (msg.type) {
        case "connected":
          setStatus("connected");
          terminal.focus();
          break;
        case "output":
          if (msg.data) terminal.write(msg.data);
          break;
        case "error":
          setStatus("error");
          setErrorMsg(msg.message || "Connection error");
          terminal.writeln(`\r\n\x1b[31mError: ${msg.message}\x1b[0m`);
          break;
        case "disconnected":
          setStatus("disconnected");
          terminal.writeln("\r\n\x1b[33mConnection closed.\x1b[0m");
          break;
      }
    };

    ws.onclose = () => {
      if (status !== "error") {
        setStatus("disconnected");
      }
    };

    ws.onerror = () => {
      setStatus("error");
      setErrorMsg("WebSocket connection failed");
    };

    terminal.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "input", data }));
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "resize",
            cols: terminal.cols,
            rows: terminal.rows,
          }),
        );
      }
    });
    resizeObserver.observe(termRef.current);

    return () => {
      resizeObserver.disconnect();
      ws.close();
      terminal.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mac, username]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
        {status === "connecting" && "Connecting..."}
        {status === "connected" && `Connected as ${username}`}
        {status === "disconnected" && "Disconnected"}
        {status === "error" && `Error: ${errorMsg}`}
      </Typography>
      <Box
        ref={termRef}
        sx={{
          flexGrow: 1,
          bgcolor: "#121212",
          borderRadius: 1,
          overflow: "hidden",
          minHeight: { xs: 200, sm: 400 },
        }}
      />
    </Box>
  );
}
