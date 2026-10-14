/**
 * Idempotent seed script for the Pulse mini social network.
 *
 * Usage: node scripts/seed.mjs
 * Requires DATABASE_URL (read from the environment or the local .env file).
 */
import { readFileSync } from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";
import pg from "pg";

function loadEnv() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
    const line = raw.split("\n").find((entry) => entry.trim().startsWith("DATABASE_URL="));
    if (line) return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
  } catch {
    /* ignore */
  }
  return "postgresql://postgres:postgres@127.0.0.1:5432/app_db";
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
}

const PASSWORD = "password123";

const people = [
  {
    username: "ada",
    displayName: "Ada Lovelace",
    email: "ada@pulse.dev",
    avatarHue: 265,
    bio: "Countess of computing. Writing notes on the Analytical Engine and occasionally on life.",
  },
  {
    username: "grace",
    displayName: "Grace Hopper",
    email: "grace@pulse.dev",
    avatarHue: 190,
    bio: "Rear admiral, compiler pioneer, and devoted nemesis of the nanosecond.",
  },
  {
    username: "linus",
    displayName: "Linus Torvalds",
    email: "linus@pulse.dev",
    avatarHue: 20,
    bio: "Just here to talk about trees, kernels, and toolchains.",
  },
  {
    username: "mira",
    displayName: "Mira Chen",
    email: "mira@pulse.dev",
    avatarHue: 320,
    bio: "Product designer. Obsessed with type scales, dark modes and good error messages.",
  },
  {
    username: "dev",
    displayName: "Dev Patel",
    email: "dev@pulse.dev",
    avatarHue: 95,
    bio: "Backend engineer. Postgres apologist. I read the query plans for fun.",
  },
  {
    username: "sana",
    displayName: "Sana Okafor",
    email: "sana@pulse.dev",
    avatarHue: 145,
    bio: "Data storyteller. Charts first, opinions later.",
  },
];

const posts = [
  { author: "ada", content: "The Analytical Engine weaves algebraic patterns just as the Jacquard loom weaves flowers and leaves. #computing #history" },
  { author: "ada", content: "Spent the morning debugging a query plan instead of the query. Postgres was right, I was wrong. #postgres" },
  { author: "grace", content: "It's easier to ask forgiveness than it is to get permission. Still true, especially in code review. #wisdom" },
  { author: "grace", content: "A ship in port is safe, but that's not what ships are built for. Deploy on Friday, I dare you. ⚓" },
  { author: "linus", content: "Talk is cheap. Show me the code. — still the best commit message I never wrote. #opensource" },
  { author: "mira", content: "Reminder that a 4px change in border radius can ruin an entire afternoon. Design is mostly empathy plus arithmetic. #ui" },
  { author: "mira", content: "Dark mode is not just inverting colors, it's re-tuning every single accent. Here is my token sheet if you want it. #design" },
  { author: "dev", content: "Indexes are not free, but neither is your time. Measure before you optimize anything. #postgres #backend" },
  { author: "dev", content: "Wrote a social graph in SQL today. Recursive CTEs are criminally underrated. #sql" },
  { author: "sana", content: "Every dashboard is a story someone was too impatient to tell out loud. Make the axis labels bigger, please. #data" },
  { author: "sana", content: "Hot take: a table with good sorting beats a fancy chart nine times out of ten. #dataviz" },
  { author: "linus", content: "Someone asked why my editor looks like 1995. Because 1995 booted faster than your electron app. #unix" },
];

const comments = [
  { post: 1, author: "grace", content: "The loom metaphor never gets old. Compilers are just looms for logic." },
  { post: 1, author: "dev", content: "And yet we still hand-weave our migration scripts." },
  { post: 2, author: "sana", content: "The query plan was the story all along." },
  { post: 3, author: "dev", content: "Frame it. Put it on the onboarding slide deck." },
  { post: 4, author: "mira", content: "I have deployed on a Friday exactly once. Never again." },
  { post: 4, author: "linus", content: "Deploying is fine. Not testing is the crime." },
  { post: 6, author: "sana", content: "4px is the difference between friendly and toy-like." },
  { post: 7, author: "ada", content: "Please share the token sheet, mine is a mess." },
  { post: 8, author: "linus", content: "Measure first, then measure again, then optimize." },
  { post: 9, author: "grace", content: "Recursive CTEs are the closest thing SQL has to poetry." },
  { post: 10, author: "mira", content: "Bigger labels, fewer colors, more whitespace. That's the whole talk." },
  { post: 12, author: "dev", content: "My editor boots in 40ms and judges me in 0." },
];

