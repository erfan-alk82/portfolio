import { describe, expect, test } from "vitest";
import { clientIp, throttleKeys } from "@/server/auth/client-ip";
import { createSessionToken, hashSessionToken, readSessionToken } from "@/server/auth/token";

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

describe("client IP and throttle keys", () => {
  const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });

  test("trusts x-forwarded-for on Vercel", () => {
    expect(clientIp(headers, { VERCEL: "1" })).toBe("203.0.113.7");
  });

  test("trusts x-forwarded-for behind a proxy only when TRUST_PROXY=1", () => {
    expect(clientIp(headers, { TRUST_PROXY: "1" })).toBe("203.0.113.7");
    expect(clientIp(headers, {})).toBeNull();
    expect(clientIp(headers, { TRUST_PROXY: "true" })).toBeNull();
  });

  test("an empty header yields no IP", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": " , " }), { VERCEL: "1" })).toBeNull();
    expect(clientIp(new Headers(), { VERCEL: "1" })).toBeNull();
  });

  test("keys hash the IP and always include the global key", () => {
    const keys = throttleKeys("203.0.113.7", secret);
    expect(keys.map((k) => k.kind)).toEqual(["ip", "global"]);
    expect(keys[0].key).toMatch(/^ip:[A-Za-z0-9_-]{43}$/);
    expect(keys[0].key).not.toContain("203.0.113.7");
    expect(throttleKeys("203.0.113.7", secret)[0].key).toBe(keys[0].key);
    expect(throttleKeys(null, secret)).toEqual([{ kind: "global", key: "global" }]);
  });
});
