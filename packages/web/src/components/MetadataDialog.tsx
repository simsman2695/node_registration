"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

interface MetadataDialogProps {
  open: boolean;
  mac: string;
  initialMetadata: Record<string, string>;
  onSave: (metadata: Record<string, string>) => void;
  onClose: () => void;
}

interface MetadataEntry {
  key: string;
  value: string;
}

export default function MetadataDialog({
  open,
  mac,
  initialMetadata,
  onSave,
  onClose,
}: MetadataDialogProps) {
  const [entries, setEntries] = useState<MetadataEntry[]>(() =>
    Object.entries(initialMetadata).length > 0
      ? Object.entries(initialMetadata).map(([key, value]) => ({ key, value }))
      : [{ key: "", value: "" }]
  );

  const handleChange = (index: number, field: "key" | "value", val: string) => {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, [field]: val } : e)));
  };

  const handleAdd = () => {
    setEntries((prev) => [...prev, { key: "", value: "" }]);
  };

  const handleRemove = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const metadata: Record<string, string> = {};
    for (const { key, value } of entries) {
      const trimmed = key.trim();
      if (trimmed) {
        metadata[trimmed] = value;
      }
    }
    onSave(metadata);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Metadata — {mac}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
          {entries.map((entry, i) => (
            <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <TextField
                size="small"
                label="Key"
                value={entry.key}
                onChange={(e) => handleChange(i, "key", e.target.value)}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Value"
                value={entry.value}
                onChange={(e) => handleChange(i, "value", e.target.value)}
                sx={{ flex: 1 }}
              />
              <IconButton size="small" onClick={() => handleRemove(i)}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Button startIcon={<AddIcon />} size="small" onClick={handleAdd} sx={{ alignSelf: "flex-start" }}>
            Add field
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}
