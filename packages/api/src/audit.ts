import db from "./db";

interface AuditEntry {
  user_id?: number | null;
  user_email?: string | null;
  action: string;
  target_mac?: string | null;
  target_hostname?: string | null;
  meta?: Record<string, unknown>;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await db("audit_logs").insert({
      user_id: entry.user_id ?? null,
      user_email: entry.user_email ?? null,
      action: entry.action,
      target_mac: entry.target_mac ?? null,
      target_hostname: entry.target_hostname ?? null,
      meta: JSON.stringify(entry.meta ?? {}),
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
