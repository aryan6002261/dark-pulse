import { SQL, sql } from "drizzle-orm";
import { db, ensureSchemaOnce, isDbConnected } from "@/db";
import {
  getMemoryActivity,
  getMemoryComments,
  getMemoryConnections,
  getMemoryPost,
  getMemoryPosts,
  getMemoryProfile,
  getMemoryStats,
  getMemoryUsers,
} from "@/lib/memory-store";
import type {
  ActivityDTO,
  CommentDTO,
  ConnectionDTO,
  FeedScope,
  PostDTO,
  ProfileDTO,
  UserCardDTO,
} from "@/lib/types";

/**
 * Executes a Drizzle SQL template and always returns a plain array of rows.
 */
async function rows<T>(query: SQL): Promise<T[]> {
  await ensureSchemaOnce();
  const result = (await db.execute(query)) as unknown;
  if (Array.isArray(result)) return result as T[];
  const maybe = result as { rows?: unknown[] };
  return (maybe.rows ?? []) as T[];
}

/* --------------------------------- posts -------------------------------- */

type PostSqlRow = {
  id: number;
  content: string;
  createdAt: string | Date;
  authorId: number;
  username: string;
  displayName: string;
  avatarHue: number;
  likeCount: number;
  commentCount: number;
  likedByViewer: boolean;
};

function mapPost(row: PostSqlRow): PostDTO {
  return {
    id: Number(row.id),
    content: row.content,
    createdAt: new Date(row.createdAt).toISOString(),
    author: {
      id: Number(row.authorId),
      username: row.username,
      displayName: row.displayName,
      avatarHue: Number(row.avatarHue),
    },
    likeCount: Number(row.likeCount),
    commentCount: Number(row.commentCount),
    likedByViewer: Boolean(row.likedByViewer),
  };
}

function postSelect(viewerId: number | null): SQL {
  const viewer = viewerId ?? 0;
  return sql`
    select p.id,
           p.content,
           p.created_at as "createdAt",
           u.id as "authorId",
           u.username,
           u.display_name as "displayName",
           u.avatar_hue as "avatarHue",
           (select count(*)::int from post_likes pl where pl.post_id = p.id) as "likeCount",
           (select count(*)::int from comments c where c.post_id = p.id) as "commentCount",
           exists(
             select 1 from post_likes pl
             where pl.post_id = p.id and pl.user_id = ${viewer}
           ) as "likedByViewer"
  `;
}

function postFrom(): SQL {
  return sql`
    from posts p
    join users u on u.id = p.author_id
  `;
}

export async function listPosts(options: {
  viewerId: number | null;
  scope?: FeedScope;
  authorUsername?: string;
  likedByUsername?: string;
  limit?: number;
}): Promise<PostDTO[]> {
  if (!isDbConnected()) {
    return getMemoryPosts(options);
  }

  try {
    const conditions: SQL[] = [sql`true`];

    if (options.authorUsername) {
      conditions.push(sql`u.username = ${options.authorUsername}`);
    }
    if (options.likedByUsername) {
      conditions.push(sql`
        p.id in (
          select pl.post_id
          from post_likes pl
          join users lu on lu.id = pl.user_id
          where lu.username = ${options.likedByUsername}
        )
      `);
    }
    if (options.scope === "following" && options.viewerId) {
      conditions.push(sql`
        (p.author_id = ${options.viewerId}
         or p.author_id in (select following_id from follows where follower_id = ${options.viewerId}))
      `);
    }

    const limit = Math.min(Math.max(options.limit ?? 40, 1), 100);
    const query = sql`
      ${postSelect(options.viewerId)}
      ${postFrom()}
      where ${sql.join(conditions, sql` and `)}
      order by p.created_at desc
      limit ${limit}
    `;
    return (await rows<PostSqlRow>(query)).map(mapPost);
  } catch (err) {
    console.warn("[Pulse] Database query failed in listPosts, using memory fallback:", err);
    return getMemoryPosts(options);
  }
}

export async function getPost(postId: number, viewerId: number | null): Promise<PostDTO | null> {
  if (!isDbConnected()) {
    return getMemoryPost(postId, viewerId);
  }

  try {
    const query = sql`
      ${postSelect(viewerId)}
      ${postFrom()}
      where p.id = ${postId}
      limit 1
    `;
    const data = await rows<PostSqlRow>(query);
    return data[0] ? mapPost(data[0]) : null;
  } catch (err) {
    console.warn("[Pulse] Database query failed in getPost, using memory fallback:", err);
    return getMemoryPost(postId, viewerId);
  }
}

/* ------------------------------- comments ------------------------------- */

type CommentSqlRow = {
  id: number;
  content: string;
  createdAt: string | Date;
  authorId: number;
  username: string;
  displayName: string;
  avatarHue: number;
  likeCount: number;
  likedByViewer: boolean;
};

