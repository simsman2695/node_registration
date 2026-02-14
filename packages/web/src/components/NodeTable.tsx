"use client";

import { useRouter } from "next/navigation";
import { DataGrid, GridColDef, GridSortModel } from "@mui/x-data-grid";
import {
  Box,
  Card,
  CardContent,
  IconButton,
  List,
  ListItem,
  Skeleton,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import TerminalIcon from "@mui/icons-material/Terminal";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

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
  onRemove?: (mac: string) => void;
}

function NodeCardList({
  nodes,
  loading,
  onRemove,
}: Pick<NodeTableProps, "nodes" | "loading" | "onRemove">) {
  const router = useRouter();

  if (loading) {
    return (
      <List disablePadding>
        {[0, 1, 2].map((i) => (
          <ListItem key={i} disablePadding sx={{ mb: 1 }}>
            <Skeleton variant="rounded" width="100%" height={100} />
          </ListItem>
        ))}
      </List>
    );
  }

  return (
    <List disablePadding>
      {nodes.map((node) => (
        <ListItem key={node.id} disablePadding sx={{ mb: 1 }}>
          <Card variant="outlined" sx={{ width: "100%" }}>
            <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle2" noWrap>
                    {node.hostname}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {node.last_seen
                      ? new Date(node.last_seen).toLocaleString()
                      : "Never"}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", ml: 1 }}>
                  <Tooltip title="SSH">
                    <IconButton
                      size="small"
                      onClick={() =>
                        router.push(
                          `/terminal/${encodeURIComponent(node.mac_address)}`,
                        )
                      }
                    >
                      <TerminalIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remove">
                    <IconButton
                      size="small"
                      onClick={() => onRemove?.(node.mac_address)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </ListItem>
      ))}
    </List>
  );
}

export default function NodeTable({
  nodes,
  pagination,
  loading,
  onPaginationChange,
  onSortChange,
  onRemove,
}: NodeTableProps) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const page = Math.floor(pagination.offset / pagination.limit);

  if (isMobile) {
    return (
      <Box sx={{ width: "100%" }}>
        <NodeCardList nodes={nodes} loading={loading} onRemove={onRemove} />
      </Box>
    );
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
    {
      field: "actions",
      headerName: "",
      width: 100,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <>
          <Tooltip title="SSH">
            <IconButton
              size="small"
              onClick={() =>
                router.push(
                  `/terminal/${encodeURIComponent(params.row.mac_address)}`,
                )
              }
            >
              <TerminalIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Remove">
            <IconButton
              size="small"
              onClick={() => onRemove?.(params.row.mac_address)}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

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
