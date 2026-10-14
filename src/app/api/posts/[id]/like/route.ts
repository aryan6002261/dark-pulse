import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { postLikes, posts } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Toggles the signed-in user's like on a post. */
export async function POST(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) return fail("Invalid post id.", 422);

  const user = await getCurrentUser();
  if (!user) return fail("Sign in to like posts.", 401);

  const target = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  if (!target[0]) return fail("Post not found.", 404);

  const existing = await db
    .select({ postId: postLikes.postId })
    .from(postLikes)
    .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, user.id)))
    .limit(1);

  let liked: boolean;
  if (existing[0]) {
    await db
      .delete(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, user.id)));
    liked = false;
  } else {
    await db.insert(postLikes).values({ postId, userId: user.id });
    liked = true;
  }

  const counted = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(postLikes)
    .where(eq(postLikes.postId, postId));

  return ok({ liked, likeCount: Number(counted[0]?.count ?? 0) });
}
