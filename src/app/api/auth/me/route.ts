import { getCurrentUser } from "@/lib/auth";
import { countStats } from "@/lib/queries";
import { ok } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  const stats = await countStats();
  return ok({ user, stats });
}
