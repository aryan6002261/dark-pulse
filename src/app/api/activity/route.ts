import { getCurrentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { listActivity } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in to see your activity.", 401);
  const activity = await listActivity(user.id);
  return ok({ activity });
}
