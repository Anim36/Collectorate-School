import { handlers } from "@/auth";

/**
 * The Auth.js route handler.
 *
 * It answers the sign-in, sign-out and session requests that the server
 * actions and the client helpers make.
 */
export const { GET, POST } = handlers;
