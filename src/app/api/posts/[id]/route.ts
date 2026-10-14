import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { getPost } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) return fail("Invalid post id.", 422);

  const user = await getCurrentUser();
  const post = await getPost(postId, user?.id ?? null);
  if (!post) return fail("Post not found.", 404);
  return ok({ post });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) return fail("Invalid post id.", 422);

  const user = await getCurrentUser();
  if (!user) return fail("Not authorised.", 401);

  const deleted = await db
    .delete(posts)
    .where(and(eq(posts.id, postId), eq(posts.authorId, user.id)))
    .returning({ id: posts.id });

  if (!deleted[0]) return fail("Post not found, or it is not yours.", 404);
  return ok({ ok: true });
}
