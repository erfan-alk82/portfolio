/**
 * Prints an ADMIN_PASSWORD_HASH for the blog admin.
 *
 *   node scripts/hash-password.mjs                 # asks for the password (not echoed)
 *   printf %s "$PASSWORD" | node scripts/hash-password.mjs   # CI / scripts
 *
 * The password is read from the terminal or stdin, never from argv, so it does
 * not end up in shell history or the process list. The format matches
 * src/server/auth/password.ts: scrypt:17:8:1:<salt>:<hash> (base64url).
 */
import { randomBytes, scrypt } from "node:crypto";
import { createInterface } from "node:readline";

const LOG_N = 17;
const BLOCK_SIZE = 8;
const PARALLELISM = 1;
const MIN_LENGTH = 12;

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data.replace(/\r?\n$/, "")));
    process.stdin.on("error", reject);
  });
}

function prompt(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stderr, terminal: true });
    // Hide what is typed: echo nothing after the question itself.
    rl._writeToOutput = (text) => {
      if (text.includes(question)) process.stderr.write(text);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stderr.write("\n");
      resolve(answer);
    });
  });
}

function hash(password) {
  const salt = randomBytes(16);
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      64,
      { N: 2 ** LOG_N, r: BLOCK_SIZE, p: PARALLELISM, maxmem: 256 * 1024 * 1024 },
      (error, key) =>
        error
          ? reject(error)
          : resolve(
              ["scrypt", LOG_N, BLOCK_SIZE, PARALLELISM, salt.toString("base64url"), key.toString("base64url")].join(":"),
            ),
    );
  });
}

async function main() {
  let password;
  if (process.stdin.isTTY) {
    password = await prompt("Admin password: ");
    const again = await prompt("Repeat password: ");
    if (password !== again) throw new Error("The passwords do not match.");
    if (password.length < MIN_LENGTH) throw new Error(`Use at least ${MIN_LENGTH} characters.`);
  } else {
    password = await readStdin();
  }
  if (!password) throw new Error("No password given.");
  process.stdout.write(`${await hash(password)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
