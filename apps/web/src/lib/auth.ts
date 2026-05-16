/**
 * Returns Authorization headers with Bearer token from cookie.
 */
export function authHeaders(): HeadersInit {
  const match = document.cookie.match(/omnivault_token=([^;]+)/)
  const token = match ? match[1] : ''
  return token ? { Authorization: `Bearer ${token}` } : {}
}
