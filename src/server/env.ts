import { z } from "zod";

/**
 * The environment the server needs.
 *
 * The schema is validated once at startup. A missing or malformed variable
 * stops the process with the *names* of the variables that are wrong, never
 * their values, because a value is the secret the check exists to protect.
 *
 * Scripts that read `SEED_*` or `ADMIN_RESET_*` validate those names in the
 * script itself; those variables are not part of the running web server.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (value) =>
        value.startsWith("postgresql://") || value.startsWith("postgres://"),
      "DATABASE_URL must be a PostgreSQL connection string",
    ),
  AUTH_SECRET: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(32, "AUTH_SECRET must be at least 32 characters").optional(),
  ),
  AUTH_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().optional(),
  ),
  NEXT_PUBLIC_API_BASE_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().optional(),
  ),
});

/** The validated server environment. */
export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

/**
 * Validates the environment and returns it.
 *
 * A second call returns the first result, so the schema runs once per
 * process even though several modules import this file.
 */
export function validateEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const names = [
      ...new Set(
        parsed.error.issues.map((issue) => issue.path.join(".") || "environment"),
      ),
    ];

    // The names only. A Zod issue can carry the received value, so the issues
    // themselves are never printed.
    throw new Error(
      `Invalid environment configuration. Check these variables: ${names.join(", ")}`,
    );
  }

  const env = parsed.data;

  if (env.NODE_ENV === "production" && !env.AUTH_SECRET) {
    throw new Error(
      "Invalid environment configuration. Check these variables: AUTH_SECRET",
    );
  }

  cached = env;

  return env;
}

/**
 * The environment, validated on first use.
 */
export function env(): ServerEnv {
  return validateEnv();
}

/** Whether the process is serving production traffic. */
export function isProduction(): boolean {
  return (process.env.NODE_ENV ?? "development") === "production";
}
