"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, ErrorText, api, useSession } from "@/components/social";

type Mode = "signin" | "signup";

export function AuthForm({ initialMode = "signin" }: { initialMode?: Mode }) {
  const router = useRouter();
  const { setViewer } = useSession();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const payload =
        mode === "signup"
          ? { username, displayName, email, password }
          : { identifier, password };
      const data = await api<{ user: NonNullable<ReturnType<typeof Object>> }>(
        mode === "signup" ? "/api/auth/signup" : "/api/auth/login",
        { json: payload },
      );
      const user = data.user as {
        id: number;
        username: string;
        displayName: string;
        avatarHue: number;
        email?: string;
      };
      setViewer({ ...user, bio: "" });
      router.push(`/u/${user.username}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign you in.");
    } finally {
      setBusy(false);
    }
  }

  async function demoLogin(handle: string) {
    setBusy(true);
    setError("");
    try {
      const data = await api<{ user: { id: number; username: string; displayName: string; avatarHue: number } }>(
        "/api/auth/login",
        { json: { identifier: handle, password: "password123" } },
      );
      setViewer({ ...data.user, bio: "" });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} (demo accounts are seeded with password "password123")`
          : "Demo login failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6 md:grid-cols-2">
      <section className="card p-6 sm:p-8">
        <div className="mb-5 flex gap-1 rounded-full border border-white/10 bg-white/5 p-1">
          {(["signin", "signup"] as Mode[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setMode(option);
                setError("");
              }}
              className={`flex-1 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                mode === option
                  ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-[#0b0620]"
                  : "text-violet-100/70 hover:text-white"
              }`}
            >
              {option === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signin" ? (
            <div>
              <label htmlFor="identifier" className="mb-1 block text-xs font-semibold text-violet-200/70">
                Username or email
              </label>
              <input
                id="identifier"
                className="field"
                autoComplete="username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="ada or ada@pulse.dev"
              />
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="username" className="mb-1 block text-xs font-semibold text-violet-200/70">
                  Username
                </label>
                <input
                  id="username"
                  className="field"
                  value={username}
                  onChange={(event) => setUsername(event.target.value.toLowerCase())}
                  placeholder="lowercase, 3-20 chars"
                />
              </div>
              <div>
                <label htmlFor="displayName" className="mb-1 block text-xs font-semibold text-violet-200/70">
                  Display name
                </label>
                <input
                  id="displayName"
                  className="field"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Ada Lovelace"
                />
              </div>
              <div>
                <label htmlFor="email" className="mb-1 block text-xs font-semibold text-violet-200/70">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="field"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-semibold text-violet-200/70">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="field"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={mode === "signup" ? "at least 8 characters" : "••••••••"}
            />
          </div>

          <ErrorText>{error}</ErrorText>

          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create my account"}
          </button>
          {notice ? <p className="text-xs text-emerald-200/80">{notice}</p> : null}
        </form>
      </section>

      <section className="card flex flex-col justify-between p-6 sm:p-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Welcome to <span className="text-violet-300">Pulse</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-violet-100/75">
            A tiny social network: publish short posts, reply in comment threads, like what you
            enjoy, and follow people to shape your own feed.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-violet-100/75">
            <li>🧵 Posts up to 500 characters with #hashtags and @mentions</li>
            <li>💬 Comment threads with their own likes</li>
            <li>❤️ Like / follow graph with follower lists</li>
            <li>⚡ An activity stream of interactions on your posts</li>
          </ul>
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold tracking-wide text-violet-200/60 uppercase">
            Try a demo account
          </p>
          <p className="mt-1 text-xs text-violet-200/50">
            Seeded profiles · password <code className="text-violet-300">password123</code>
          </p>
          <div className="mt-3 grid gap-2">
            {[
              { username: "ada", displayName: "Ada Lovelace", avatarHue: 265 },
              { username: "grace", displayName: "Grace Hopper", avatarHue: 190 },
              { username: "linus", displayName: "Linus Torvalds", avatarHue: 20 },
            ].map((account) => (
              <button
                key={account.username}
                type="button"
                onClick={() => void demoLogin(account.username)}
                disabled={busy}
                className="card card-hover flex items-center gap-3 p-3 text-left"
              >
                <Avatar user={account} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">
                    {account.displayName}
                  </span>
                  <span className="block text-xs text-violet-200/55">@{account.username}</span>
                </span>
                <span className="text-xs font-semibold text-violet-200/70">Sign in →</span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-violet-200/50">
            Just browsing?{" "}
            <Link href="/" className="link">
              Read the global feed
            </Link>{" "}
            without an account.
          </p>
        </div>
      </section>
    </div>
  );
}