export async function listComments(postId: number, viewerId: number | null): Promise<CommentDTO[]> {
  if (!isDbConnected()) {
    return getMemoryComments(postId, viewerId);
  }

  try {
    const viewer = viewerId ?? 0;
    const query = sql`
      select c.id,
             c.content,
             c.created_at as "createdAt",
             u.id as "authorId",
             u.username,
             u.display_name as "displayName",
             u.avatar_hue as "avatarHue",
             (select count(*)::int from comment_likes cl where cl.comment_id = c.id) as "likeCount",
             exists(
               select 1 from comment_likes cl
               where cl.comment_id = c.id and cl.user_id = ${viewer}
             ) as "likedByViewer"
      from comments c
      join users u on u.id = c.author_id
      where c.post_id = ${postId}
      order by c.created_at asc
      limit 200
    `;
    return (await rows<CommentSqlRow>(query)).map((row) => ({
      id: Number(row.id),
      content: row.content,
      createdAt: new Date(row.createdAt).toISOString(),
      author: {
        id: Number(row.authorId),
        username: row.username,
        displayName: row.displayName,
        avatarHue: Number(row.avatarHue),
      },
      likeCount: Number(row.likeCount),
      likedByViewer: Boolean(row.likedByViewer),
    }));
  } catch (err) {
    console.warn("[Pulse] Database query failed in listComments, using memory fallback:", err);
    return getMemoryComments(postId, viewerId);
  }
}

/* -------------------------------- profile ------------------------------- */

export async function getProfile(
  username: string,
  viewerId: number | null,
): Promise<ProfileDTO | null> {
  if (!isDbConnected()) {
    return getMemoryProfile(username, viewerId);
  }

  try {
    const viewer = viewerId ?? 0;
    const query = sql`
      select u.id,
             u.username,
             u.display_name as "displayName",
             u.avatar_hue as "avatarHue",
             u.bio,
             u.created_at as "createdAt",
             (select count(*)::int from posts p where p.author_id = u.id) as "postCount",
             (select count(*)::int from follows f where f.following_id = u.id) as "followerCount",
             (select count(*)::int from follows f where f.follower_id = u.id) as "followingCount",
             exists(
               select 1 from follows f
               where f.follower_id = ${viewer} and f.following_id = u.id
             ) as "isFollowing",
             exists(
               select 1 from follows f
               where f.follower_id = u.id and f.following_id = ${viewer}
             ) as "followsViewer",
             (u.id = ${viewer}) as "isSelf"
      from users u
      where u.username = ${username}
      limit 1
    `;
    const data = await rows<{
      id: number;
      username: string;
      displayName: string;
      avatarHue: number;
      bio: string;
      createdAt: string | Date;
      postCount: number;
      followerCount: number;
      followingCount: number;
      isFollowing: boolean;
      followsViewer: boolean;
      isSelf: boolean;
    }>(query);

    const row = data[0];
    if (!row) return null;
    return {
      id: Number(row.id),
      username: row.username,
      displayName: row.displayName,
      avatarHue: Number(row.avatarHue),
      bio: row.bio ?? "",
      createdAt: new Date(row.createdAt).toISOString(),
      postCount: Number(row.postCount),
      followerCount: Number(row.followerCount),
      followingCount: Number(row.followingCount),
      isFollowing: Boolean(row.isFollowing),
      followsViewer: Boolean(row.followsViewer),
      isSelf: Boolean(row.isSelf),
    };
  } catch (err) {
    console.warn("[Pulse] Database query failed in getProfile, using memory fallback:", err);
    return getMemoryProfile(username, viewerId);
  }
}

/* --------------------------------- users -------------------------------- */

export async function listUsers(options: {
  viewerId: number | null;
  search?: string;
  limit?: number;
}): Promise<UserCardDTO[]> {
  if (!isDbConnected()) {
    return getMemoryUsers(options);
  }

  try {
    const viewer = options.viewerId ?? 0;
    const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
    const term = `%${(options.search ?? "").trim().toLowerCase()}%`;
    const searchClause = (options.search ?? "").trim()
      ? sql`and (lower(u.username) like ${term} or lower(u.display_name) like ${term})`
      : sql``;

    const query = sql`
      select u.id,
             u.username,
             u.display_name as "displayName",
             u.avatar_hue as "avatarHue",
             u.bio,
             (select count(*)::int from follows f where f.following_id = u.id) as "followerCount",
             (select count(*)::int from posts p where p.author_id = u.id) as "postCount",
             exists(
               select 1 from follows f
               where f.follower_id = ${viewer} and f.following_id = u.id
             ) as "isFollowing"
      from users u
      where u.id <> ${viewer}
        ${searchClause}
      order by "followerCount" desc, u.id asc
      limit ${limit}
    `;
    const data = await rows<{
      id: number;
      username: string;
      displayName: string;
      avatarHue: number;
      bio: string;
      followerCount: number;
      postCount: number;
      isFollowing: boolean;
    }>(query);
    return data.map((row) => ({
      id: Number(row.id),
      username: row.username,
      displayName: row.displayName,
      avatarHue: Number(row.avatarHue),
      bio: row.bio ?? "",
      followerCount: Number(row.followerCount),
      postCount: Number(row.postCount),
      isFollowing: Boolean(row.isFollowing),
    }));
  } catch (err) {
    console.warn("[Pulse] Database query failed in listUsers, using memory fallback:", err);
    return getMemoryUsers(options);
  }
}

