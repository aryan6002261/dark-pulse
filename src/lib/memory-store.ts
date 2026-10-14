import { randomBytes, scryptSync } from "node:crypto";
import type {
  ActivityDTO,
  CommentDTO,
  ConnectionDTO,
  FeedScope,
  PostDTO,
  ProfileDTO,
  PublicUser,
  UserCardDTO,
} from "./types";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export type MemoryUser = {
  id: number;
  username: string;
  displayName: string;
  email: string;
  passwordHash: string;
  bio: string;
  avatarHue: number;
  createdAt: string;
};

export type MemoryPost = {
  id: number;
  authorId: number;
  content: string;
  createdAt: string;
};

export type MemoryComment = {
  id: number;
  postId: number;
  authorId: number;
  content: string;
  createdAt: string;
};

export type MemorySession = {
  tokenHash: string;
  userId: number;
  expiresAt: string;
};

export type MemoryActivity = {
  type: "like" | "comment" | "follow";
  actorId: number;
  targetUserId: number;
  postId: number | null;
  snippet: string | null;
  createdAt: string;
};

const DEFAULT_PASSWORD_HASH = hashPassword("password123");

// Global store to persist across HMR in dev
const globalForStore = globalThis as typeof globalThis & {
  __pulseMemoryStore?: {
    users: MemoryUser[];
    posts: MemoryPost[];
    comments: MemoryComment[];
    postLikes: Set<string>; // `${postId}:${userId}`
    commentLikes: Set<string>; // `${commentId}:${userId}`
    follows: Set<string>; // `${followerId}:${followingId}`
    sessions: Map<string, MemorySession>;
    activities: MemoryActivity[];
    nextUserId: number;
    nextPostId: number;
    nextCommentId: number;
  };
};

