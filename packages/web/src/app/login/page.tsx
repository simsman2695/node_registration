"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const error = searchParams.get("error");

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <Card sx={{ maxWidth: 400, width: "100%", mx: 2 }}>
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          p: 4,
        }}
      >
        <Typography variant="h4" component="h1">
          Node Registration
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center">
          Sign in with your @cpedge.ai Google account to view registered nodes.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ width: "100%" }}>
            Authentication failed. Only @cpedge.ai accounts are allowed.
          </Alert>
        )}
        <Button
          variant="contained"
          size="large"
          href="/auth/google"
          fullWidth
        >
          Sign in with Google
        </Button>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
    >
      <Suspense fallback={<CircularProgress />}>
        <LoginContent />
      </Suspense>
    </Box>
  );
}
