import type { NextConfig } from "next";

/**
 * The security headers.
 *
 * The content-security policy has to work with how Next.js ships a page: the
 * framework writes small inline scripts for hydration, so `script-src` allows
 * inline script. A nonce-based policy would be stricter, but it needs a
 * middleware that rewrites every response; this policy still blocks a remote
 * script, a frame, an object and a form post to another host.
 */
const isProduction = process.env.NODE_ENV === "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isProduction ? "" : " ws: wss:"}`,
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const allowedOrigins = (() => {
  const value = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL;

  if (!value) return undefined;

  try {
    return [new URL(value).host];
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  // A source map is a copy of the source. It is off in production, so a
  // deployment never ships one beside the code.
  productionBrowserSourceMaps: false,

  experimental: {
    /**
     * The size of a server action body.
     *
     * The default is 1 MB. A file the admin uploads travels to the server as
     * base64 text, which is about a third larger than the file itself, so the
     * limit has to fit the largest file the school accepts: a 10 MB document.
     * The limit is 16 MB, which leaves room for the base64 text and for the
     * rest of the body.
     */
    serverActions: {
      bodySizeLimit: "16mb",
      // Next.js already compares the Origin of a server action with the host.
      // Naming the site host makes the check explicit behind a proxy.
      allowedOrigins,
    },
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
