"use client";

import useSWR from "swr";
import { apiFetch } from "@/lib/api";

interface User {
  id: number;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function useAuth() {
  const { data, error, isLoading, mutate } = useSWR<User>(
    "/auth/me",
    (url: string) => apiFetch<User>(url),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const logout = async () => {
    await apiFetch("/auth/logout", { method: "POST" });
    mutate(undefined, false);
  };

  return {
    user: data,
    isLoading,
    isAuthenticated: !!data && !error,
    error,
    logout,
    mutate,
  };
}
