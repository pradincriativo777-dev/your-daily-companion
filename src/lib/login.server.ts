import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { checkLoginRateLimit, resetLoginRateLimit } from "./rate-limiter";
import { logSecurityEvent } from "./security-logger";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function getClientIp(): string {
  try {
    const request = getRequest();
    if (!request?.headers) return "unknown";
    // Check common proxy headers
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]!.trim();
    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp;
    return "unknown";
  } catch {
    return "unknown";
  }
}

export interface LoginResult {
  success: boolean;
  error?: string;
  accessToken?: string;
  refreshToken?: string;
}

export const serverLogin = createServerFn({ method: "POST" })
  .validator(
    (data: unknown): { email: string; password: string } => {
      if (
        typeof data !== "object" ||
        data === null ||
        !("email" in data) ||
        !("password" in data) ||
        typeof (data as Record<string, unknown>)["email"] !== "string" ||
        typeof (data as Record<string, unknown>)["password"] !== "string"
      ) {
        throw new Error("Invalid login data");
      }
      const email = ((data as Record<string, unknown>)["email"] as string).trim();
      const password = (data as Record<string, unknown>)["password"] as string;
      if (!email || !password) throw new Error("Email and password are required");
      return { email, password };
    },
  )
  .handler(async ({ data }): Promise<LoginResult> => {
    const { email, password } = data;
    const ip = getClientIp();

    // --- Rate limiting ---
    const rateCheck = checkLoginRateLimit(ip, email);
    if (!rateCheck.allowed) {
      logSecurityEvent({
        event: "LOGIN_RATE_LIMITED",
        ip,
        email,
        reason: `Blocked by ${rateCheck.reason} limit`,
        meta: { retryAfterSeconds: rateCheck.retryAfterSeconds },
      });
      return {
        success: false,
        error: `Muitas tentativas. Tente novamente em ${rateCheck.retryAfterSeconds} segundos.`,
      };
    }

    // --- Supabase Auth ---
    const SUPABASE_URL = process.env["SUPABASE_URL"];
    const SUPABASE_PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"];

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      console.error("[SECURITY] Missing Supabase env vars for login");
      return { success: false, error: "Erro interno do servidor." };
    }

    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY) },
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.session) {
      logSecurityEvent({
        event: "LOGIN_FAILED",
        ip,
        email,
        reason: authError?.message ?? "No session returned",
      });
      return {
        success: false,
        error: authError?.message?.includes("Invalid login")
          ? "E-mail ou senha incorretos."
          : authError?.message ?? "Erro ao autenticar.",
      };
    }

    // --- Success ---
    resetLoginRateLimit(ip, email);
    logSecurityEvent({
      event: "LOGIN_SUCCESS",
      ip,
      email,
      userId: authData.session.user.id,
    });

    return {
      success: true,
      accessToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
    };
  });
