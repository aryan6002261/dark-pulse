import Link from "next/link";
import { Feed } from "@/components/feed";
import { PersonCard, Stat } from "@/components/social";
import { getCurrentUser } from "@/lib/auth";
import { countStats, listPosts, listUsers } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const viewer = await getCurrentUser();
  const [posts, stats, suggestions] = await Promise.all([
    listPosts({ viewerId: viewer?.id ?? null, scope: "global", limit: 50 }),
    countStats(),
    listUsers({ viewerId: viewer?.id ?? null, limit: 5 }),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-4">
        <div className="card p-5">
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Your <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">Pulse</span> feed
          </h1>
          <p className="mt-1 text-sm text-violet-100/70">
            Share short updates, reply in threads, and follow the people who interest you.
          </p>
        </div>
        <Feed initialPosts={posts} />
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="card p-5">
          <h2 className="text-sm font-bold tracking-wide text-violet-200/70 uppercase">
            Network pulse
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat label="People" value={stats.users} />
            <Stat label="Posts" value={stats.posts} />
            <Stat label="Comments" value={stats.comments} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Stat label="Likes" value={stats.likes} />
            <Stat label="Follows" value={stats.follows} />
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-wide text-violet-200/70 uppercase">
              Who to follow
            </h2>
            <Link href="/discover" className="link text-xs">
              see all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {suggestions.length === 0 ? (
              <p className="text-xs text-violet-200/55">
                Nobody else has joined yet — invite a friend, or create a second account to try the
                follow graph.
              </p>
            ) : (
              suggestions.map((person) => (
                <PersonCard key={person.id} person={person} />
              ))
            )}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-bold tracking-wide text-violet-200/70 uppercase">
            How it&apos;s built
          </h2>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-violet-100/70">
            <li>
              <strong className="text-white">Backend:</strong> REST API routes (Express-style
              handlers) under <code className="text-violet-300">/api</code>
            </li>
            <li>
              <strong className="text-white">Database:</strong> PostgreSQL via Drizzle ORM — users,
              posts, comments, likes, follows, sessions
            </li>
            <li>
              <strong className="text-white">Security:</strong> scrypt password hashing, opaque
              httpOnly session cookies, server-side authorisation checks
            </li>
          </ul>
          <Link href="/login?mode=signup" className="btn btn-primary mt-4 w-full">
            Create an account
          </Link>
        </div>
      </aside>
    </div>
  );
}