function initStore() {
  if (globalForStore.__pulseMemoryStore) return globalForStore.__pulseMemoryStore;

  const users: MemoryUser[] = [
    {
      id: 1,
      username: "ada",
      displayName: "Ada Lovelace",
      email: "ada@pulse.dev",
      passwordHash: DEFAULT_PASSWORD_HASH,
      avatarHue: 265,
      bio: "Countess of computing. Writing notes on the Analytical Engine and occasionally on life.",
      createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: 2,
      username: "grace",
      displayName: "Grace Hopper",
      email: "grace@pulse.dev",
      passwordHash: DEFAULT_PASSWORD_HASH,
      avatarHue: 190,
      bio: "Rear admiral, compiler pioneer, and devoted nemesis of the nanosecond.",
      createdAt: new Date(Date.now() - 28 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: 3,
      username: "linus",
      displayName: "Linus Torvalds",
      email: "linus@pulse.dev",
      passwordHash: DEFAULT_PASSWORD_HASH,
      avatarHue: 20,
      bio: "Just here to talk about trees, kernels, and toolchains.",
      createdAt: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: 4,
      username: "mira",
      displayName: "Mira Chen",
      email: "mira@pulse.dev",
      passwordHash: DEFAULT_PASSWORD_HASH,
      avatarHue: 320,
      bio: "Product designer. Obsessed with type scales, dark modes and good error messages.",
      createdAt: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: 5,
      username: "dev",
      displayName: "Dev Patel",
      email: "dev@pulse.dev",
      passwordHash: DEFAULT_PASSWORD_HASH,
      avatarHue: 95,
      bio: "Backend engineer. Postgres apologist. I read the query plans for fun.",
      createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: 6,
      username: "sana",
      displayName: "Sana Okafor",
      email: "sana@pulse.dev",
      passwordHash: DEFAULT_PASSWORD_HASH,
      avatarHue: 145,
      bio: "Data storyteller. Charts first, opinions later.",
      createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    },
  ];

  const rawPosts = [
    { authorId: 1, content: "The Analytical Engine weaves algebraic patterns just as the Jacquard loom weaves flowers and leaves. #computing #history" },
    { authorId: 1, content: "Spent the morning debugging a query plan instead of the query. Postgres was right, I was wrong. #postgres" },
    { authorId: 2, content: "It's easier to ask forgiveness than it is to get permission. Still true, especially in code review. #wisdom" },
    { authorId: 2, content: "A ship in port is safe, but that's not what ships are built for. Deploy on Friday, I dare you. ⚓" },
    { authorId: 3, content: "Talk is cheap. Show me the code. — still the best commit message I never wrote. #opensource" },
    { authorId: 4, content: "Reminder that a 4px change in border radius can ruin an entire afternoon. Design is mostly empathy plus arithmetic. #ui" },
    { authorId: 4, content: "Dark mode is not just inverting colors, it's re-tuning every single accent. Here is my token sheet if you want it. #design" },
    { authorId: 5, content: "Indexes are not free, but neither is your time. Measure before you optimize anything. #postgres #backend" },
    { authorId: 5, content: "Wrote a social graph in SQL today. Recursive CTEs are criminally underrated. #sql" },
    { authorId: 6, content: "Every dashboard is a story someone was too impatient to tell out loud. Make the axis labels bigger, please. #data" },
    { authorId: 6, content: "Hot take: a table with good sorting beats a fancy chart nine times out of ten. #dataviz" },
    { authorId: 3, content: "Someone asked why my editor looks like 1995. Because 1995 booted faster than your electron app. #unix" },
  ];

  const posts: MemoryPost[] = rawPosts.map((p, idx) => ({
    id: idx + 1,
    authorId: p.authorId,
    content: p.content,
    createdAt: new Date(Date.now() - idx * 47 * 60 * 1000).toISOString(),
  }));

  const rawComments = [
    { postId: 1, authorId: 2, content: "The loom metaphor never gets old. Compilers are just looms for logic." },
    { postId: 1, authorId: 5, content: "And yet we still hand-weave our migration scripts." },
    { postId: 2, authorId: 6, content: "The query plan was the story all along." },
    { postId: 3, authorId: 5, content: "Frame it. Put it on the onboarding slide deck." },
    { postId: 4, authorId: 4, content: "I have deployed on a Friday exactly once. Never again." },
    { postId: 4, authorId: 3, content: "Deploying is fine. Not testing is the crime." },
    { postId: 6, authorId: 6, content: "4px is the difference between friendly and toy-like." },
    { postId: 7, authorId: 1, content: "Please share the token sheet, mine is a mess." },
    { postId: 8, authorId: 3, content: "Measure first, then measure again, then optimize." },
    { postId: 9, authorId: 2, content: "Recursive CTEs are the closest thing SQL has to poetry." },
    { postId: 10, authorId: 4, content: "Bigger labels, fewer colors, more whitespace. That's the whole talk." },
    { postId: 12, authorId: 5, content: "My editor boots in 40ms and judges me in 0." },
  ];

  const comments: MemoryComment[] = rawComments.map((c, idx) => ({
    id: idx + 1,
    postId: c.postId,
    authorId: c.authorId,
    content: c.content,
    createdAt: new Date(Date.now() - (rawComments.length - idx) * 23 * 60 * 1000).toISOString(),
  }));

  const userHandleToId = new Map<string, number>([
    ["ada", 1],
    ["grace", 2],
    ["linus", 3],
    ["mira", 4],
    ["dev", 5],
    ["sana", 6],
  ]);

  const rawPostLikes: [number, string][] = [
    [1, "grace"], [1, "dev"], [1, "mira"], [1, "sana"],
    [2, "sana"], [2, "linus"],
    [3, "dev"], [3, "ada"], [3, "mira"], [3, "linus"],
    [4, "mira"], [4, "linus"], [4, "sana"],
    [5, "dev"], [5, "ada"], [5, "grace"],
    [6, "sana"], [6, "ada"],
    [7, "ada"], [7, "grace"], [7, "sana"],
    [8, "linus"], [8, "ada"], [8, "grace"],
    [9, "grace"], [9, "mira"], [9, "ada"],
    [10, "mira"], [10, "dev"],
    [11, "dev"], [11, "mira"],
    [12, "dev"], [12, "sana"],
  ];

  const postLikes = new Set<string>();
  for (const [pid, handle] of rawPostLikes) {
    const uid = userHandleToId.get(handle);
    if (uid) postLikes.add(`${pid}:${uid}`);
  }

  const rawCommentLikes: [number, string][] = [
    [1, "ada"], [1, "linus"], [2, "grace"], [3, "dev"], [4, "grace"], [4, "linus"],
    [5, "ada"], [6, "dev"], [7, "mira"], [8, "grace"], [9, "ada"], [9, "mira"],
    [10, "dev"], [11, "grace"], [12, "grace"], [12, "sana"],
  ];

  const commentLikes = new Set<string>();
  for (const [cid, handle] of rawCommentLikes) {
    const uid = userHandleToId.get(handle);
    if (uid) commentLikes.add(`${cid}:${uid}`);
  }

  const rawFollows: [string, string][] = [
    ["ada", "grace"], ["ada", "dev"], ["ada", "linus"],
    ["grace", "ada"], ["grace", "dev"], ["grace", "mira"],
    ["linus", "dev"], ["linus", "ada"],
    ["mira", "ada"], ["mira", "sana"], ["mira", "grace"],
    ["dev", "ada"], ["dev", "grace"], ["dev", "linus"], ["dev", "mira"],
    ["sana", "mira"], ["sana", "dev"],
  ];

  const follows = new Set<string>();
  for (const [follower, following] of rawFollows) {
    const fId = userHandleToId.get(follower);
    const tId = userHandleToId.get(following);
    if (fId && tId) follows.add(`${fId}:${tId}`);
  }

  const activities: MemoryActivity[] = [];
  for (const [pid, handle] of rawPostLikes) {
    const post = posts.find((p) => p.id === pid);
    const u = userHandleToId.get(handle);
    if (post && u && post.authorId !== u) {
      activities.push({
        type: "like",
        actorId: u,
        targetUserId: post.authorId,
        postId: pid,
        snippet: post.content.slice(0, 100),
        createdAt: post.createdAt,
      });
    }
  }

  for (const c of comments) {
    const post = posts.find((p) => p.id === c.postId);
    if (post && post.authorId !== c.authorId) {
      activities.push({
        type: "comment",
        actorId: c.authorId,
        targetUserId: post.authorId,
        postId: post.id,
        snippet: c.content.slice(0, 100),
        createdAt: c.createdAt,
      });
    }
  }

  for (const [follower, following] of rawFollows) {
    const fId = userHandleToId.get(follower);
    const tId = userHandleToId.get(following);
    if (fId && tId) {
      activities.push({
        type: "follow",
        actorId: fId,
        targetUserId: tId,
        postId: null,
        snippet: null,
        createdAt: new Date().toISOString(),
      });
    }
  }

  const store = {
    users,
    posts,
    comments,
    postLikes,
    commentLikes,
    follows,
    sessions: new Map<string, MemorySession>(),
    activities,
    nextUserId: users.length + 1,
    nextPostId: posts.length + 1,
    nextCommentId: comments.length + 1,
  };

  globalForStore.__pulseMemoryStore = store;
  return store;
}

const store = initStore();

function getPublicUser(user: MemoryUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarHue: user.avatarHue,
    bio: user.bio,
  };
}