export async function listConnections(
  username: string,
  kind: "followers" | "following",
  viewerId: number | null,
): Promise<ConnectionDTO[]> {
  if (!isDbConnected()) {
    return getMemoryConnections(username, kind, viewerId);
  }

  try {
    const viewer = viewerId ?? 0;
    const query =
      kind === "followers"
        ? sql`
            select u.id, u.username, u.display_name as "displayName", u.avatar_hue as "avatarHue", u.bio,
                   exists(select 1 from follows f2 where f2.follower_id = ${viewer} and f2.following_id = u.id) as "isFollowing"
            from follows fl
            join users owner on owner.id = fl.following_id
            join users u on u.id = fl.follower_id
            where owner.username = ${username}
            order by fl.created_at desc
            limit 100
          `
        : sql`
            select u.id, u.username, u.display_name as "displayName", u.avatar_hue as "avatarHue", u.bio,
                   exists(select 1 from follows f2 where f2.follower_id = ${viewer} and f2.following_id = u.id) as "isFollowing"
            from follows fl
            join users owner on owner.id = fl.follower_id
            join users u on u.id = fl.following_id
            where owner.username = ${username}
            order by fl.created_at desc
            limit 100
          `;

    const data = await rows<{
      id: number;
      username: string;
      displayName: string;
      avatarHue: number;
      bio: string;
      isFollowing: boolean;
    }>(query);
    return data.map((row) => ({
      id: Number(row.id),
      username: row.username,
      displayName: row.displayName,
      avatarHue: Number(row.avatarHue),
      bio: row.bio ?? "",
      isFollowing: Boolean(row.isFollowing),
    }));
  } catch (err) {
    console.warn("[Pulse] Database query failed in listConnections, using memory fallback:", err);
    return getMemoryConnections(username, kind, viewerId);
  }
}

/* ------------------------------- activity ------------------------------- */

export async function listActivity(viewerId: number): Promise<ActivityDTO[]> {
  if (!isDbConnected()) {
    return getMemoryActivity(viewerId);
  }

  try {
    const query = sql`
      select 'like' as type,
             a.id as "actorId", a.username, a.display_name as "displayName", a.avatar_hue as "avatarHue",
             p.id as "postId", left(p.content, 110) as "snippet", l.created_at as "createdAt"
      from post_likes l
      join users a on a.id = l.user_id
      join posts p on p.id = l.post_id
      where p.author_id = ${viewerId} and l.user_id <> ${viewerId}
      union all
      select 'comment' as type,
             a.id as "actorId", a.username, a.display_name as "displayName", a.avatar_hue as "avatarHue",
             p.id as "postId", left(c.content, 110) as "snippet", c.created_at as "createdAt"
      from comments c
      join users a on a.id = c.author_id
      join posts p on p.id = c.post_id
      where p.author_id = ${viewerId} and c.author_id <> ${viewerId}
      union all
      select 'follow' as type,
             a.id as "actorId", a.username, a.display_name as "displayName", a.avatar_hue as "avatarHue",
             null::int as "postId", null::text as "snippet", f.created_at as "createdAt"
      from follows f
      join users a on a.id = f.follower_id
      where f.following_id = ${viewerId}
      order by "createdAt" desc
      limit 40
    `;
    const data = await rows<{
      type: "like" | "comment" | "follow";
      actorId: number;
      username: string;
      displayName: string;
      avatarHue: number;
      postId: number | null;
      snippet: string | null;
      createdAt: string | Date;
    }>(query);

    return data.map((row) => ({
      type: row.type,
      actor: {
        id: Number(row.actorId),
        username: row.username,
        displayName: row.displayName,
        avatarHue: Number(row.avatarHue),
      },
      postId: row.postId === null ? null : Number(row.postId),
      snippet: row.snippet,
      createdAt: new Date(row.createdAt).toISOString(),
    }));
  } catch (err) {
    console.warn("[Pulse] Database query failed in listActivity, using memory fallback:", err);
    return getMemoryActivity(viewerId);
  }
}

/* -------------------------------- network ------------------------------- */

export async function countStats(): Promise<{
  users: number;
  posts: number;
  comments: number;
  likes: number;
  follows: number;
}> {
  if (!isDbConnected()) {
    return getMemoryStats();
  }

  try {
    const query = sql`
      select
        (select count(*)::int from users) as users,
        (select count(*)::int from posts) as posts,
        (select count(*)::int from comments) as comments,
        (select count(*)::int from post_likes) + (select count(*)::int from comment_likes) as likes,
        (select count(*)::int from follows) as follows
    `;
    const data = await rows<{
      users: number;
      posts: number;
      comments: number;
      likes: number;
      follows: number;
    }>(query);
    const row = data[0];
    return {
      users: Number(row?.users ?? 0),
      posts: Number(row?.posts ?? 0),
      comments: Number(row?.comments ?? 0),
      likes: Number(row?.likes ?? 0),
      follows: Number(row?.follows ?? 0),
    };
  } catch (err) {
    console.warn("[Pulse] Database query failed in countStats, using memory fallback:", err);
    return getMemoryStats();
  }
}
