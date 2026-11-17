/**
 * The startup check.
 *
 * Next.js calls this once when the server starts. The environment is
 * validated here, before the first request, so a missing or malformed
 * variable fails fast with the names of the variables that are wrong.
 *
 * The check is Node-only: the edge runtime does not read the environment the
 * same way, and the middleware deliberately imports nothing that needs the
 * Node runtime.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("./src/server/env");

    validateEnv();
  }
}