export function getMemoryPosts(options: {
  viewerId: number | null;
  scope?: FeedScope;
  authorUsername?: string;
  likedByUsername?: string;
  limit?: number;
}): PostDTO[] {
  let list = [...store.posts];

  if (options.authorUsername) {
    const targetUser = store.users.find(
      (u) => u.username.toLowerCase() === options.authorUsername?.toLowerCase(),
    );
    if (!targetUser) return [];
    list = list.filter((p) => p.authorId === targetUser.id);
  }

  if (options.likedByUsername) {
    const targetUser = store.users.find(
      (u) => u.username.toLowerCase() === options.likedByUsername?.toLowerCase(),
    );
    if (!targetUser) return [];
    list = list.filter((p) => store.postLikes.has(`${p.id}:${targetUser.id}`));
  }

  if (options.scope === "following" && options.viewerId) {
    const viewerId = options.viewerId;
    list = list.filter(
      (p) => p.authorId === viewerId || store.follows.has(`${viewerId}:${p.authorId}`),
    );
  }

  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const limit = Math.min(Math.max(options.limit ?? 40, 1), 100);
  list = list.slice(0, limit);

  return list.map((p) => {
    const author = store.users.find((u) => u.id === p.authorId) || {
      id: p.authorId,
      username: "unknown",
      displayName: "Unknown",
      avatarHue: 200,
      bio: "",
    };

    let likeCount = 0;
    for (const key of store.postLikes) {
      if (key.startsWith(`${p.id}:`)) likeCount++;
    }

    let commentCount = 0;
    for (const c of store.comments) {
      if (c.postId === p.id) commentCount++;
    }

    const likedByViewer = options.viewerId
      ? store.postLikes.has(`${p.id}:${options.viewerId}`)
      : false;

    return {
      id: p.id,
      content: p.content,
      createdAt: p.createdAt,
      author: getPublicUser(author as MemoryUser),
      likeCount,
      commentCount,
      likedByViewer,
    };
  });
}

