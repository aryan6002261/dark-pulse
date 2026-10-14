import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt, lt } from "drizzle-orm";
import { db, ensureSchemaOnce, isDbConnected } from "@/db";
import { sessions, users } from "@/db/schema";
import {
  createMemorySession,
  deleteMemorySession,
  getMemorySessionUser,
} from "@/lib/memory-store";

export const SESSION_COOKIE = "pulse_session";
const SESSION_TTL_DAYS = 30;

/* ------------------------------ passwords ------------------------------ */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, expected] = parts;
  try {
    const derived = scryptSync(password, salt, 64);
    const expectedBuf = Buffer.from(expected, "hex");
    if (expectedBuf.length !== derived.length) return false;
    return timingSafeEqual(derived, expectedBuf);
  } catch {
    return false;
  }
}

/* ------------------------------- sessions ------------------------------ */

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  if (isDbConnected()) {
    try {
      await ensureSchemaOnce();
      await db.insert(sessions).values({ tokenHash: hashToken(token), userId, expiresAt });
      await db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())));
    } catch {
      createMemorySession(hashToken(token), userId, expiresAt);
    }
  } else {
    createMemorySession(hashToken(token), userId, expiresAt);
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    if (isDbConnected()) {
      try {
        await ensureSchemaOnce();
        await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
      } catch {
        deleteMemorySession(hashToken(token));
      }
    } else {
      deleteMemorySession(hashToken(token));
    }
  }
  jar.delete(SESSION_COOKIE);
}

export type SessionUser = {
  id: number;
  username: string;
  displayName: string;
  email: string;
  bio: string;
  avatarHue: number;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  if (isDbConnected()) {
    try {
      await ensureSchemaOnce();
      const rows = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          email: users.email,
          bio: users.bio,
          avatarHue: users.avatarHue,
        })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.userId))
        .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
        .limit(1);

      if (rows[0]) return rows[0];
    } catch (err) {
      console.warn("[Pulse] DB session fetch failed, falling back to memory store:", err);
    }
  }

  const memUser = getMemorySessionUser(hashToken(token));
  if (!memUser) return null;
  return {
    id: memUser.id,
    username: memUser.username,
    displayName: memUser.displayName,
    email: memUser.email,
    bio: memUser.bio,
    avatarHue: memUser.avatarHue,
  };
}

/* ------------------------------ validation ----------------------------- */

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

export function validateSignup(input: {
  username: string;
  displayName: string;
  email: string;
  password: string;
}): string | null {
  if (!USERNAME_RE.test(input.username)) {
    return "Username must be 3-20 characters: lowercase letters, numbers or underscore.";
  }
  if (input.displayName.trim().length < 2 || input.displayName.trim().length > 40) {
    return "Display name must be between 2 and 40 characters.";
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) {
    return "Please enter a valid email address.";
  }
  if (input.password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  return null;
}
