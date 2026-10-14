import { db, isDbConnected } from "@/db";
import { posts } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, readJson, str } from "@/lib/http";
import { createMemoryPost } from "@/lib/memory-store";
import { listPosts } from "@/lib/queries";
import type { FeedScope } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_POST_LENGTH = 500;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const url = new URL(request.url);
  const scopeParam = url.searchParams.get("scope");
  const scope: FeedScope = scopeParam === "following" ? "following" : "global";
  const username = url.searchParams.get("username") ?? undefined;
  const likedBy = url.searchParams.get("likedBy") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? 40);

  if (scope === "following" && !user) return fail("Sign in to view your following feed.", 401);

  const feed = await listPosts({
    viewerId: user?.id ?? null,
    scope,
    authorUsername: username,
    likedByUsername: likedBy,
    limit: Number.isFinite(limit) ? limit : 40,
  });

  return ok({ posts: feed });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("You must be signed in to post.", 401);

  const body = await readJson(request);
  const content = str(body.content, MAX_POST_LENGTH);
  if (!content) return fail("Your post cannot be empty.", 422);
  if (content.length > MAX_POST_LENGTH) {
    return fail(`Posts are limited to ${MAX_POST_LENGTH} characters.`, 422);
  }

  if (isDbConnected()) {
    try {
      const inserted = await db
        .insert(posts)
        .values({ authorId: user.id, content })
        .returning({ id: posts.id });

      const created = await listPosts({ viewerId: user.id, limit: 1 });
      const fresh = created.find((p) => p.id === inserted[0]?.id) ?? created[0];
      return ok({ post: fresh }, { status: 201 });
    } catch (err) {
      console.warn("[Pulse] DB post insert failed, using memory store fallback:", err);
    }
  }

  const fresh = createMemoryPost(user.id, content);
  return ok({ post: fresh }, { status: 201 });
}