export function getMemoryPost(postId: number, viewerId: number | null): PostDTO | null {
  const p = store.posts.find((item) => item.id === postId);
  if (!p) return null;

  const author = store.users.find((u) => u.id === p.authorId) || {
    id: p.authorId,
    username: "unknown",
    displayName: "Unknown",
    avatarHue: 200,
    bio: "",
  };

  let likeCount = 0;
  for (const key of store.postLikes) {
    if (key.startsWith(`${p.id}:`)) likeCount++;
  }

  let commentCount = 0;
  for (const c of store.comments) {
    if (c.postId === p.id) commentCount++;
  }

  const likedByViewer = viewerId ? store.postLikes.has(`${p.id}:${viewerId}`) : false;

  return {
    id: p.id,
    content: p.content,
    createdAt: p.createdAt,
    author: getPublicUser(author as MemoryUser),
    likeCount,
    commentCount,
    likedByViewer,
  };
}

export function getMemoryComments(postId: number, viewerId: number | null): CommentDTO[] {
  const comments = store.comments.filter((c) => c.postId === postId);
  comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return comments.map((c) => {
    const author = store.users.find((u) => u.id === c.authorId) || {
      id: c.authorId,
      username: "unknown",
      displayName: "Unknown",
      avatarHue: 200,
      bio: "",
    };

    let likeCount = 0;
    for (const key of store.commentLikes) {
      if (key.startsWith(`${c.id}:`)) likeCount++;
    }

    const likedByViewer = viewerId ? store.commentLikes.has(`${c.id}:${viewerId}`) : false;

    return {
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      author: getPublicUser(author as MemoryUser),
      likeCount,
      likedByViewer,
    };
  });
}

export function getMemoryProfile(username: string, viewerId: number | null): ProfileDTO | null {
  const user = store.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (!user) return null;

  const viewer = viewerId ?? 0;
  let postCount = 0;
  for (const p of store.posts) {
    if (p.authorId === user.id) postCount++;
  }

  let followerCount = 0;
  for (const key of store.follows) {
    if (key.endsWith(`:${user.id}`)) followerCount++;
  }

  let followingCount = 0;
  for (const key of store.follows) {
    if (key.startsWith(`${user.id}:`)) followingCount++;
  }

  const isFollowing = viewer > 0 ? store.follows.has(`${viewer}:${user.id}`) : false;
  const followsViewer = viewer > 0 ? store.follows.has(`${user.id}:${viewer}`) : false;

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarHue: user.avatarHue,
    bio: user.bio,
    createdAt: user.createdAt,
    postCount,
    followerCount,
    followingCount,
    isFollowing,
    followsViewer,
    isSelf: viewer === user.id,
  };
}

