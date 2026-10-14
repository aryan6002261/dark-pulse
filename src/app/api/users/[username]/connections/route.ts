import { getCurrentUser, normalizeUsername } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { getProfile, listConnections } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ username: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { username } = await params;
  const handle = normalizeUsername(username);
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") === "following" ? "following" : "followers";

  const viewer = await getCurrentUser();
  const profile = await getProfile(handle, viewer?.id ?? null);
  if (!profile) return fail("User not found.", 404);

  const people = await listConnections(handle, kind, viewer?.id ?? null);
  return ok({ kind, people });
}