const follows = [
  ["ada", "grace"], ["ada", "dev"], ["ada", "linus"],
  ["grace", "ada"], ["grace", "dev"], ["grace", "mira"],
  ["linus", "dev"], ["linus", "ada"],
  ["mira", "ada"], ["mira", "sana"], ["mira", "grace"],
  ["dev", "ada"], ["dev", "grace"], ["dev", "linus"], ["dev", "mira"],
  ["sana", "mira"], ["sana", "dev"],
];

const postLikes = [
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

const commentLikes = [
  [1, "ada"], [1, "linus"], [2, "grace"], [3, "dev"], [4, "grace"], [4, "linus"],
  [5, "ada"], [6, "dev"], [7, "mira"], [8, "grace"], [9, "ada"], [9, "mira"],
  [10, "dev"], [11, "grace"], [12, "grace"], [12, "sana"],
];

async function main() {
  const client = new pg.Client({ connectionString: loadEnv() });
  await client.connect();

  try {
    await client.query("begin");

    for (const person of people) {
      await client.query(
        `insert into users (username, display_name, email, password_hash, bio, avatar_hue)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (username) do update
           set display_name = excluded.display_name,
               email = excluded.email,
               bio = excluded.bio,
               avatar_hue = excluded.avatar_hue`,
        [
          person.username,
          person.displayName,
          person.email,
          hashPassword(PASSWORD),
          person.bio,
          person.avatarHue,
        ],
      );
    }

    const existing = await client.query("select count(*)::int as count from posts");
    if (existing.rows[0].count > 0) {
      await client.query("commit");
      console.log("Seed skipped: posts already exist. Users refreshed instead.");
      return;
    }

    const idByHandle = new Map();
    const userRows = await client.query("select id, username from users");
    for (const row of userRows.rows) idByHandle.set(row.username, row.id);

    const postIds = [];
    let offset = 0;
    for (const post of posts) {
      const created = new Date(Date.now() - offset * 47 * 60 * 1000).toISOString();
      offset += 1;
      const result = await client.query(
        "insert into posts (author_id, content, created_at) values ($1, $2, $3) returning id",
        [idByHandle.get(post.author), post.content, created],
      );
      postIds.push(result.rows[0].id);
    }

    const commentIds = [];
    let commentOffset = 0;
    for (const comment of comments) {
      const created = new Date(Date.now() - (comments.length - commentOffset) * 23 * 60 * 1000);
      commentOffset += 1;
      const result = await client.query(
        "insert into comments (post_id, author_id, content, created_at) values ($1, $2, $3, $4) returning id",
        [postIds[comment.post - 1], idByHandle.get(comment.author), comment.content, created],
      );
      commentIds.push(result.rows[0].id);
    }

    for (const [postIndex, handle] of postLikes) {
      await client.query(
        "insert into post_likes (post_id, user_id) values ($1, $2) on conflict do nothing",
        [postIds[postIndex - 1], idByHandle.get(handle)],
      );
    }

    for (const [commentIndex, handle] of commentLikes) {
      await client.query(
        "insert into comment_likes (comment_id, user_id) values ($1, $2) on conflict do nothing",
        [commentIds[commentIndex - 1], idByHandle.get(handle)],
      );
    }

    for (const [follower, following] of follows) {
      await client.query(
        "insert into follows (follower_id, following_id) values ($1, $2) on conflict do nothing",
        [idByHandle.get(follower), idByHandle.get(following)],
      );
    }

    await client.query("commit");
    console.log(
      `Seeded ${people.length} users, ${posts.length} posts, ${comments.length} comments, ` +
        `${postLikes.length} post likes, ${commentLikes.length} comment likes, ${follows.length} follows.`,
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
