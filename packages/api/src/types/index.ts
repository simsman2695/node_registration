export interface Node {
  id: number;
  mac_address: string;
  hostname: string;
  internal_ip: string;
  public_ip: string;
  os_info: string;
  kernel: string;
  build: string;
  agent_version: string;
  last_seen: Date;
  metadata: Record<string, string>;
  is_hidden: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: number;
  google_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ApiKey {
  id: number;
  key_hash: string;
  label: string;
  is_active: boolean;
  created_at: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}
