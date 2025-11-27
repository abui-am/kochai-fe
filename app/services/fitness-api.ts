// Complete TypeScript types derived from the OpenAPI specification

// User and Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  fitness_goals?: string[] | null;
  experience_level?: string | null;
  preferred_workout_types?: string[] | null;
  workout_frequency?: string | null;
  available_equipment?: string[] | null;
  dietary_restrictions?: string[] | null;
  notifications_enabled?: boolean;
  email_updates?: boolean;
  language?: string;
  timezone?: string | null;
}

export interface UserProfileUpdate {
  name?: string | null;
  picture?: string | null;
  bio?: string | null;
}

export interface UserRegistration {
  email: string;
  name: string;
  password: string;
  profile?: UserProfileUpdate | null;
  preferences?: UserPreferences | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  user: User;
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface RegistrationResponse {
  message: string;
  user: User;
  registration_status: RegistrationStatus;
  requires_completion: boolean;
}

export interface RegistrationStatus {
  is_registered: boolean;
  profile_completed?: boolean;
  preferences_set?: boolean;
  email_verified?: boolean;
  registration_date?: string | null;
  last_updated?: string;
}

export interface ProfileResponse {
  user: User;
  preferences?: UserPreferences | null;
  registration_status: RegistrationStatus;
}

// Query and Knowledge Base Types
export interface QueryRequest {
  question: string;
}

export interface VanillaQueryRequest {
  text: string;
}

export interface DocumentMetadata {
  embedding?: null;
  text: string;
  name: string;
  doc: {
    embedding?: null;
    docname: string;
    dockey: string;
    citation: string;
    fields_to_overwrite_from_metadata: string[];
    key: string;
    bibtex: string;
    authors: string[] | null;
    publication_date: string;
    year: number;
    volume: string;
    issue: string | null;
    issn: string | null;
    pages: string | null;
    journal: string;
    publisher: string | null;
    url: string | null;
    title: string;
    citation_count: number | null;
    bibtex_type: string;
    source_quality: number;
    is_retracted: boolean | null;
    doi: string;
    doi_url: string;
    doc_id: string;
    file_location: string | null;
    license: string | null;
    pdf_url: string | null;
    other: Record<string, any>;
    formatted_citation: string;
  };
}

export interface ContextItem {
  id: string;
  context: string;
  question: string;
  text: DocumentMetadata;
  score: number;
}

export interface PaperQASession {
  id: string;
  question: string;
  answer: string;
  raw_answer: string;
  answer_reasoning: string | null;
  has_successful_answer: boolean;
  context: string;
  contexts: ContextItem[];
  references: string;
  formatted_answer: string;
  graded_answer: string | null;
  cost: number;
  token_counts: Record<string, [number, number]>;
  config_md5: string;
  tool_history: string[][];
  used_contexts: string[];
}

export interface QueryResponse {
  answer: string;
  sources: string[] | null;
  context: string;
  confidence: string | null;
  query: string;
  status: boolean;
  enhancement_data?: any | null;
  paperqa_session: PaperQASession;
}

export interface VanillaQueryResponse {
  answer: string;
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  query: string;
  status: "success" | "error" | string;
  preferences?: UserPreferences | null;
}

// System Types
export interface SystemStatus {
  system_status: string;
  documents_loaded: boolean;
  total_documents: number;
  system_health: string;
  index_built: boolean;
  auto_indexing: boolean;
}

export interface UserStats {
  total_queries: number;
  queries_this_month: number;
  favorite_topics: string[];
  last_activity?: string | null;
  account_created: string;
  registration_completed: boolean;
}

// Error Types
export interface ValidationError {
  loc: Array<string | number>;
  msg: string;
  type: string;
}

export interface HTTPValidationError {
  detail?: string;
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
  return "http://localhost:8000"; // Default fallback for development
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
  const timeoutMs = options?.timeoutMs ?? 30000; // 30 second timeout
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
      let errorBody: HTTPValidationError | undefined = undefined;
      try {
        errorBody = isJson ? await response.json() : await response.text();
      } catch {}
      throw new ApiError(
        errorBody?.detail || "Unknown error",
        response.status,
        errorBody as T
      );
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

// Authentication token management
export function setAuthToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("auth_token", token);
  }
}

export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("auth_token");
  }
  return null;
}

export function removeAuthToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_token");
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Health Check
export async function fetchHealth(
  options?: RequestOptions
): Promise<Record<string, unknown> | undefined> {
  return requestJson<Record<string, unknown> | undefined>(
    "/",
    { method: "GET" },
    options
  );
}

