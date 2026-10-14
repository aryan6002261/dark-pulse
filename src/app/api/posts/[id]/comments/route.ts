import { eq } from "drizzle-orm";
import { db } from "@/db";
import { comments, posts } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, readJson, str } from "@/lib/http";
import { listComments } from "@/lib/queries";

export const dynamic = "force-dynamic";

const MAX_COMMENT_LENGTH = 280;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) return fail("Invalid post id.", 422);

  const user = await getCurrentUser();
  const list = await listComments(postId, user?.id ?? null);
  return ok({ comments: list });
}

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) return fail("Invalid post id.", 422);

  const user = await getCurrentUser();
  if (!user) return fail("Sign in to comment.", 401);

  const body = await readJson(request);
  const content = str(body.content, MAX_COMMENT_LENGTH);
  if (!content) return fail("Your comment cannot be empty.", 422);

  const target = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  if (!target[0]) return fail("Post not found.", 404);

  const inserted = await db
    .insert(comments)
    .values({ postId, authorId: user.id, content })
    .returning({ id: comments.id });

  const list = await listComments(postId, user.id);
  const created = list.find((c) => c.id === inserted[0]?.id) ?? list[list.length - 1];
  return ok({ comment: created, comments: list }, { status: 201 });
}
