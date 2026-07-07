import type { NextConfig } from "next";
import path from "node:path";

const isDev = process.env.NODE_ENV === "development";

// The browser only ever talks to our own origin and the Supabase project
// (auth + data API), plus YouTube's thumbnail CDN for link previews.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseWs = supabaseUrl.replace(/^https:\/\//, "wss://");

// Notes on the relaxations:
// - script/style use 'unsafe-inline' (the documented static-CSP approach; the
//   app relies on inline styles and Next's inline bootstrap). A nonce-based
//   strict CSP would require fully dynamic rendering — not worth it here.
// - img-src allows the YouTube thumbnail hosts only (previews are metadata-only;
//   we never embed video or arbitrary remote HTML).
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' blob: data: https://img.youtube.com https://i.ytimg.com`,
  `font-src 'self' data:`,
  `connect-src 'self' ${supabaseUrl} ${supabaseWs}${isDev ? " ws:" : ""}`
    .replace(/\s+/g, " ")
    .trim(),
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  // Only upgrade in production — on http://localhost it can break dev requests.
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. Without this, Next.js detects
  // lockfiles in parent folders and mistakenly treats this as part of a larger
  // workspace (picking up unrelated files above the project).
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
