/**
 * In-memory rate limiter for login attempts.
 *
 * Compatible with Node.js single-instance deployments (Hostinger).
 * Tracks attempts by key (IP or email) with automatic expiry.
 * Never causes permanent lockout — entries auto-expire.
 */

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blockedUntil: number | null;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      const windowExpired = now - entry.firstAttempt > Math.max(IP_WINDOW_MS, EMAIL_WINDOW_MS);
      const blockExpired = entry.blockedUntil && now > entry.blockedUntil;
      if (windowExpired && (!entry.blockedUntil || blockExpired)) {
        store.delete(key);
      }
    }
    if (store.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, CLEANUP_INTERVAL_MS);
  // Don't prevent Node.js from exiting
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

// --- Configuration ---
const IP_MAX_ATTEMPTS = 10;
const IP_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const IP_BLOCK_MS = 15 * 60 * 1000; // 15 minute block

const EMAIL_MAX_ATTEMPTS = 8;
const EMAIL_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const EMAIL_BLOCK_MS = 15 * 60 * 1000; // 15 minute block

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
  reason?: "ip" | "email";
}

function checkAndIncrement(
  key: string,
  maxAttempts: number,
  windowMs: number,
  blockMs: number,
): { allowed: boolean; retryAfterSeconds?: number } {
  ensureCleanup();
  const now = Date.now();
  const entry = store.get(key);

  // If blocked, check if block has expired
  if (entry?.blockedUntil) {
    if (now < entry.blockedUntil) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((entry.blockedUntil - now) / 1000),
      };
    }
    // Block expired — reset
    store.delete(key);
  }

  if (!entry || now - entry.firstAttempt > windowMs) {
    // Window expired or first attempt — start fresh
    store.set(key, { count: 1, firstAttempt: now, blockedUntil: null });
    return { allowed: true };
  }

  entry.count++;

  if (entry.count > maxAttempts) {
    entry.blockedUntil = now + blockMs;
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(blockMs / 1000),
    };
  }

  return { allowed: true };
}

/**
 * Check rate limits for a login attempt.
 * Call this BEFORE attempting authentication.
 *
 * @param ip - Client IP address
 * @param email - Normalized email address
 * @returns Whether the attempt is allowed and retry info
 */
export function checkLoginRateLimit(ip: string, email: string): RateLimitResult {
  const normalizedEmail = email.trim().toLowerCase();

  // Check IP first
  const ipResult = checkAndIncrement(`ip:${ip}`, IP_MAX_ATTEMPTS, IP_WINDOW_MS, IP_BLOCK_MS);
  if (!ipResult.allowed) {
    return { allowed: false, retryAfterSeconds: ipResult.retryAfterSeconds, reason: "ip" };
  }

  // Check email
  const emailResult = checkAndIncrement(
    `email:${normalizedEmail}`,
    EMAIL_MAX_ATTEMPTS,
    EMAIL_WINDOW_MS,
    EMAIL_BLOCK_MS,
  );
  if (!emailResult.allowed) {
    return { allowed: false, retryAfterSeconds: emailResult.retryAfterSeconds, reason: "email" };
  }

  return { allowed: true };
}

/**
 * Reset rate limit entries for a successful login.
 * Call this AFTER successful authentication to avoid punishing the user.
 */
export function resetLoginRateLimit(ip: string, email: string): void {
  const normalizedEmail = email.trim().toLowerCase();
  store.delete(`ip:${ip}`);
  store.delete(`email:${normalizedEmail}`);
}

/** Exposed for testing only */
export function _clearAllForTesting(): void {
  store.clear();
}
