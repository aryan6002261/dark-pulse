import { eq, or } from "drizzle-orm";
import { db, isDbConnected } from "@/db";
import { users } from "@/db/schema";
import { createSession, verifyPassword } from "@/lib/auth";
import { fail, ok, readJson, str } from "@/lib/http";
import { findMemoryUserByIdentifier } from "@/lib/memory-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJson(request);
  const identifier = str(body.identifier ?? body.username ?? body.email, 120).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";

  if (!identifier || !password) {
    return fail("Enter your username/email and password.", 422);
  }

  if (isDbConnected()) {
    try {
      const found = await db
        .select()
        .from(users)
        .where(or(eq(users.username, identifier), eq(users.email, identifier)))
        .limit(1);

      const account = found[0];
      if (account) {
        if (!verifyPassword(password, account.passwordHash)) {
          return fail("Invalid credentials. Please try again.", 401);
        }

        await createSession(account.id);
        return ok({
          user: {
            id: account.id,
            username: account.username,
            displayName: account.displayName,
            email: account.email,
            bio: account.bio,
            avatarHue: account.avatarHue,
          },
        });
      }
    } catch (err) {
      console.warn("[Pulse] DB login query failed, trying memory store:", err);
    }
  }

  const memAccount = findMemoryUserByIdentifier(identifier);
  if (!memAccount || !verifyPassword(password, memAccount.passwordHash)) {
    return fail("Invalid credentials. Please try again.", 401);
  }

  await createSession(memAccount.id);
  return ok({
    user: {
      id: memAccount.id,
      username: memAccount.username,
      displayName: memAccount.displayName,
      email: memAccount.email,
      bio: memAccount.bio,
      avatarHue: memAccount.avatarHue,
    },
  });
}
