import { scryptSync, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import * as OTPAuth from "otpauth";

/**
 * Authentification à un seul compte : mot de passe (scrypt) + code TOTP,
 * puis cookie de session signé (HS256, 30 jours).
 */
export const SESSION_COOKIE = "money_session";
const SESSION_DAYS = 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET manquant ou trop court");
  return new TextEncoder().encode(s);
}

/** Format du hash : scrypt$<sel hex>$<hash hex> (généré par scripts/create-admin.ts). */
export function verifyPassword(password: string): boolean {
  const stored = process.env.ADMIN_PASSWORD_HASH ?? "";
  const [algo, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, Buffer.from(salt, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

export function verifyTotp(code: string): boolean {
  const s = process.env.ADMIN_TOTP_SECRET;
  if (!s) return false;
  const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(s), digits: 6, period: 30 });
  return totp.validate({ token: code.replace(/\s/g, ""), window: 1 }) !== null;
}

export async function createSession() {
  const jwt = await new SignJWT({ sub: "johan" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
  (await cookies()).set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}
