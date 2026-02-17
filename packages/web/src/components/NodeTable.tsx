"use client";

import { useRouter } from "next/navigation";
import { DataGrid, GridColDef, GridSortModel } from "@mui/x-data-grid";
import {
  Box,
  Card,
  CardContent,
  Chip,
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
import EditIcon from "@mui/icons-material/Edit";

interface Node {
  id: number;
  mac_address: string;
  hostname: string;
  internal_ip: string;
  public_ip: string;
  os_info: string;
  kernel: string;
  build: string;
  agent_version: string;
  last_seen: string;
  metadata: Record<string, string>;
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
  onEditMetadata?: (mac: string, metadata: Record<string, string>) => void;
}

function NodeCardList({
  nodes,
  loading,
  onRemove,
  onEditMetadata,
}: Pick<NodeTableProps, "nodes" | "loading" | "onRemove" | "onEditMetadata">) {
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
                  {node.os_info && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {node.os_info}{node.agent_version ? ` · Agent v${node.agent_version}` : ""}
                    </Typography>
                  )}
                  {node.metadata && Object.keys(node.metadata).length > 0 && (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
                      {Object.entries(node.metadata).map(([k, v]) => (
                        <Chip key={k} label={`${k}: ${v}`} size="small" variant="outlined" />
                      ))}
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: "flex", ml: 1 }}>
                  <Tooltip title="Edit metadata">
                    <IconButton
                      size="small"
                      onClick={() => onEditMetadata?.(node.mac_address, node.metadata || {})}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
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
  onEditMetadata,
}: NodeTableProps) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const page = Math.floor(pagination.offset / pagination.limit);

  if (isMobile) {
    return (
      <Box sx={{ width: "100%" }}>
        <NodeCardList nodes={nodes} loading={loading} onRemove={onRemove} onEditMetadata={onEditMetadata} />
      </Box>
    );
  }

  const columns: GridColDef[] = [
    { field: "hostname", headerName: "Hostname", flex: 1, minWidth: 150 },
    { field: "mac_address", headerName: "MAC Address", flex: 1, minWidth: 160 },
    { field: "internal_ip", headerName: "Internal IP", flex: 1, minWidth: 130 },
    { field: "public_ip", headerName: "Public IP", flex: 1, minWidth: 130 },
    { field: "os_info", headerName: "OS", flex: 1, minWidth: 150 },
    { field: "kernel", headerName: "Kernel", flex: 1, minWidth: 140 },
    { field: "agent_version", headerName: "Agent", flex: 0.5, minWidth: 80 },
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
      width: 140,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <>
          <Tooltip title="Edit metadata">
            <IconButton
              size="small"
              onClick={() => onEditMetadata?.(params.row.mac_address, params.row.metadata || {})}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
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
