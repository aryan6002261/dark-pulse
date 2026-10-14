import { DiscoverView } from "@/components/discover-view";
import { getCurrentUser } from "@/lib/auth";
import { countStats, listUsers } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const viewer = await getCurrentUser();
  const [people, stats] = await Promise.all([
    listUsers({ viewerId: viewer?.id ?? null, limit: 50 }),
    countStats(),
  ]);

  return <DiscoverView initialPeople={people} stats={stats} />;
}
