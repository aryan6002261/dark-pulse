"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Composer, PostCard, api, useSession } from "@/components/social";
import type { FeedScope, PostDTO } from "@/lib/types";

export function Feed({ initialPosts }: { initialPosts: PostDTO[] }) {
  const { viewer } = useSession();
  const [scope, setScope] = useState<FeedScope>("global");
  const [posts, setPosts] = useState<PostDTO[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setPosts(initialPosts), [initialPosts]);

  const load = useCallback(
    async (nextScope: FeedScope) => {
      setLoading(true);
      setError("");
      try {
        const data = await api<{ posts: PostDTO[] }>(`/api/posts?scope=${nextScope}&limit=50`);
        setPosts(data.posts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load the feed.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  function switchScope(nextScope: FeedScope) {
    if (nextScope === scope) return;
    setScope(nextScope);
    void load(nextScope);
  }

  return (
    <section className="space-y-4">
      <Composer onCreated={(post) => setPosts((list) => [post, ...list])} />

      <div className="card flex items-center justify-between gap-2 !rounded-full px-2 py-2">
        <div className="flex gap-1">
          {(["global", "following"] as FeedScope[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => switchScope(option)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition ${
                scope === option
                  ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-[#0b0620]"
                  : "text-violet-100/70 hover:bg-white/8 hover:text-white"
              }`}
            >
              {option === "global" ? "🌐 Global" : "👥 Following"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void load(scope)}
          className="btn btn-ghost !px-3 !py-1 !text-xs"
          disabled={loading}
        >
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </div>

      {error ? (
        <div className="card p-4 text-sm text-rose-200">
          {error}{" "}
          <button type="button" className="link" onClick={() => void load(scope)}>
            retry
          </button>
        </div>
      ) : null}

      {scope === "following" && !viewer ? (
        <div className="card p-6 text-center">
          <p className="text-sm text-violet-100/80">
            The following feed is personal.{" "}
            <Link href="/login" className="link font-semibold">
              Sign in
            </Link>{" "}
            to see posts from people you follow.
          </p>
        </div>
      ) : posts.length === 0 && !loading ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-violet-100/75">
            {scope === "following"
              ? "Your following feed is quiet. Follow a few people from Discover to fill it up."
              : "No posts yet. Be the first to share something!"}
          </p>
          <Link href="/discover" className="btn btn-outline mt-4">
            Find people to follow
          </Link>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onDeleted={(id) => setPosts((list) => list.filter((item) => item.id !== id))}
          />
        ))
      )}
    </section>
  );
}
