"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CommentDTO, PostDTO, PublicUser } from "@/lib/types";

export type Viewer = {
  id: number;
  username: string;
  displayName: string;
  avatarHue: number;
  email?: string;
  bio?: string;
} | null;

/* --------------------------------- fetch -------------------------------- */

type ApiInit = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  json?: unknown;
};

export async function api<T>(path: string, init: ApiInit = {}): Promise<T> {
  const method = init.method ?? (init.json !== undefined ? "POST" : "GET");
  const response = await fetch(path, {
    method,
    headers: init.json !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
    cache: "no-store",
  });
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : "Something went wrong. Please try again.";
    throw new Error(message);
  }
  return payload as T;
}

/* ------------------------------- session -------------------------------- */

type SessionValue = {
  viewer: Viewer;
  setViewer: (next: Viewer) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ initialUser, children }: { initialUser: Viewer; children: ReactNode }) {
  const [viewer, setViewer] = useState<Viewer>(initialUser);

  useEffect(() => {
    setViewer(initialUser);
  }, [initialUser]);

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ user: Viewer }>("/api/auth/me");
      setViewer(data.user);
    } catch {
      setViewer(null);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      setViewer(null);
    }
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ viewer, setViewer, refresh, logout }),
    [viewer, refresh, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

/* ------------------------------- display -------------------------------- */

export function Avatar({
  user,
  size = 44,
  ring = true,
}: {
  user: { displayName: string; avatarHue: number };
  size?: number;
  ring?: boolean;
}) {
  const initials = user.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const hue = Number.isFinite(user.avatarHue) ? user.avatarHue : 220;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-[#0b0620] ${
        ring ? "ring-2 ring-white/15" : ""
      }`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, size * 0.36),
        background: `linear-gradient(135deg, hsl(${hue} 92% 72%), hsl(${(hue + 58) % 360} 88% 62%))`,
      }}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export function TimeAgo({ iso }: { iso: string }) {
  // Re-render every 30s so relative labels stay fresh without storing derived state.
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 30_000);
    return () => clearInterval(timer);
  }, []);
  return (
    <time dateTime={iso} suppressHydrationWarning title={new Date(iso).toUTCString()}>
      {relativeTime(iso)}
    </time>
  );
}

/** Renders text with #hashtags and @mentions highlighted. */
export function RichText({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  const pattern = /([#@])([a-zA-Z0-9_]{1,20})/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const token = match[0];
    if (match[1] === "@") {
      nodes.push(
        <Link
          key={`m-${key++}`}
          href={`/u/${match[2].toLowerCase()}`}
          className="font-semibold text-violet-300 hover:underline"
        >
          {token}
        </Link>,
      );
    } else {
      nodes.push(
        <span key={`h-${key++}`} className="font-semibold text-sky-300">
          {token}
        </span>,
      );
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

  return (
    <p className="text-[0.95rem] leading-relaxed whitespace-pre-wrap break-words text-violet-50/90">
      {nodes}
    </p>
  );
}

export function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-[0.68rem] font-semibold tracking-wide text-violet-200/55 uppercase">
        {label}
      </div>
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-200">
      {children}
    </p>
  );
}

/* ------------------------------ interactions ---------------------------- */

export function FollowButton({
  username,
  initialFollowing,
  compact = false,
  onToggle,
}: {
  username: string;
  initialFollowing: boolean;
  compact?: boolean;
  onToggle?: (following: boolean) => void;
}) {
  const { viewer, refresh } = useSession();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setFollowing(initialFollowing), [initialFollowing]);

  async function toggle() {
    if (!viewer) {
      setError("Sign in to follow people.");
      return;
    }
    setBusy(true);
    setError("");
    const optimistic = !following;
    setFollowing(optimistic);
    try {
      const res = await api<{ following: boolean }>(`/api/users/${username}/follow`, {
        method: "POST",
      });
      setFollowing(res.following);
      onToggle?.(res.following);
    } catch (err) {
      setFollowing(!optimistic);
      setError(err instanceof Error ? err.message : "Could not update follow state.");
    } finally {
      setBusy(false);
      void refresh();
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`btn ${following ? "btn-ghost" : "btn-primary"} ${compact ? "!px-3 !py-1 !text-xs" : ""}`}
      >
        {following ? "Following" : "Follow"}
      </button>
      {error ? <span className="text-[0.65rem] text-rose-300">{error}</span> : null}
    </div>
  );
}

export function Composer({
  placeholder = "What's happening?",
  onCreated,
}: {
  placeholder?: string;
  onCreated: (post: PostDTO) => void;
}) {
  const { viewer } = useSession();
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const limit = 500;

  if (!viewer) {
    return (
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-violet-100/80">
          Join the conversation — sign in to share your thoughts.
        </p>
        <Link href="/login" className="btn btn-primary">
          Sign in
        </Link>
      </div>
    );
  }

  async function submit() {
    const trimmed = content.trim();
    if (!trimmed) {
      setError("Write something first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await api<{ post: PostDTO }>("/api/posts", { json: { content: trimmed } });
      onCreated(res.post);
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish your post.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="flex gap-3">
        <Avatar user={{ displayName: viewer.displayName, avatarHue: viewer.avatarHue }} size={42} />
        <div className="flex-1">
          <textarea
            className="field min-h-[86px] resize-y"
            maxLength={limit}
            value={content}
            placeholder={placeholder}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void submit();
            }}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[0.7rem] text-violet-200/50">
              {content.length}/{limit} · ⌘/Ctrl + Enter to post
            </span>
            <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>
              {busy ? "Posting…" : "Post"}
            </button>
          </div>
          <ErrorText>{error}</ErrorText>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- comments ------------------------------ */

function CommentRow({
  comment,
  onDeleted,
}: {
  comment: CommentDTO;
  onDeleted: (id: number) => void;
}) {
  const { viewer } = useSession();
  const [liked, setLiked] = useState(comment.likedByViewer);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [error, setError] = useState("");

  async function toggleLike() {
    if (!viewer) {
      setError("Sign in to like comments.");
      return;
    }
    const optimistic = !liked;
    setLiked(optimistic);
    setLikeCount((count) => count + (optimistic ? 1 : -1));
    try {
      const res = await api<{ liked: boolean; likeCount: number }>(
        `/api/comments/${comment.id}/like`,
        { method: "POST" },
      );
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    } catch {
      setLiked(!optimistic);
      setLikeCount((count) => count + (optimistic ? -1 : 1));
    }
  }

  async function remove() {
    try {
      await api(`/api/comments/${comment.id}`, { method: "DELETE" });
      onDeleted(comment.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete comment.");
    }
  }

  return (
    <div className="flex gap-3 py-3">
      <Link href={`/u/${comment.author.username}`}>
        <Avatar user={comment.author} size={32} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 text-xs">
          <Link href={`/u/${comment.author.username}`} className="font-semibold text-white hover:underline">
            {comment.author.displayName}
          </Link>
          <span className="text-violet-200/50">@{comment.author.username}</span>
          <span className="text-violet-200/40">·</span>
          <span className="text-violet-200/50">
            <TimeAgo iso={comment.createdAt} />
          </span>
        </div>
        <div className="mt-1">
          <RichText text={comment.content} />
        </div>
        <div className="mt-1.5 flex items-center gap-3 text-xs">
          <button
            type="button"
            onClick={toggleLike}
            className={`chip !px-2 !py-0.5 hover:border-violet-300/50 ${
              liked ? "!border-fuchsia-300/60 !text-fuchsia-200" : ""
            }`}
          >
            <span>{liked ? "❤️" : "🤍"}</span>
            <span>{likeCount}</span>
          </button>
          {viewer?.id === comment.author.id ? (
            <button type="button" onClick={remove} className="text-[0.7rem] text-rose-300/80 hover:text-rose-200">
              delete
            </button>
          ) : null}
        </div>
        {error ? <p className="mt-1 text-[0.7rem] text-rose-300">{error}</p> : null}
      </div>
    </div>
  );
}

/* -------------------------------- post card ----------------------------- */

export function PostCard({
  post,
  onDeleted,
  highlight = false,
}: {
  post: PostDTO;
  onDeleted?: (id: number) => void;
  highlight?: boolean;
}) {
  const { viewer } = useSession();
  const [liked, setLiked] = useState(post.likedByViewer);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [open, setOpen] = useState(highlight);
  const [comments, setComments] = useState<CommentDTO[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setLiked(post.likedByViewer);
    setLikeCount(post.likeCount);
    setCommentCount(post.commentCount);
  }, [post.id, post.likedByViewer, post.likeCount, post.commentCount]);

  useEffect(() => {
    if (!open || comments) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await api<{ comments: CommentDTO[] }>(`/api/posts/${post.id}/comments`);
        if (!cancelled) setComments(res.comments);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load comments.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, comments, post.id]);

  async function toggleLike() {
    if (!viewer) {
      setNotice("Sign in to like posts.");
      return;
    }
    const optimistic = !liked;
    setLiked(optimistic);
    setLikeCount((count) => count + (optimistic ? 1 : -1));
    try {
      const res = await api<{ liked: boolean; likeCount: number }>(`/api/posts/${post.id}/like`, {
        method: "POST",
      });
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    } catch {
      setLiked(!optimistic);
      setLikeCount((count) => count + (optimistic ? -1 : 1));
    }
  }

  async function addComment() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (!viewer) {
      setNotice("Sign in to comment.");
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ comments: CommentDTO[] }>(`/api/posts/${post.id}/comments`, {
        json: { content: trimmed },
      });
      setComments(res.comments);
      setCommentCount(res.comments.length);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add comment.");
    } finally {
      setBusy(false);
    }
  }

  async function removePost() {
    try {
      await api(`/api/posts/${post.id}`, { method: "DELETE" });
      onDeleted?.(post.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete post.");
    }
  }

  return (
    <article
      id={`post-${post.id}`}
      className="card card-hover fade-in scroll-mt-24 p-4 sm:p-5"
    >
      <header className="flex items-start gap-3">
        <Link href={`/u/${post.author.username}`}>
          <Avatar user={post.author} size={44} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2">
            <Link href={`/u/${post.author.username}`} className="font-semibold text-white hover:underline">
              {post.author.displayName}
            </Link>
            <span className="text-xs text-violet-200/55">@{post.author.username}</span>
          </div>
          <div className="text-xs text-violet-200/45">
            <TimeAgo iso={post.createdAt} />
          </div>
        </div>
        {viewer?.id === post.author.id ? (
          <button
            type="button"
            onClick={removePost}
            className="rounded-full border border-white/10 px-2.5 py-1 text-[0.68rem] text-rose-200/80 transition hover:border-rose-300/50 hover:text-rose-100"
          >
            delete
          </button>
        ) : null}
      </header>

      <div className="mt-3">
        <RichText text={post.content} />
      </div>

      <footer className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggleLike}
          className={`chip ${liked ? "!border-fuchsia-300/60 !text-fuchsia-200" : ""} hover:border-fuchsia-300/50`}
        >
          <span>{liked ? "❤️" : "🤍"}</span>
          <span>{likeCount}</span>
        </button>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={`chip ${open ? "!border-violet-300/60 !text-violet-100" : ""} hover:border-violet-300/50`}
        >
          <span>💬</span>
          <span>{commentCount}</span>
          <span className="hidden sm:inline">{open ? "hide" : "comments"}</span>
        </button>
      </footer>

      {notice ? <p className="mt-2 text-[0.72rem] text-amber-200/80">{notice}</p> : null}

      {open ? (
        <div className="mt-4 border-t border-white/10 pt-2">
          {comments === null ? (
            <p className="py-3 text-xs text-violet-200/50">Loading comments…</p>
          ) : comments.length === 0 ? (
            <p className="py-3 text-xs text-violet-200/50">No comments yet — start the thread.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {comments.map((comment) => (
                <CommentRow
                  key={comment.id}
                  comment={comment}
                  onDeleted={(id) => {
                    setComments((list) => (list ?? []).filter((item) => item.id !== id));
                    setCommentCount((count) => Math.max(0, count - 1));
                  }}
                />
              ))}
            </div>
          )}

          {viewer ? (
            <div className="mt-3 flex items-end gap-2">
              <Avatar user={{ displayName: viewer.displayName, avatarHue: viewer.avatarHue }} size={32} />
              <div className="flex-1">
                <textarea
                  className="field min-h-[52px] resize-y text-sm"
                  maxLength={280}
                  rows={2}
                  value={draft}
                  placeholder="Write a reply…"
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void addComment();
                  }}
                />
              </div>
              <button type="button" className="btn btn-outline" onClick={addComment} disabled={busy}>
                {busy ? "…" : "Reply"}
              </button>
            </div>
          ) : (
            <p className="mt-2 text-xs text-violet-200/55">
              <Link href="/login" className="link">
                Sign in
              </Link>{" "}
              to reply.
            </p>
          )}
          <div className="mt-2">
            <ErrorText>{error}</ErrorText>
          </div>
        </div>
      ) : (
        <div className="mt-2">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
    </article>
  );
}

/* ------------------------------ person cards ---------------------------- */

export function PersonCard({
  person,
  onFollowChange,
}: {
  person: PublicUser & { followerCount?: number; postCount?: number; isFollowing: boolean };
  onFollowChange?: (username: string, following: boolean) => void;
}) {
  return (
    <div className="card card-hover flex items-start gap-3 p-4">
      <Link href={`/u/${person.username}`}>
        <Avatar user={person} size={46} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/u/${person.username}`} className="block truncate font-semibold text-white hover:underline">
          {person.displayName}
        </Link>
        <p className="text-xs text-violet-200/55">@{person.username}</p>
        {person.bio ? (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-violet-100/70">{person.bio}</p>
        ) : null}
        {typeof person.followerCount === "number" ? (
          <p className="mt-2 text-[0.68rem] text-violet-200/45">
            {person.followerCount} followers · {person.postCount ?? 0} posts
          </p>
        ) : null}
      </div>
      <FollowButton
        username={person.username}
        initialFollowing={person.isFollowing}
        compact
        onToggle={(following) => onFollowChange?.(person.username, following)}
      />
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/65 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card fade-in mt-16 w-full max-w-lg !bg-[#0c0a1dee] p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="btn btn-ghost !px-2.5 !py-1 !text-xs">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
