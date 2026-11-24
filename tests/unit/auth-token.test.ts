import { describe, expect, test } from "vitest";
import { clientIp, throttleKeys } from "@/server/auth/client-ip";
import { createSessionToken, deriveKey, hashSessionToken, readSessionToken, safeEqual } from "@/server/auth/token";

const secret = "a-test-secret-that-is-at-least-32-bytes-long";

describe("session tokens", () => {
  test("a signed token reads back to the same raw token", () => {
    const { token, cookieValue } = createSessionToken(secret);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(readSessionToken(cookieValue, secret)).toBe(token);
  });

  test("tokens are unique", () => {
    expect(createSessionToken(secret).token).not.toBe(createSessionToken(secret).token);
  });

  test("a tampered token is rejected", () => {
    const { cookieValue } = createSessionToken(secret);
    const [token, signature] = cookieValue.split(".");
    const flipped = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    expect(readSessionToken(`${flipped}.${signature}`, secret)).toBeNull();
    expect(readSessionToken(`${token}.${signature.slice(0, -2)}`, secret)).toBeNull();
  });

  test("a token signed with another secret is rejected", () => {
    const { cookieValue } = createSessionToken("another-secret-that-is-also-32-bytes-long!!");
    expect(readSessionToken(cookieValue, secret)).toBeNull();
  });

  test.each([undefined, "", "no-dot", "a.b.c", ".", "x."])("garbage %j is rejected", (value) => {
    expect(readSessionToken(value, secret)).toBeNull();
  });

  test("the stored id is a SHA-256 digest, never the token itself", () => {
    const { token } = createSessionToken(secret);
    const digest = hashSessionToken(token);
    expect(digest).toHaveLength(32);
    expect(digest.toString("base64url")).not.toBe(token);
    expect(hashSessionToken(token).equals(digest)).toBe(true);
  });
});

describe("client IP", () => {
  test("on Vercel, trusts only the platform-set headers", () => {
    const headers = new Headers({
      "x-forwarded-for": "6.6.6.6, 203.0.113.7",
      "x-vercel-forwarded-for": "203.0.113.7",
      "x-real-ip": "198.51.100.1",
    });
    expect(clientIp(headers, { VERCEL: "1" })).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.1" }), { VERCEL: "1" })).toBe("198.51.100.1");
  });

  test("on Vercel, a client-supplied X-Forwarded-For alone is ignored", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "6.6.6.6" }), { VERCEL: "1" })).toBeNull();
  });

  test("behind a trusted proxy, takes the right-most X-Forwarded-For entry (added by that proxy)", () => {
    const headers = new Headers({ "x-forwarded-for": "6.6.6.6, 10.0.0.9, 203.0.113.7" });
    expect(clientIp(headers, { TRUST_PROXY: "1" })).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-forwarded-for": "2001:db8::1 " }), { TRUST_PROXY: "1" })).toBe("2001:db8::1");
  });

  test("without a trusted proxy, headers are ignored", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7", "x-real-ip": "203.0.113.7" });
    expect(clientIp(headers, {})).toBeNull();
    expect(clientIp(headers, { TRUST_PROXY: "true" })).toBeNull();
  });

  test.each(["", " , ", "not-an-ip", "999.1.1.1", "203.0.113.7, garbage"])("rejects %j", (value) => {
    expect(clientIp(new Headers({ "x-forwarded-for": value }), { TRUST_PROXY: "1" })).toBeNull();
  });
});

describe("throttle keys", () => {
  test("hash the IP with an IP-specific key and always include the global key", () => {
    const keys = throttleKeys("203.0.113.7", secret);
    expect(keys.map((k) => k.kind)).toEqual(["ip", "global"]);
    expect(keys[0].key).toMatch(/^ip:[A-Za-z0-9_-]{43}$/);
    expect(keys[0].key).not.toContain("203.0.113.7");
    expect(throttleKeys("203.0.113.7", secret)[0].key).toBe(keys[0].key);
    expect(throttleKeys(null, secret)).toEqual([{ kind: "global", key: "global" }]);
  });
});

describe("deriveKey", () => {
  test("gives a different 32-byte key per purpose, stable per secret", () => {
    const cookie = deriveKey(secret, "session-cookie");
    const ip = deriveKey(secret, "throttle-ip");
    expect(cookie).toHaveLength(32);
    expect(cookie.equals(ip)).toBe(false);
    expect(deriveKey(secret, "session-cookie").equals(cookie)).toBe(true);
    expect(deriveKey(`${secret}x`, "session-cookie").equals(cookie)).toBe(false);
  });
});

describe("safeEqual", () => {
  test("compares strings of any length without leaking the length", () => {
    expect(safeEqual("admin", "admin")).toBe(true);
    expect(safeEqual("admin", "Admin")).toBe(false);
    expect(safeEqual("admin", "administrator")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});
