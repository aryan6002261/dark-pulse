"use client";

import { useCallback, useEffect, useState } from "react";
import { PersonCard, Stat, api } from "@/components/social";
import type { UserCardDTO } from "@/lib/types";

export function DiscoverView({
  initialPeople,
  stats,
}: {
  initialPeople: UserCardDTO[];
  stats: { users: number; posts: number; comments: number; likes: number; follows: number };
}) {
  const [people, setPeople] = useState(initialPeople);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (term: string) => {
    setLoading(true);
    try {
      const data = await api<{ people: UserCardDTO[] }>(
        `/api/users?q=${encodeURIComponent(term)}&limit=50`,
      );
      setPeople(data.people);
    } catch {
      setPeople([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void search(query), 260);
    return () => clearTimeout(timer);
  }, [query, search]);

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <h1 className="text-2xl font-black tracking-tight text-white">Discover people</h1>
        <p className="mt-1 text-sm text-violet-100/70">
          Search by name or @username, then follow to build your home feed.
        </p>
        <input
          className="field mt-4"
          placeholder="Search people… e.g. ada or @grace"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
          <Stat label="People" value={stats.users} />
          <Stat label="Posts" value={stats.posts} />
          <Stat label="Comments" value={stats.comments} />
          <Stat label="Likes" value={stats.likes} />
          <Stat label="Follows" value={stats.follows} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {loading && people.length === 0 ? (
          <p className="card p-6 text-sm text-violet-200/60">Searching…</p>
        ) : people.length === 0 ? (
          <p className="card p-6 text-sm text-violet-100/70">
            No profiles match “{query}”. Try another search.
          </p>
        ) : (
          people.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              onFollowChange={(username, following) =>
                setPeople((list) =>
                  list.map((item) =>
                    item.username === username ? { ...item, isFollowing: following } : item,
                  ),
                )
              }
            />
          ))
        )}
      </section>
    </div>
  );
}
