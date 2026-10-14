import { getCurrentUser } from "@/lib/auth";
import { ok } from "@/lib/http";
import { listUsers } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const url = new URL(request.url);
  const search = url.searchParams.get("q") ?? "";
  const limit = Number(url.searchParams.get("limit") ?? 30);

  const people = await listUsers({
    viewerId: user?.id ?? null,
    search,
    limit: Number.isFinite(limit) ? limit : 30,
  });

  return ok({ people });
}
