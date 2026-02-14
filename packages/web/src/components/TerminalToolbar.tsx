"use client";

import { Box, Button } from "@mui/material";

const KEY_COMBOS = [
  { label: "^C", sequence: "\x03" },
  { label: "^D", sequence: "\x04" },
  { label: "^Z", sequence: "\x1a" },
  { label: "^L", sequence: "\x0c" },
  { label: "^A", sequence: "\x01" },
  { label: "^E", sequence: "\x05" },
  { label: "Tab", sequence: "\x09" },
  { label: "Esc", sequence: "\x1b" },
  { label: "\u2191", sequence: "\x1b[A" },
  { label: "\u2193", sequence: "\x1b[B" },
  { label: "\u2190", sequence: "\x1b[D" },
  { label: "\u2192", sequence: "\x1b[C" },
] as const;

interface TerminalToolbarProps {
  onSend: (data: string) => void;
}

export default function TerminalToolbar({ onSend }: TerminalToolbarProps) {
  return (
    <Box
      onMouseDown={(e) => e.preventDefault()}
      sx={{
        display: "flex",
        gap: 0.5,
        py: 1,
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {KEY_COMBOS.map(({ label, sequence }) => (
        <Button
          key={label}
          variant="outlined"
          size="small"
          onClick={() => onSend(sequence)}
          sx={{
            minWidth: 40,
            fontFamily: "monospace",
            fontSize: "0.75rem",
            flexShrink: 0,
          }}
        >
          {label}
        </Button>
      ))}
    </Box>
  );
}
