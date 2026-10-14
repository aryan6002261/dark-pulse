import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { commentLikes, comments } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Toggles the signed-in user's like on a comment. */
export async function POST(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const commentId = Number(id);
  if (!Number.isInteger(commentId)) return fail("Invalid comment id.", 422);

  const user = await getCurrentUser();
  if (!user) return fail("Sign in to like comments.", 401);

  const target = await db
    .select({ id: comments.id })
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);
  if (!target[0]) return fail("Comment not found.", 404);

  const existing = await db
    .select({ commentId: commentLikes.commentId })
    .from(commentLikes)
    .where(and(eq(commentLikes.commentId, commentId), eq(commentLikes.userId, user.id)))
    .limit(1);

  let liked: boolean;
  if (existing[0]) {
    await db
      .delete(commentLikes)
      .where(and(eq(commentLikes.commentId, commentId), eq(commentLikes.userId, user.id)));
    liked = false;
  } else {
    await db.insert(commentLikes).values({ commentId, userId: user.id });
    liked = true;
  }

  const counted = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(commentLikes)
    .where(eq(commentLikes.commentId, commentId));

  return ok({ liked, likeCount: Number(counted[0]?.count ?? 0) });
}