// System Status
export async function fetchSystemStatus(
  options?: RequestOptions
): Promise<SystemStatus> {
  return requestJson<SystemStatus>(
    "/system/status",
    { method: "GET" },
    options
  );
}

// Documents
export async function fetchDocuments(
  options?: RequestOptions
): Promise<{ documents?: string[] } | Record<string, unknown>> {
  return requestJson<{ documents?: string[] } | Record<string, unknown>>(
    "/documents",
    { method: "GET" },
    options
  );
}

// Query (Protected)
export async function queryKnowledgeBase(
  body: QueryRequest,
  options?: RequestOptions
): Promise<QueryResponse> {
  return requestJson<QueryResponse>(
    "/query",
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: getAuthHeaders(),
    },
    {
      timeoutMs: 300000,
      ...options,
    }
  );
}

// Query Vanilla LLM (Protected) - Base LLM without RAG
export async function queryVanilla(
  body: VanillaQueryRequest,
  options?: RequestOptions
): Promise<VanillaQueryResponse> {
  return requestJson<VanillaQueryResponse>(
    "/query/vanilla",
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: getAuthHeaders(),
    },
    {
      timeoutMs: 300000,
      ...options,
    }
  );
}

// Authentication - Login
export async function loginUser(
  credentials: LoginCredentials,
  options?: RequestOptions
): Promise<LoginResponse> {
  return requestJson<LoginResponse>(
    "/login",
    {
      method: "POST",
      body: JSON.stringify(credentials),
    },
    options
  );
}

// Authentication - Register
export async function registerUser(
  userData: UserRegistration,
  options?: RequestOptions
): Promise<LoginResponse> {
  return requestJson<LoginResponse>(
    "/register",
    {
      method: "POST",
      body: JSON.stringify(userData),
    },
    options
  );
}

// Protected Routes - Users Me
export async function fetchCurrentUser(
  options?: RequestOptions
): Promise<User> {
  return requestJson<User>(
    "/users/me",
    {
      method: "GET",
      headers: getAuthHeaders(),
    },
    options
  );
}

// Profile Management (Protected)
export async function fetchUserProfile(
  options?: RequestOptions
): Promise<ProfileResponse> {
  return requestJson<ProfileResponse>(
    "/profile",
    {
      method: "GET",
      headers: getAuthHeaders(),
    },
    options
  );
}

export async function updateUserProfile(
  profileData: UserProfileUpdate,
  options?: RequestOptions
): Promise<ProfileResponse> {
  return requestJson<ProfileResponse>(
    "/profile",
    {
      method: "PUT",
      body: JSON.stringify(profileData),
      headers: getAuthHeaders(),
    },
    options
  );
}

// Preferences Management (Protected)
export async function updateUserPreferences(
  preferences: UserPreferences,
  options?: RequestOptions
): Promise<ProfileResponse> {
  return requestJson<ProfileResponse>(
    "/preferences",
    {
      method: "PUT",
      body: JSON.stringify(preferences),
      headers: getAuthHeaders(),
    },
    options
  );
}

// User Statistics (Protected)
export async function fetchUserStats(
  options?: RequestOptions
): Promise<UserStats> {
  return requestJson<UserStats>(
    "/stats",
    {
      method: "GET",
      headers: getAuthHeaders(),
    },
    options
  );
}

// Check if user onboarding is complete (profile + preferences)
export async function checkOnboardingComplete(
  options?: RequestOptions
): Promise<boolean> {
  try {
    const profileResponse = await fetchUserProfile(options);
    const { user, preferences, registration_status } = profileResponse;

    // Method 1: Check registration status flags (if backend updates them)
    const statusComplete = !!(
      registration_status.profile_completed &&
      registration_status.preferences_set
    );

    // Method 2: Check actual data presence (fallback if status flags aren't updated)
    const dataComplete = !!(
      user.name &&
      user.name.trim().length > 0 &&
      preferences &&
      preferences.fitness_goals &&
      preferences.fitness_goals.length > 0 &&
      preferences.experience_level &&
      preferences.experience_level.trim().length > 0 &&
      preferences.workout_frequency &&
      preferences.workout_frequency.trim().length > 0
    );

    // Return true if either method indicates completion
    return statusComplete || dataComplete;
  } catch (error) {
    // If profile fetch fails, assume onboarding is not complete
    return false;
  }
}
