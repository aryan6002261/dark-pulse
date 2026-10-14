import Link from "next/link";
import { Avatar, TimeAgo } from "@/components/social";
import { getCurrentUser } from "@/lib/auth";
import { listActivity } from "@/lib/queries";

export const dynamic = "force-dynamic";

const VERBS: Record<string, string> = {
  like: "liked your post",
  comment: "commented on your post",
  follow: "started following you",
};

const ICONS: Record<string, string> = {
  like: "❤️",
  comment: "💬",
  follow: "✨",
};

export default async function ActivityPage() {
  const viewer = await getCurrentUser();

  if (!viewer) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <h1 className="text-xl font-bold text-white">Activity is personal</h1>
        <p className="mt-2 text-sm text-violet-100/75">
          Sign in to see likes, comments and new followers on your posts.
        </p>
        <Link href="/login" className="btn btn-primary mt-5">
          Sign in
        </Link>
      </div>
    );
  }

  const activity = await listActivity(viewer.id);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="card p-5">
        <h1 className="text-2xl font-black tracking-tight text-white">Your activity</h1>
        <p className="mt-1 text-sm text-violet-100/70">
          Everything that happened on your posts and profile, newest first.
        </p>
      </div>

      {activity.length === 0 ? (
        <div className="card p-8 text-center text-sm text-violet-100/70">
          No activity yet. Publish a post and this stream will fill up fast.
        </div>
      ) : (
        <ul className="card divide-y divide-white/8">
          {activity.map((item, index) => (
            <li key={`${item.type}-${item.actor.id}-${index}`} className="flex items-start gap-3 p-4">
              <Avatar user={item.actor} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-violet-50/90">
                  <span className="mr-1">{ICONS[item.type]}</span>
                  <Link href={`/u/${item.actor.username}`} className="font-semibold text-white hover:underline">
                    {item.actor.displayName}
                  </Link>{" "}
                  <span className="text-violet-100/70">{VERBS[item.type]}</span>
                </p>
                {item.snippet ? (
                  <p className="mt-1 line-clamp-2 text-xs text-violet-200/60">
                    {item.type === "comment" ? `“${item.snippet}”` : item.snippet}
                  </p>
                ) : null}
                <p className="mt-1 text-[0.7rem] text-violet-200/45">
                  <TimeAgo iso={item.createdAt} />
                </p>
              </div>
              {item.postId ? (
                <Link href={`/#post-${item.postId}`} className="btn btn-ghost !px-3 !py-1 !text-xs">
                  view
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
