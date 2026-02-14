"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Box, Typography, Button } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Layout from "@/components/Layout";
import SSHConnectDialog from "@/components/SSHConnectDialog";
import TerminalView from "@/components/TerminalView";
import { apiFetch } from "@/lib/api";

export default function TerminalPage({
  params,
}: {
  params: Promise<{ mac: string }>;
}) {
  const { mac } = use(params);
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(true);
  const [hostname, setHostname] = useState<string | null>(null);

  const decodedMac = decodeURIComponent(mac);

  useEffect(() => {
    apiFetch<{ hostname: string }>(`/api/nodes/${encodeURIComponent(decodedMac)}`)
      .then((node) => setHostname(node.hostname))
      .catch(() => {});
  }, [decodedMac]);

  const handleConnect = (user: string) => {
    setUsername(user);
    setDialogOpen(false);
  };

  const handleCancel = () => {
    router.push("/dashboard");
  };

  return (
    <Layout>
      <Box sx={{ display: "flex", flexDirection: "column", height: "calc(100vh - 100px)" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 }, mb: { xs: 1, sm: 2 } }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push("/dashboard")}
            size="small"
          >
            Back
          </Button>
          <Typography variant="h6" noWrap sx={{ fontSize: { sm: "1.25rem", md: "1.5rem" } }}>
            Terminal — {hostname || decodedMac}
          </Typography>
        </Box>

        {username ? (
          <TerminalView mac={decodedMac} username={username} />
        ) : (
          <SSHConnectDialog
            open={dialogOpen}
            hostname={decodedMac}
            onConnect={handleConnect}
            onCancel={handleCancel}
          />
        )}
      </Box>
    </Layout>
  );
}
