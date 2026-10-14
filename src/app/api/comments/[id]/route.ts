import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { comments } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const commentId = Number(id);
  if (!Number.isInteger(commentId)) return fail("Invalid comment id.", 422);

  const user = await getCurrentUser();
  if (!user) return fail("Not authorised.", 401);

  const deleted = await db
    .delete(comments)
    .where(and(eq(comments.id, commentId), eq(comments.authorId, user.id)))
    .returning({ id: comments.id });

  if (!deleted[0]) return fail("Comment not found, or it is not yours.", 404);
  return ok({ ok: true });
}
