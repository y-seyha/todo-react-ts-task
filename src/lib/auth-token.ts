/**
 * Access tokens stay in memory (short-lived), while the refresh token is
 * persisted so a full page reload can silently restore the session.
 *
 * In production, prefer an httpOnly cookie for the refresh token. Persisting it
 * in localStorage is used here because the API returns tokens in the JSON body.
 */
const REFRESH_TOKEN_KEY = 'taskflow.refreshToken'

let memoryAccessToken: string | null = null

export function getAccessToken(): string | null {
  return memoryAccessToken
}

export function setAccessToken(token: string | null): void {
  memoryAccessToken = token
}

export function clearAccessToken(): void {
  memoryAccessToken = null
}

export function getRefreshToken(): string | null {
  try {
    return globalThis.localStorage.getItem(REFRESH_TOKEN_KEY)
  } catch {
    // Storage can be unavailable (e.g. blocked by the browser).
    return null
  }
}

export function setRefreshToken(token: string | null): void {
  try {
    if (token === null) {
      globalThis.localStorage.removeItem(REFRESH_TOKEN_KEY)
    } else {
      globalThis.localStorage.setItem(REFRESH_TOKEN_KEY, token)
    }
  } catch {
    // If storage is unavailable the session only lasts for this tab.
  }
}

/** Clears both tokens, e.g. after logout or a rejected refresh token. */
export function clearTokens(): void {
  clearAccessToken()
  setRefreshToken(null)
}

export function hasRefreshToken(): boolean {
  return getRefreshToken() !== null
}
