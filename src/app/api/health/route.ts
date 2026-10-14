import { db, isDbConnected } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDbConnected()) {
    return Response.json({ ok: true, storage: "in-memory" });
  }
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, storage: "postgres" });
  } catch {
    return Response.json({ ok: true, storage: "in-memory-fallback" });
  }
}
