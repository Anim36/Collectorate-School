/**
 * A small typed helper around the debug browser.
 *
 * The browser-driven checks use it to read the page, so the connection and
 * the shape of the answer are described once rather than in every script.
 */

/** The answer the browser gives to an evaluated expression. */
export interface PageResult {
  /** The value of the expression, when it ran. */
  value?: unknown;
  /** The message, when the expression threw. */
  error?: string;
}

/** The result of a Chrome DevTools Protocol command. */
export interface ProtocolResult {
  result?: { value?: unknown };
  exceptionDetails?: { text?: string };
}

/** The connection to the debug browser. */
export interface Browser {
  /** Sends a command to the browser and waits for the answer. */
  send: (
    method: string,
    params?: Record<string, unknown>,
  ) => Promise<ProtocolResult | undefined>;
  /** Runs an expression in the page and reads the value back. */
  evaluate: (expression: string) => Promise<PageResult>;
  /** Closes the connection. */
  close: () => void;
}

/** Opens a connection to the debug browser on port 9222. */
export async function connectBrowser(
  port = 9222,
): Promise<Browser> {
  const endpoint = (await (
    await fetch(`http://localhost:${port}/json`)
  ).json()) as { type: string; webSocketDebuggerUrl: string }[];

  const page = endpoint.find((target) => target.type === "page");

  if (!page) throw new Error("NO PAGE TARGET");

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map<number, (value: ProtocolResult | undefined) => void>();

  function send(
    method: string,
    params: Record<string, unknown> = {},
  ): Promise<ProtocolResult | undefined> {
    return new Promise((resolve) => {
      const messageId = ++id;
      pending.set(messageId, resolve);
      ws.send(JSON.stringify({ id: messageId, method, params }));
    });
  }

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data) as {
      id?: number;
      result?: ProtocolResult;
    };

    if (message.id && pending.has(message.id)) {
      pending.get(message.id)!(message.result);
      pending.delete(message.id);
    }
  });

  await new Promise((resolve) => ws.addEventListener("open", resolve));

  return {
    send,
    async evaluate(expression: string): Promise<PageResult> {
      try {
        const result = await send("Runtime.evaluate", {
          expression,
          returnByValue: true,
          awaitPromise: true,
        });

        if (!result) return { error: "no result from the page" };

        if (result.exceptionDetails) {
          return { error: result.exceptionDetails.text ?? "exception" };
        }

        return { value: result.result?.value };
      } catch {
        return { error: "no result from the page" };
      }
    },
    close: () => ws.close(),
  };
}

/** Waits for a moment. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The script that fills a field the way React expects.
 *
 * The value setter is taken from the prototype, because assigning to the
 * value directly does not tell React that the field changed.
 */
export const SET_VALUE_HELPER = `
  const setValue = (el, value) => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
`;

/**
 * The script that fills a field inside an iframe, the way React expects.
 */
export const SET_VALUE_IN_FRAME_HELPER = `
  const setValue = (el, value) => {
    const setter = Object.getOwnPropertyDescriptor(
      frame.contentWindow.HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
`;
