import type { RuntimeConfig } from "../../config/env.js";
import { requireAuthorization } from "../../config/resolvedConfig.js";
import { FlomoAuthError, FlomoParseError, FlomoRequestError } from "../errors.js";

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

export class FlomoHttpClient {
  constructor(private readonly config: RuntimeConfig) {}

  async requestJson<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
    const url = this.toUrl(endpoint);
    const abort = this.buildAbortSignal(init.signal);
    let response: Response;
    let text: string;

    try {
      response = await fetch(url, {
        ...init,
        headers: this.buildHeaders(init.headers),
        signal: abort.signal
      });
      text = await response.text();
    } catch (error) {
      if (isAbortError(error)) {
        throw new FlomoRequestError("REQUEST_TIMEOUT", "flomo 请求超时，请稍后重试。", { cause: error });
      }

      if (error instanceof FlomoRequestError || error instanceof FlomoAuthError) {
        throw error;
      }

      throw new FlomoRequestError("REMOTE_CHANGED", "flomo 请求失败，网络请求未完成。", { cause: error });
    } finally {
      abort.cleanup();
    }

    if (!response.ok) {
      throwHttpError(response.status, text);
    }

    if (!text) {
      return undefined as T;
    }

    try {
      const parsed = JSON.parse(text) as T;
      validateFlomoApiResponse(parsed);
      return parsed;
    } catch (error) {
      if (error instanceof FlomoRequestError || error instanceof FlomoAuthError) {
        throw error;
      }
      throw new FlomoParseError("flomo 返回的响应不是合法 JSON。", { cause: error });
    }
  }

  private buildHeaders(headersInit: ConstructorParameters<typeof Headers>[0] | undefined): Headers {
    const headers = new Headers(headersInit);
    headers.set("Accept", "application/json, text/plain, */*");
    headers.set("Authorization", requireAuthorization(this.config));
    headers.set("User-Agent", this.config.userAgent);
    headers.set("Origin", this.config.webBaseUrl);
    headers.set("Referer", `${this.config.webBaseUrl}/`);
    headers.set("X-Timezone", this.config.timezone);
    headers.set("platform", this.config.webPlatform);
    headers.set("device-model", this.config.deviceModel);
    headers.set("device-id", this.config.deviceId);

    if (this.config.cookie) {
      headers.set("Cookie", this.config.cookie);
    }

    return headers;
  }

  private toUrl(endpoint: string): string {
    if (/^https?:\/\//i.test(endpoint)) {
      const url = new URL(endpoint);
      const baseUrl = new URL(this.config.baseUrl);
      if (url.origin !== baseUrl.origin) {
        throw new FlomoRequestError("BAD_REQUEST", "FLOMO endpoint 必须是相对路径或与 FLOMO_BASE_URL 同源。");
      }

      return url.toString();
    }

    const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${this.config.baseUrl}${normalizedEndpoint}`;
  }

  private buildAbortSignal(inputSignal: AbortSignal | null | undefined): { signal: AbortSignal; cleanup: () => void } {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, this.requestTimeoutMs);

    let removeInputListener = (): void => undefined;
    if (inputSignal) {
      if (inputSignal.aborted) {
        controller.abort(inputSignal.reason);
      } else {
        const abortFromInput = (): void => {
          controller.abort(inputSignal.reason);
        };
        inputSignal.addEventListener("abort", abortFromInput, { once: true });
        removeInputListener = () => inputSignal.removeEventListener("abort", abortFromInput);
      }
    }

    return {
      signal: controller.signal,
      cleanup: () => {
        clearTimeout(timeout);
        removeInputListener();
      }
    };
  }

  private get requestTimeoutMs(): number {
    const configured = this.config.requestTimeoutMs;
    return Number.isFinite(configured) && configured > 0 ? Math.trunc(configured) : DEFAULT_REQUEST_TIMEOUT_MS;
  }
}

function throwHttpError(status: number, body: string): never {
  if (status === 401 || status === 403) {
    throw new FlomoAuthError("flomo 登录态失效或权限不足，请重新抓取 Authorization。", { status });
  }

  if (status === 400) {
    const message = extractResponseMessage(body) ?? "flomo 请求体不符合当前接口要求。";
    const code = looksLikeSignError(message) ? "SIGN_INVALID" : "BAD_REQUEST";
    throw new FlomoRequestError(code, message, { status });
  }

  if (status === 429) {
    throw new FlomoRequestError("RATE_LIMITED", "flomo 请求过于频繁，请稍后再试。", { status });
  }

  const message = body ? `flomo 请求失败，HTTP ${status}。` : `flomo 请求失败，HTTP ${status}，无响应体。`;
  throw new FlomoRequestError("REMOTE_CHANGED", message, { status });
}

function validateFlomoApiResponse(value: unknown): void {
  if (!isRecord(value) || typeof value.code !== "number" || value.code === 0) {
    return;
  }

  const message = typeof value.message === "string" && value.message.trim() ? value.message : "flomo 返回业务错误。";
  if (value.code === -20 || looksLikeSignError(message)) {
    throw new FlomoRequestError("SIGN_INVALID", message);
  }

  if (value.code === -1) {
    throw new FlomoRequestError("BAD_REQUEST", message);
  }

  throw new FlomoRequestError("REMOTE_CHANGED", message);
}

function extractResponseMessage(body: string): string | undefined {
  if (!body) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(body) as unknown;
    if (isRecord(parsed) && typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message;
    }
  } catch {
    return body;
  }

  return body;
}

function looksLikeSignError(message: string): boolean {
  return /sign|signature|签名/i.test(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAbortError(error: unknown): boolean {
  return isRecord(error) && error.name === "AbortError";
}
