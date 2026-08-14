/**
 * Security audit logger.
 *
 * Logs security-relevant events to stdout with a [SECURITY] prefix.
 * Never logs passwords, tokens, cookies, full CPF/CNPJ, or other sensitive data.
 *
 * Output goes to stdout for consumption by the hosting platform's log system.
 */

export type SecurityEvent =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGIN_RATE_LIMITED"
  | "LOGOUT"
  | "ACCESS_DENIED"
  | "RECORD_CREATED"
  | "RECORD_UPDATED"
  | "RECORD_DELETED";

interface SecurityLogEntry {
  event: SecurityEvent;
  ip?: string;
  email?: string;
  userId?: string;
  reason?: string;
  table?: string;
  recordId?: string;
  meta?: Record<string, unknown>;
}

/**
 * Mask sensitive data for logging.
 * - Email: shows first 2 chars + domain
 * - IP: logged as-is (not PII under most frameworks for server logs)
 */
function maskEmail(email: string | undefined): string | undefined {
  if (!email) return undefined;
  const parts = email.split("@");
  if (parts.length !== 2) return "***@***";
  const local = parts[0]!;
  const domain = parts[1]!;
  const masked = local.length > 2 ? local.slice(0, 2) + "***" : "***";
  return `${masked}@${domain}`;
}

export function logSecurityEvent(entry: SecurityLogEntry): void {
  const timestamp = new Date().toISOString();
  const safeEntry = {
    ...entry,
    email: maskEmail(entry.email),
    timestamp,
  };

  // Remove undefined values for cleaner output
  const clean = Object.fromEntries(
    Object.entries(safeEntry).filter(([, v]) => v !== undefined),
  );

  console.log(`[SECURITY] ${JSON.stringify(clean)}`);
}
