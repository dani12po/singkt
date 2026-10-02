/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";
const extra = (name) =>
  (process.env[name] ?? "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");

function csp() {
  // Google AdSense hosts (site runs AdSense; extras still appendable).
  const ADSENSE_SCRIPT = "https://pagead2.googlesyndication.com";
  const ADSENSE_FRAME = "https://googleads.g.doubleclick.net https://pagead2.googlesyndication.com";
  const ADSENSE_IMG = "https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net";
  const ADSENSE_CONNECT = "https://pagead2.googlesyndication.com";
  const scriptSrc = ["'self'", "'unsafe-inline'", isDev ? "'unsafe-eval'" : "", ADSENSE_SCRIPT, extra("CSP_EXTRA_SCRIPT_SRC")]
    .filter(Boolean)
    .join(" ");
  const frameSrc = [ADSENSE_FRAME, extra("CSP_EXTRA_FRAME_SRC")].filter(Boolean).join(" ");
  const imgSrc = ["'self'", "data:", "https:", ADSENSE_IMG, extra("CSP_EXTRA_IMG_SRC")].filter(Boolean).join(" ");
  const connectSrc = ["'self'", ADSENSE_CONNECT, extra("CSP_EXTRA_CONNECT_SRC")].filter(Boolean).join(" ");
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSrc}`,
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "frame-ancestors 'none'",
    frameSrc === "'none'" ? "frame-src 'none'" : `frame-src ${frameSrc}`,
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Rewrite barrel imports (e.g. simple-icons ±3000 icons) into
    // per-module imports so unused icons tree-shake out of client chunks.
    optimizePackageImports: ["simple-icons"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            // NOTE: Next.js App Router inlines flight-data scripts, so
            // script-src must allow 'unsafe-inline' (nonces would require
            // per-request middleware). Everything else stays strict.
            // Ad slots later: CSP_EXTRA_* envs (no code change needed).
            value: csp(),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
