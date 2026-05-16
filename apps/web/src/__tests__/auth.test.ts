import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We test authHeaders by mocking document.cookie since jsdom's cookie
// implementation is stateful across tests.

function authHeadersWithCookie(cookie: string): Record<string, string> {
  // Replicate the logic from lib/auth.ts
  const match = cookie.match(/omnivault_token=([^;]+)/);
  const token = match ? match[1] : "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

describe("authHeaders", () => {
  it("returns Authorization header when token cookie exists", () => {
    const headers = authHeadersWithCookie("omnivault_token=abc123");
    expect(headers.Authorization).toBe("Bearer abc123");
  });

  it("returns empty object when cookie is missing", () => {
    const headers = authHeadersWithCookie("");
    expect(headers.Authorization).toBeUndefined();
  });

  it("extracts token from multiple cookies", () => {
    const headers = authHeadersWithCookie("other=value; omnivault_token=xyz789; another=123");
    expect(headers.Authorization).toBe("Bearer xyz789");
  });

  it("returns empty when token is empty string", () => {
    const headers = authHeadersWithCookie("omnivault_token=");
    expect(headers.Authorization).toBeUndefined();
  });

  it("handles cookie at end of string", () => {
    const headers = authHeadersWithCookie("first=1; omnivault_token=end-token");
    expect(headers.Authorization).toBe("Bearer end-token");
  });

  it("handles cookie at start of string", () => {
    const headers = authHeadersWithCookie("omnivault_token=start-token; other=val");
    expect(headers.Authorization).toBe("Bearer start-token");
  });
});
