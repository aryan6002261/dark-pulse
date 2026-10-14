import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser, normalizeUsername } from "@/lib/auth";
import { fail, ok, readJson, str } from "@/lib/http";
import { getProfile } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ username: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { username } = await params;
  const viewer = await getCurrentUser();
  const profile = await getProfile(normalizeUsername(username), viewer?.id ?? null);
  if (!profile) return fail("User not found.", 404);
  return ok({ profile });
}

/** Update the signed-in user's own profile (display name + bio). */
export async function PATCH(request: Request, { params }: Ctx) {
  const { username } = await params;
  const viewer = await getCurrentUser();
  if (!viewer) return fail("Not authorised.", 401);
  if (viewer.username !== normalizeUsername(username)) {
    return fail("You can only edit your own profile.", 403);
  }

  const body = await readJson(request);
  const displayName = str(body.displayName, 40);
  const bio = str(body.bio, 240);

  if (displayName.length < 2) return fail("Display name must be at least 2 characters.", 422);

  await db
    .update(users)
    .set({ displayName, bio })
    .where(eq(users.id, viewer.id));

  const profile = await getProfile(viewer.username, viewer.id);
  return ok({ profile });
}
