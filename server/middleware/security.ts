/**
 * Nitro/h3 global security middleware.
 *
 * Applied to every request before any route handler.
 * Adds security headers, X-Robots-Tag, and CORS restrictions.
 */
import { defineEventHandler, setResponseHeaders, getRequestURL } from "h3";

export default defineEventHandler((event) => {
  const url = getRequestURL(event);
  const origin = url.origin;

  // --- Security Headers ---
  setResponseHeaders(event, {
    // HSTS — enforce HTTPS for 1 year
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",

    // Prevent MIME-type sniffing
    "X-Content-Type-Options": "nosniff",

    // Prevent framing (clickjacking protection)
    "X-Frame-Options": "DENY",

    // Control referrer information
    "Referrer-Policy": "strict-origin-when-cross-origin",

    // Restrict browser features
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",

    // Block search engine indexing
    "X-Robots-Tag": "noindex, nofollow",

    // CSP — allow Supabase API, inline styles (Recharts/Radix), self scripts
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'", // Recharts + Radix inline styles
      `connect-src 'self' https://*.supabase.co`,
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),

    // CORS — restrict to same origin only
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  });
});