export function getMemoryUsers(options: {
  viewerId: number | null;
  search?: string;
  limit?: number;
}): UserCardDTO[] {
  const viewer = options.viewerId ?? 0;
  let list = store.users.filter((u) => u.id !== viewer);

  if (options.search?.trim()) {
    const term = options.search.trim().toLowerCase();
    list = list.filter(
      (u) => u.username.toLowerCase().includes(term) || u.displayName.toLowerCase().includes(term),
    );
  }

  const scored = list.map((u) => {
    let followerCount = 0;
    for (const key of store.follows) {
      if (key.endsWith(`:${u.id}`)) followerCount++;
    }
    let postCount = 0;
    for (const p of store.posts) {
      if (p.authorId === u.id) postCount++;
    }
    const isFollowing = viewer > 0 ? store.follows.has(`${viewer}:${u.id}`) : false;

    return {
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      avatarHue: u.avatarHue,
      bio: u.bio,
      followerCount,
      postCount,
      isFollowing,
    };
  });

  scored.sort((a, b) => b.followerCount - a.followerCount);
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
  return scored.slice(0, limit);
}

export function getMemoryConnections(
  username: string,
  kind: "followers" | "following",
  viewerId: number | null,
): ConnectionDTO[] {
  const owner = store.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (!owner) return [];

  const viewer = viewerId ?? 0;
  const result: ConnectionDTO[] = [];

  if (kind === "followers") {
    for (const key of store.follows) {
      const [fId, targetId] = key.split(":").map(Number);
      if (targetId === owner.id) {
        const follower = store.users.find((u) => u.id === fId);
        if (follower) {
          result.push({
            id: follower.id,
            username: follower.username,
            displayName: follower.displayName,
            avatarHue: follower.avatarHue,
            bio: follower.bio,
            isFollowing: viewer > 0 ? store.follows.has(`${viewer}:${follower.id}`) : false,
          });
        }
      }
    }
  } else {
    for (const key of store.follows) {
      const [fId, targetId] = key.split(":").map(Number);
      if (fId === owner.id) {
        const following = store.users.find((u) => u.id === targetId);
        if (following) {
          result.push({
            id: following.id,
            username: following.username,
            displayName: following.displayName,
            avatarHue: following.avatarHue,
            bio: following.bio,
            isFollowing: viewer > 0 ? store.follows.has(`${viewer}:${following.id}`) : false,
          });
        }
      }
    }
  }

  return result;
}

export function getMemoryActivity(viewerId: number): ActivityDTO[] {
  const list = store.activities.filter((a) => a.targetUserId === viewerId && a.actorId !== viewerId);
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return list.slice(0, 40).map((a) => {
    const actor = store.users.find((u) => u.id === a.actorId) || {
      id: a.actorId,
      username: "unknown",
      displayName: "Unknown",
      avatarHue: 200,
    };
    return {
      type: a.type,
      actor: getPublicUser(actor as MemoryUser),
      postId: a.postId,
      snippet: a.snippet,
      createdAt: a.createdAt,
    };
  });
}

export function getMemoryStats() {
  return {
    users: store.users.length,
    posts: store.posts.length,
    comments: store.comments.length,
    likes: store.postLikes.size + store.commentLikes.size,
    follows: store.follows.size,
  };
}

export function findMemoryUserById(id: number): MemoryUser | null {
  return store.users.find((u) => u.id === id) ?? null;
}

export function findMemoryUserByIdentifier(identifier: string): MemoryUser | null {
  const idLower = identifier.trim().toLowerCase();
  return (
    store.users.find(
      (u) => u.username.toLowerCase() === idLower || u.email.toLowerCase() === idLower,
    ) ?? null
  );
}

export function createMemoryUser(data: {
  username: string;
  displayName: string;
  email: string;
  passwordHash: string;
  bio?: string;
  avatarHue?: number;
}): MemoryUser {
  const user: MemoryUser = {
    id: store.nextUserId++,
    username: data.username,
    displayName: data.displayName,
    email: data.email,
    passwordHash: data.passwordHash,
    bio: data.bio ?? "",
    avatarHue: data.avatarHue ?? 220,
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);
  return user;
}

export function updateMemoryUser(
  username: string,
  data: { displayName?: string; bio?: string; avatarHue?: number },
): MemoryUser | null {
  const user = store.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (!user) return null;
  if (data.displayName !== undefined) user.displayName = data.displayName;
  if (data.bio !== undefined) user.bio = data.bio;
  if (data.avatarHue !== undefined) user.avatarHue = data.avatarHue;
  return user;
}

