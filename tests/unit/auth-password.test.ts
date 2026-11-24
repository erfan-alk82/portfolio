import { execFileSync } from "node:child_process";
import { describe, expect, test } from "vitest";
import { hashPassword, parsePasswordHash, verifyPassword } from "@/server/auth/password";

describe("password hashing", () => {
  test("hashes into the documented scrypt format", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).toMatch(/^scrypt:17:8:1:[A-Za-z0-9_-]{22}:[A-Za-z0-9_-]{86}$/);
  });

  test("verifies the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("s3cret-Passw0rd");
    await expect(verifyPassword("s3cret-Passw0rd", hash)).resolves.toBe(true);
    await expect(verifyPassword("s3cret-passw0rd", hash)).resolves.toBe(false);
  });

  test("uses a fresh salt every time", async () => {
    const [a, b] = await Promise.all([hashPassword("same"), hashPassword("same")]);
    expect(a).not.toBe(b);
  });

  test.each([
    "",
    "bcrypt:$2b$10$abc",
    "scrypt:17:8:1:onlysalt",
    "scrypt:99:8:1:AAAAAAAAAAAAAAAAAAAAAA:AAAA",
    "scrypt:17:8:1:!!!:???",
    "scrypt:17:8:1:AAAAAAAAAAAAAAAAAAAAAA:AAAA:extra",
  ])("treats malformed hash %j as a failed match", async (stored) => {
    expect(parsePasswordHash(stored)).toBeNull();
    await expect(verifyPassword("anything", stored)).resolves.toBe(false);
  });

  test("scripts/hash-password.mjs produces hashes the server accepts", async () => {
    const output = execFileSync(process.execPath, ["scripts/hash-password.mjs"], {
      input: "from-the-script\n",
      encoding: "utf8",
    }).trim();
    expect(parsePasswordHash(output)).not.toBeNull();
    await expect(verifyPassword("from-the-script", output)).resolves.toBe(true);
  });
});
