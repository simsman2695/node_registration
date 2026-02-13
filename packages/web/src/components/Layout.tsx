"use client";

import { Box } from "@mui/material";
import AppHeader from "./AppHeader";
import AuthGuard from "./AuthGuard";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <AppHeader />
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          {children}
        </Box>
      </Box>
    </AuthGuard>
  );
}
