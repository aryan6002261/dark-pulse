"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Avatar,
  ErrorText,
  FollowButton,
  Modal,
  PersonCard,
  PostCard,
  Stat,
  api,
  useSession,
} from "@/components/social";
import type { PostDTO, ProfileDTO } from "@/lib/types";

type Tab = "posts" | "likes";

export function ProfileView({
  initialProfile,
  initialPosts,
}: {
  initialProfile: ProfileDTO;
  initialPosts: PostDTO[];
}) {
  const { viewer, refresh } = useSession();
  const [profile, setProfile] = useState(initialProfile);
  const [tab, setTab] = useState<Tab>("posts");
  const [posts, setPosts] = useState<PostDTO[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [connections, setConnections] = useState<{
    kind: "followers" | "following";
    people: Array<{ id: number; username: string; displayName: string; avatarHue: number; bio: string; isFollowing: boolean }>;
  } | null>(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(initialProfile.displayName);
  const [bio, setBio] = useState(initialProfile.bio);
  const [saving, setSaving] = useState(false);

  useEffect(() => setProfile(initialProfile), [initialProfile]);

  const reloadProfile = useCallback(async () => {
    try {
      const data = await api<{ profile: ProfileDTO }>(`/api/users/${initialProfile.username}`);
      setProfile(data.profile);
      void refresh();
    } catch {
      /* keep last known profile */
    }
  }, [initialProfile.username, refresh]);

  const loadTab = useCallback(
    async (nextTab: Tab) => {
      setLoading(true);
      setError("");
      try {
        const query =
          nextTab === "likes"
            ? `/api/posts?likedBy=${initialProfile.username}&limit=50`
            : `/api/posts?username=${initialProfile.username}&limit=50`;
        const data = await api<{ posts: PostDTO[] }>(query);
        setPosts(data.posts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load posts.");
      } finally {
        setLoading(false);
      }
    },
    [initialProfile.username],
  );

  function switchTab(next: Tab) {
    if (next === tab) return;
    setTab(next);
    void loadTab(next);
  }

  async function openConnections(kind: "followers" | "following") {
    setConnections({ kind, people: [] });
    try {
      const data = await api<{
        kind: "followers" | "following";
        people: Array<{
          id: number;
          username: string;
          displayName: string;
          avatarHue: number;
          bio: string;
          isFollowing: boolean;
        }>;
      }>(`/api/users/${profile.username}/connections?kind=${kind}`);
      setConnections({ kind: data.kind, people: data.people });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load connections.");
      setConnections(null);
    }
  }

  async function saveProfile() {
    setSaving(true);
    setError("");
    try {
      const data = await api<{ profile: ProfileDTO }>(`/api/users/${profile.username}`, {
        method: "PATCH",
        json: { displayName, bio },
      });
      setProfile(data.profile);
      setEditing(false);
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  const isSelf = viewer?.id === profile.id;

  return (
    <div className="space-y-5">
      <section className="card overflow-hidden">
        <div
          className="h-28 w-full"
          style={{
            background: `linear-gradient(120deg, hsl(${profile.avatarHue} 85% 45%), hsl(${
              (profile.avatarHue + 60) % 360
            } 80% 55%))`,
          }}
        />
        <div className="-mt-10 flex flex-wrap items-end gap-4 px-5 pb-5">
          <div className="rounded-full ring-4 ring-[#0a0818]">
            <Avatar user={profile} size={84} ring={false} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-black tracking-tight text-white">
              {profile.displayName}
            </h1>
            <p className="text-sm text-violet-200/60">@{profile.username}</p>
          </div>
          {isSelf ? (
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(true)}>
              ✎ Edit profile
            </button>
          ) : viewer ? (
            <FollowButton
              username={profile.username}
              initialFollowing={profile.isFollowing}
              onToggle={() => void reloadProfile()}
            />
          ) : (
            <Link href="/login" className="btn btn-primary">
              Sign in to follow
            </Link>
          )}
        </div>

        <div className="border-t border-white/8 px-5 py-4">
          {profile.bio ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-violet-50/85">
              {profile.bio}
            </p>
          ) : (
            <p className="text-sm text-violet-200/45">
              {isSelf ? "Add a short bio from “Edit profile”." : "No bio yet."}
            </p>
          )}
          {profile.followsViewer && !isSelf ? (
            <p className="mt-2 chip">✨ Follows you</p>
          ) : null}
          <p className="mt-3 text-xs text-violet-200/50">
            Joined{" "}
            {new Date(profile.createdAt).toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </p>

          <div className="mt-4 grid max-w-md grid-cols-3 gap-2">
            <button type="button" onClick={() => switchTab("posts")} className="text-center">
              <Stat label="Posts" value={profile.postCount} />
            </button>
            <button type="button" onClick={() => void openConnections("followers")} className="text-center">
              <Stat label="Followers" value={profile.followerCount} />
            </button>
            <button type="button" onClick={() => void openConnections("following")} className="text-center">
              <Stat label="Following" value={profile.followingCount} />
            </button>
          </div>
        </div>
      </section>

      <div className="card flex gap-1 !rounded-full px-2 py-2">
        {(
          [
            { id: "posts", label: "🧵 Posts" },
            { id: "likes", label: "❤️ Likes" },
          ] as Array<{ id: Tab; label: string }>
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => switchTab(item.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              tab === item.id
                ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-[#0b0620]"
                : "text-violet-100/70 hover:bg-white/8 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <ErrorText>{error}</ErrorText>
        {loading ? (
          <div className="card p-6 text-center text-sm text-violet-200/60">Loading…</div>
        ) : posts.length === 0 ? (
          <div className="card p-8 text-center text-sm text-violet-100/70">
            {tab === "posts"
              ? isSelf
                ? "You haven't posted yet — write your first update in the feed."
                : "This user hasn't posted yet."
              : "No liked posts to show yet."}
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDeleted={(id) => {
                setPosts((list) => list.filter((item) => item.id !== id));
                void reloadProfile();
              }}
            />
          ))
        )}
      </div>

      {connections ? (
        <Modal
          title={
            connections.kind === "followers"
              ? `Followers of @${profile.username}`
              : `@${profile.username} follows`
          }
          onClose={() => setConnections(null)}
        >
          {connections.people.length === 0 ? (
            <p className="text-sm text-violet-200/60">Nothing here yet.</p>
          ) : (
            <div className="space-y-3">
              {connections.people.map((person) => (
                <PersonCard
                  key={person.id}
                  person={person}
                  onFollowChange={() => {
                    void reloadProfile();
                    void openConnections(connections.kind);
                  }}
                />
              ))}
            </div>
          )}
        </Modal>
      ) : null}

      {editing ? (
        <Modal title="Edit profile" onClose={() => setEditing(false)}>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-violet-200/70" htmlFor="displayName">
                Display name
              </label>
              <input
                id="displayName"
                className="field"
                value={displayName}
                maxLength={40}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-violet-200/70" htmlFor="bio">
                Bio (max 240 chars)
              </label>
              <textarea
                id="bio"
                className="field min-h-[96px] resize-y"
                value={bio}
                maxLength={240}
                onChange={(event) => setBio(event.target.value)}
              />
            </div>
            <ErrorText>{error}</ErrorText>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={saveProfile} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
