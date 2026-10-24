import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from './auth-token.ts'

/** Base URL for the backend API. Falls back to Vite's `/api` proxy in dev. */
const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')

const REFRESH_PATH = '/v1/auth/refresh'

/** Auth endpoints must not trigger the refresh/retry flow on a 401. */
const AUTH_ENDPOINTS = new Set(['/v1/auth/login', '/v1/auth/signup', REFRESH_PATH])

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  signal?: AbortSignal
}

interface RefreshedTokens {
  accessToken: string
  refreshToken: string
}

/**
 * Shared in-flight refresh request. The backend rotates the refresh token on
 * every use, so concurrent 401s must share one request instead of racing each
 * other with the same (soon invalid) token.
 */
let refreshPromise: Promise<string> | null = null

function notifyUnauthorized(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth:unauthorized'))
  }
}

/** Exchanges the stored refresh token for a new access/refresh pair. */
async function refreshAccessToken(): Promise<string> {
  if (refreshPromise !== null) return refreshPromise

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken()
    if (refreshToken === null) {
      throw new ApiError(401, 'Your session has expired. Please sign in again.')
    }

    let response: Response
    try {
      response = await fetch(`${API_BASE_URL}${REFRESH_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
    } catch {
      // A network failure is not proof that the session is invalid.
      throw new ApiError(0, 'Could not reach the server. Is the backend running?')
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        clearTokens()
        notifyUnauthorized()
      }
      throw new ApiError(response.status, await errorMessage(response))
    }

    const tokens = (await response.json()) as RefreshedTokens
    setAccessToken(tokens.accessToken)
    setRefreshToken(tokens.refreshToken)
    return tokens.accessToken
  })()

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

/**
 * Thin fetch wrapper: JSON in, JSON out, with backend validation
 * messages surfaced as `ApiError`.
 *
 * When a protected call returns 401, the refresh token is used once to rotate
 * the pair and the original request is retried transparently.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return performRequest<T>(path, options, false)
}

async function performRequest<T>(
  path: string,
  options: RequestOptions,
  isRetry: boolean,
): Promise<T> {
  const { method = 'GET', body, signal } = options

  const headers: Record<string, string> = {}
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  const accessToken = getAccessToken()
  if (accessToken !== null) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'Could not reach the server. Is the backend running?')
  }

  const isAuthEndpoint = AUTH_ENDPOINTS.has(path)

  // Access token expired: rotate the pair, then retry the request once.
  if (response.status === 401 && !isRetry && !isAuthEndpoint && getRefreshToken() !== null) {
    await refreshAccessToken()
    return performRequest<T>(path, options, true)
  }

  if (!response.ok) {
    if (response.status === 401 && !isAuthEndpoint) {
      clearTokens()
      notifyUnauthorized()
    }
    throw new ApiError(response.status, await errorMessage(response))
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

/** Extracts a readable message from the backend error payload. */
async function errorMessage(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json()
    if (typeof payload === 'object' && payload !== null && 'message' in payload) {
      const { message } = payload as { message: unknown }
      if (Array.isArray(message)) return message.join(', ')
      if (typeof message === 'string') return message
    }
  } catch {
    // Body was not JSON — fall through to the generic message.
  }
  return `Request failed (${response.status}).`
}
