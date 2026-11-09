import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    },
  },
};

export default nextConfig;
