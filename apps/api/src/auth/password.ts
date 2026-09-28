import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

const KEY_LENGTH = 64;

/** Hashes a password with a random salt. Format: "<saltHex>:<hashHex>". */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

/** Verifies a password against a hash produced by hashPassword, in constant time. */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(":");
  if (!saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const storedDerivedKey = Buffer.from(hashHex, "hex");
  const candidateDerivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;

  if (candidateDerivedKey.length !== storedDerivedKey.length) return false;
  return timingSafeEqual(candidateDerivedKey, storedDerivedKey);
}
