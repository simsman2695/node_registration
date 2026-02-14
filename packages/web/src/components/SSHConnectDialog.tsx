"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";

interface SSHConnectDialogProps {
  open: boolean;
  hostname: string;
  onConnect: (username: string) => void;
  onCancel: () => void;
}

export default function SSHConnectDialog({
  open,
  hostname,
  onConnect,
  onCancel,
}: SSHConnectDialogProps) {
  const [username, setUsername] = useState("");

  const handleConnect = () => {
    if (username.trim()) {
      onConnect(username.trim());
    }
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>SSH to {hostname}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConnect();
          }}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          onClick={handleConnect}
          variant="contained"
          disabled={!username.trim()}
        >
          Connect
        </Button>
      </DialogActions>
    </Dialog>
  );
}
