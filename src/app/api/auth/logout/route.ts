import { destroySession } from "@/lib/auth";
import { ok } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST() {
  await destroySession();
  return ok({ ok: true });
}
