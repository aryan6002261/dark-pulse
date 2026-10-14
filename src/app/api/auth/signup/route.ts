import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  createSession,
  getCurrentUser,
  hashPassword,
  normalizeUsername,
  validateSignup,
} from "@/lib/auth";
import { fail, ok, readJson, str } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJson(request);
  const username = normalizeUsername(body.username);
  const displayName = str(body.displayName, 40);
  const email = str(body.email, 120).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";

  const problem = validateSignup({ username, displayName, email, password });
  if (problem) return fail(problem, 422);

  const existing = await db
    .select({ id: users.id, username: users.username, email: users.email })
    .from(users)
    .where(or(eq(users.username, username), eq(users.email, email)))
    .limit(1);

  if (existing[0]) {
    return fail(
      existing[0].username === username
        ? "That username is already taken."
        : "An account with that email already exists.",
      409,
    );
  }

  const inserted = await db
    .insert(users)
    .values({
      username,
      displayName,
      email,
      passwordHash: hashPassword(password),
      bio: "",
      avatarHue: Math.floor(Math.random() * 360),
    })
    .returning({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      email: users.email,
      bio: users.bio,
      avatarHue: users.avatarHue,
    });

  const user = inserted[0];
  await createSession(user.id);
  return ok({ user }, { status: 201 });
}

export async function GET() {
  const user = await getCurrentUser();
  return ok({ user });
}
