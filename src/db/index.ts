import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsSchemaInitialized?: boolean;
};

// Chainable mock proxy for Drizzle ORM when database is offline or not configured
function createMockProxy(): any {
  const handler: ProxyHandler<any> = {
    get(target, prop) {
      if (prop === "then") {
        return (resolve: (val: any) => void) => {
          const res: any = [];
          res.rows = [];
          resolve(res);
        };
      }
      if (prop === "catch" || prop === "finally") {
        return undefined;
      }
      return (..._args: any[]) => new Proxy(() => {}, handler);
    },
    apply() {
      return new Proxy(() => {}, handler);
    },
  };
  return new Proxy(() => {}, handler);
}

let poolInstance: any;
let dbInstance: any;
let connected = false;

if (databaseUrl) {
  try {
    poolInstance =
      globalForDb.__arenaNextJsPostgresqlPool ??
      new Pool({
        connectionString: databaseUrl,
        connectionTimeoutMillis: 15000,
        idleTimeoutMillis: 30000,
        max: process.env.NODE_ENV === "production" ? 5 : 10,
        ssl:
          databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")
            ? false
            : { rejectUnauthorized: false },
      });

    globalForDb.__arenaNextJsPostgresqlPool = poolInstance;
    dbInstance = drizzle(poolInstance);
    connected = true;
  } catch (err) {
    console.warn("[AI Studio] Database initialization failed — using mock:", err);
    poolInstance = {
      query: async () => ({ rows: [] }),
      connect: async () => ({ query: async () => ({ rows: [] }), release: () => {} }),
      end: async () => {},
    };
    dbInstance = createMockProxy();
    connected = false;
  }
} else {
  console.warn("[AI Studio] DATABASE_URL not set — using in-memory mock store");
  poolInstance = {
    query: async () => ({ rows: [] }),
    connect: async () => ({ query: async () => ({ rows: [] }), release: () => {} }),
    end: async () => {},
  };
  dbInstance = createMockProxy();
  connected = false;
}

export const pool = poolInstance;
export const db = dbInstance;

export function isDbConnected(): boolean {
  return connected && Boolean(process.env.DATABASE_URL);
}

/**
 * Ensures that the PostgreSQL schema exists in the connected database.
 * Runs idempotently once per server process.
 */
export async function ensureSchemaOnce() {
  if (!isDbConnected() || globalForDb.__arenaNextJsSchemaInitialized) return;
  globalForDb.__arenaNextJsSchemaInitialized = true;
  try {
    await poolInstance.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        display_name TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        bio TEXT NOT NULL DEFAULT '',
        avatar_hue INTEGER NOT NULL DEFAULT 220,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username);
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email);

      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS posts_author_idx ON posts (author_id);
      CREATE INDEX IF NOT EXISTS posts_created_idx ON posts (created_at);

      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS comments_post_idx ON comments (post_id);

      CREATE TABLE IF NOT EXISTS post_likes (
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        PRIMARY KEY (post_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS post_likes_user_idx ON post_likes (user_id);

      CREATE TABLE IF NOT EXISTS comment_likes (
        comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        PRIMARY KEY (comment_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS comment_likes_user_idx ON comment_likes (user_id);

      CREATE TABLE IF NOT EXISTS follows (
        follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        PRIMARY KEY (follower_id, following_id)
      );
      CREATE INDEX IF NOT EXISTS follows_following_idx ON follows (following_id);
    `);
  } catch (err) {
    console.warn("[Pulse] Schema ensure warning:", err);
  }
}
