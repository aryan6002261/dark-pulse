import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { follows, users } from "@/db/schema";
import { getCurrentUser, normalizeUsername } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ username: string }> };

/** Toggles follow / unfollow for the signed-in user. */
export async function POST(_request: Request, { params }: Ctx) {
  const { username } = await params;
  const target = normalizeUsername(username);

  const viewer = await getCurrentUser();
  if (!viewer) return fail("Sign in to follow people.", 401);
  if (viewer.username === target) return fail("You cannot follow yourself.", 422);

  const found = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, target))
    .limit(1);
  const targetUser = found[0];
  if (!targetUser) return fail("User not found.", 404);

  const existing = await db
    .select({ followerId: follows.followerId })
    .from(follows)
    .where(and(eq(follows.followerId, viewer.id), eq(follows.followingId, targetUser.id)))
    .limit(1);

  let following: boolean;
  if (existing[0]) {
    await db
      .delete(follows)
      .where(and(eq(follows.followerId, viewer.id), eq(follows.followingId, targetUser.id)));
    following = false;
  } else {
    await db.insert(follows).values({ followerId: viewer.id, followingId: targetUser.id });
    following = true;
  }

  const counted = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(follows)
    .where(eq(follows.followingId, targetUser.id));

  return ok({ following, followerCount: Number(counted[0]?.count ?? 0) });
}
