"use client";

import { DataGrid, GridColDef, GridSortModel } from "@mui/x-data-grid";
import { Box } from "@mui/material";

interface Node {
  id: number;
  mac_address: string;
  hostname: string;
  internal_ip: string;
  public_ip: string;
  last_seen: string;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
}

interface NodeTableProps {
  nodes: Node[];
  pagination: Pagination;
  loading: boolean;
  onPaginationChange: (page: number, pageSize: number) => void;
  onSortChange: (sort: string, order: "asc" | "desc") => void;
}

const columns: GridColDef[] = [
  { field: "hostname", headerName: "Hostname", flex: 1, minWidth: 150 },
  { field: "mac_address", headerName: "MAC Address", flex: 1, minWidth: 160 },
  { field: "internal_ip", headerName: "Internal IP", flex: 1, minWidth: 130 },
  { field: "public_ip", headerName: "Public IP", flex: 1, minWidth: 130 },
  {
    field: "last_seen",
    headerName: "Last Seen",
    flex: 1,
    minWidth: 180,
    valueFormatter: (value: string) => {
      if (!value) return "";
      return new Date(value).toLocaleString();
    },
  },
];

export default function NodeTable({
  nodes,
  pagination,
  loading,
  onPaginationChange,
  onSortChange,
}: NodeTableProps) {
  const page = Math.floor(pagination.offset / pagination.limit);

  const handleSortModelChange = (model: GridSortModel) => {
    if (model.length > 0) {
      onSortChange(model[0].field, model[0].sort || "desc");
    } else {
      onSortChange("last_seen", "desc");
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <DataGrid
        rows={nodes}
        columns={columns}
        rowCount={pagination.total}
        loading={loading}
        pageSizeOptions={[10, 25, 50]}
        paginationModel={{ page, pageSize: pagination.limit }}
        paginationMode="server"
        sortingMode="server"
        onPaginationModelChange={(model) =>
          onPaginationChange(model.page, model.pageSize)
        }
        onSortModelChange={handleSortModelChange}
        disableRowSelectionOnClick
        autoHeight
        sx={{
          "& .MuiDataGrid-cell": { borderColor: "divider" },
          "& .MuiDataGrid-columnHeaders": { borderColor: "divider" },
        }}
      />
    </Box>
  );
}
