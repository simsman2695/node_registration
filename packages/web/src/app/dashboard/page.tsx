"use client";

import { useState, useCallback } from "react";
import { Box, Typography } from "@mui/material";
import Layout from "@/components/Layout";
import NodeTable from "@/components/NodeTable";
import MetadataDialog from "@/components/MetadataDialog";
import SearchBar from "@/components/SearchBar";
import { useNodes } from "@/hooks/useNodes";
import { apiFetch } from "@/lib/api";

export default function DashboardPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState("last_seen");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const [metadataTarget, setMetadataTarget] = useState<{
    mac: string;
    metadata: Record<string, string>;
  } | null>(null);

  const { nodes, pagination, isLoading, mutate } = useNodes({
    limit: pageSize,
    offset: page * pageSize,
    search,
    sort,
    order,
  });

  const handleSearch = useCallback((query: string) => {
    setSearch(query);
    setPage(0);
  }, []);

  const handlePaginationChange = useCallback(
    (newPage: number, newPageSize: number) => {
      setPage(newPage);
      setPageSize(newPageSize);
    },
    []
  );

  const handleSortChange = useCallback(
    (newSort: string, newOrder: "asc" | "desc") => {
      setSort(newSort);
      setOrder(newOrder);
    },
    []
  );

  const handleRemove = useCallback(
    async (mac: string) => {
      await apiFetch(`/api/nodes/${encodeURIComponent(mac)}`, { method: "DELETE" });
      mutate();
    },
    [mutate]
  );

  const handleOpenMetadata = useCallback(
    (mac: string, metadata: Record<string, string>) => {
      setMetadataTarget({ mac, metadata });
    },
    []
  );

  const handleSaveMetadata = useCallback(
    async (metadata: Record<string, string>) => {
      if (!metadataTarget) return;
      await apiFetch(`/api/nodes/${encodeURIComponent(metadataTarget.mac)}/metadata`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata }),
      });
      setMetadataTarget(null);
      mutate();
    },
    [metadataTarget, mutate]
  );

  return (
    <Layout>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Typography variant="h4">Registered Nodes</Typography>
        <SearchBar onSearch={handleSearch} />
        <NodeTable
          nodes={nodes}
          pagination={pagination}
          loading={isLoading}
          onPaginationChange={handlePaginationChange}
          onSortChange={handleSortChange}
          onRemove={handleRemove}
          onEditMetadata={handleOpenMetadata}
        />
      </Box>
      {metadataTarget && (
        <MetadataDialog
          open
          mac={metadataTarget.mac}
          initialMetadata={metadataTarget.metadata}
          onSave={handleSaveMetadata}
          onClose={() => setMetadataTarget(null)}
        />
      )}
    </Layout>
  );
}
