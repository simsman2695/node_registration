"use client";

import { useState, useCallback } from "react";
import { Box, Typography } from "@mui/material";
import Layout from "@/components/Layout";
import NodeTable from "@/components/NodeTable";
import SearchBar from "@/components/SearchBar";
import { useNodes } from "@/hooks/useNodes";

export default function DashboardPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState("last_seen");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const { nodes, pagination, isLoading } = useNodes({
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
        />
      </Box>
    </Layout>
  );
}
