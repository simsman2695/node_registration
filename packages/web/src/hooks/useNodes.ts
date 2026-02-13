"use client";

import useSWR from "swr";
import { apiFetch } from "@/lib/api";

interface Node {
  id: number;
  mac_address: string;
  hostname: string;
  internal_ip: string;
  public_ip: string;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

interface PaginatedResponse {
  data: Node[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

interface UseNodesParams {
  limit?: number;
  offset?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
}

export function useNodes(params: UseNodesParams = {}) {
  const { limit = 25, offset = 0, search = "", sort = "last_seen", order = "desc" } = params;

  const queryString = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    sort,
    order,
    ...(search && { search }),
  }).toString();

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse>(
    `/api/nodes?${queryString}`,
    (url: string) => apiFetch<PaginatedResponse>(url),
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
    }
  );

  return {
    nodes: data?.data || [],
    pagination: data?.pagination || { total: 0, limit, offset },
    isLoading,
    error,
    mutate,
  };
}
