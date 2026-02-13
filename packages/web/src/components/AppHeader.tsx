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

export default function AppHeader() {
  const { user, logout } = useAuth();

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Node Registration
        </Typography>
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
