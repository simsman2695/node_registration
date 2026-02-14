"use client";

import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Avatar,
  Box,
} from "@mui/material";
import { useAuth } from "@/hooks/useAuth";
import { APP_VERSION } from "@/lib/version";

export default function AppHeader() {
  const { user, logout } = useAuth();

  return (
    <AppBar position="static">
      <Toolbar>
        <Box sx={{ flexGrow: 1, display: "flex", alignItems: "baseline", gap: 1 }}>
          <Typography variant="h6">Node Registration</Typography>
          <Typography variant="caption" color="inherit" sx={{ opacity: 0.6 }}>
            v{APP_VERSION}
          </Typography>
        </Box>
        {user && (
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="body2" sx={{ display: { xs: "none", sm: "block" } }}>
              {user.email}
            </Typography>
            {user.avatar_url && (
              <Avatar src={user.avatar_url} sx={{ width: 32, height: 32 }} />
            )}
            <Button color="inherit" onClick={logout} size="small">
              Logout
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
