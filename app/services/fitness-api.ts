// Types derived from the provided OpenAPI spec
export interface DocumentInfo {
  documents: string[];
}

export interface QueryRequest {
  question: string;
}

export interface QueryResponse {
  answer: string;
  sources: string[];
  context: string;
}

export interface ValidationError {
  loc: Array<string | number>;
  msg: string;
  type: string;
}

export interface HTTPValidationError {
  detail?: ValidationError[];
}

interface RequestOptions {
  timeoutMs?: number;
}

export class ApiError<TBody = unknown> extends Error {
  status: number;
  body: TBody | undefined;

  constructor(message: string, status: number, body?: TBody) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function getApiBaseUrl(): string {
  const envBase = import.meta.env.VITE_API_BASE_URL;
  if (envBase && envBase.trim().length > 0) return envBase.replace(/\/$/, "");
  return "";
}

function joinUrl(base: string, path: string): string {
  if (!base) return path;
  if (!path.startsWith("/")) return `${base}/${path}`;
  return `${base}${path}`;
}

async function requestJson<T>(
  path: string,
  init?: RequestInit,
  options?: RequestOptions
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = joinUrl(baseUrl, path);

  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? 30000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.method && init.method !== "GET"
          ? { "Content-Type": "application/json" }
          : {}),
        ...(init?.headers || {}),
      },
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    if (!response.ok) {
      let errorBody: unknown = undefined;
      try {
        errorBody = isJson ? await response.json() : await response.text();
      } catch {}
      const message = `Request failed with status ${response.status}`;
      throw new ApiError(message, response.status, errorBody as T);
    }

    if (response.status === 204) return undefined as unknown as T;

    if (isJson) return (await response.json()) as T;

    return (await response.text()) as unknown as T;
  } catch (error) {
    if ((error as any)?.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchHealth(
  options?: RequestOptions
): Promise<Record<string, unknown> | undefined> {
  return requestJson<Record<string, unknown> | undefined>(
    "/",
    { method: "GET" },
    options
  );
}

export async function fetchDocuments(
  options?: RequestOptions
): Promise<DocumentInfo> {
  return requestJson<DocumentInfo>("/documents", { method: "GET" }, options);
}

export async function queryKnowledgeBase(
  body: QueryRequest,
  options?: RequestOptions
): Promise<QueryResponse> {
  return requestJson<QueryResponse>(
    "/query",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    options
  );
}