export function createMemorySession(tokenHash: string, userId: number, expiresAt: Date) {
  store.sessions.set(tokenHash, {
    tokenHash,
    userId,
    expiresAt: expiresAt.toISOString(),
  });
}

export function deleteMemorySession(tokenHash: string) {
  store.sessions.delete(tokenHash);
}

export function getMemorySessionUser(tokenHash: string): MemoryUser | null {
  const session = store.sessions.get(tokenHash);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    store.sessions.delete(tokenHash);
    return null;
  }
  return findMemoryUserById(session.userId);
}

export function createMemoryPost(authorId: number, content: string): PostDTO {
  const post: MemoryPost = {
    id: store.nextPostId++,
    authorId,
    content,
    createdAt: new Date().toISOString(),
  };
  store.posts.unshift(post);
  return getMemoryPost(post.id, authorId)!;
}

export function deleteMemoryPost(postId: number, authorId: number): boolean {
  const idx = store.posts.findIndex((p) => p.id === postId && p.authorId === authorId);
  if (idx === -1) return false;
  store.posts.splice(idx, 1);
  return true;
}

export function createMemoryComment(postId: number, authorId: number, content: string): CommentDTO {
  const comment: MemoryComment = {
    id: store.nextCommentId++,
    postId,
    authorId,
    content,
    createdAt: new Date().toISOString(),
  };
  store.comments.push(comment);

  const post = store.posts.find((p) => p.id === postId);
  if (post && post.authorId !== authorId) {
    store.activities.unshift({
      type: "comment",
      actorId: authorId,
      targetUserId: post.authorId,
      postId,
      snippet: content.slice(0, 100),
      createdAt: new Date().toISOString(),
    });
  }

  const author = store.users.find((u) => u.id === authorId)!;
  return {
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    author: getPublicUser(author),
    likeCount: 0,
    likedByViewer: false,
  };
}

export function deleteMemoryComment(commentId: number, authorId: number): boolean {
  const idx = store.comments.findIndex((c) => c.id === commentId && c.authorId === authorId);
  if (idx === -1) return false;
  store.comments.splice(idx, 1);
  return true;
}

export function toggleMemoryPostLike(
  postId: number,
  userId: number,
): { liked: boolean; likeCount: number } {
  const key = `${postId}:${userId}`;
  let liked: boolean;
  if (store.postLikes.has(key)) {
    store.postLikes.delete(key);
    liked = false;
  } else {
    store.postLikes.add(key);
    liked = true;

    const post = store.posts.find((p) => p.id === postId);
    if (post && post.authorId !== userId) {
      store.activities.unshift({
        type: "like",
        actorId: userId,
        targetUserId: post.authorId,
        postId,
        snippet: post.content.slice(0, 100),
        createdAt: new Date().toISOString(),
      });
    }
  }

  let likeCount = 0;
  for (const k of store.postLikes) {
    if (k.startsWith(`${postId}:`)) likeCount++;
  }
  return { liked, likeCount };
}

export function toggleMemoryCommentLike(
  commentId: number,
  userId: number,
): { liked: boolean; likeCount: number } {
  const key = `${commentId}:${userId}`;
  let liked: boolean;
  if (store.commentLikes.has(key)) {
    store.commentLikes.delete(key);
    liked = false;
  } else {
    store.commentLikes.add(key);
    liked = true;
  }

  let likeCount = 0;
  for (const k of store.commentLikes) {
    if (k.startsWith(`${commentId}:`)) likeCount++;
  }
  return { liked, likeCount };
}

export function toggleMemoryFollow(
  followerId: number,
  followingId: number,
): { following: boolean; followerCount: number } {
  const key = `${followerId}:${followingId}`;
  let following: boolean;
  if (store.follows.has(key)) {
    store.follows.delete(key);
    following = false;
  } else {
    store.follows.add(key);
    following = true;

    store.activities.unshift({
      type: "follow",
      actorId: followerId,
      targetUserId: followingId,
      postId: null,
      snippet: null,
      createdAt: new Date().toISOString(),
    });
  }

  let followerCount = 0;
  for (const k of store.follows) {
    if (k.endsWith(`:${followingId}`)) followerCount++;
  }
  return { following, followerCount };
}
