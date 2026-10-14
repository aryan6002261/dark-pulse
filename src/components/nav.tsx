"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, useSession } from "@/components/social";

const links = [
  { href: "/", label: "Feed", icon: "🏠" },
  { href: "/discover", label: "Discover", icon: "🔍" },
  { href: "/activity", label: "Activity", icon: "⚡" },
];

export function Nav() {
  const { viewer, logout } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="glass-nav sticky top-0 z-40">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl text-lg font-black text-[#0b0620]"
            style={{ background: "linear-gradient(135deg,#7c5cff,#ff5c9d)" }}
          >
            P
          </span>
          <span className="text-lg font-black tracking-tight text-white">
            Pulse<span className="text-violet-300">.</span>
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 sm:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                  active
                    ? "bg-white/12 text-white"
                    : "text-violet-100/65 hover:bg-white/8 hover:text-white"
                }`}
              >
                <span className="mr-1.5">{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {viewer ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pr-3 pl-1 transition hover:border-violet-300/40"
              >
                <Avatar user={{ displayName: viewer.displayName, avatarHue: viewer.avatarHue }} size={30} />
                <span className="max-w-[7rem] truncate text-sm font-semibold text-white">
                  {viewer.displayName}
                </span>
                <span className="text-xs text-violet-200/60">▾</span>
              </button>
              {menuOpen ? (
                <div className="card fade-in absolute right-0 mt-2 w-52 !bg-[#0c0a1df2] p-2 text-sm">
                  <Link
                    href={`/u/${viewer.username}`}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 text-violet-100/85 hover:bg-white/8 hover:text-white"
                  >
                    My profile
                  </Link>
                  <Link
                    href="/activity"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 text-violet-100/85 hover:bg-white/8 hover:text-white"
                  >
                    Activity
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full rounded-lg px-3 py-2 text-left text-rose-200/90 hover:bg-rose-500/10"
                  >
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost">
                Sign in
              </Link>
              <Link href="/login?mode=signup" className="btn btn-primary">
                Join Pulse
              </Link>
            </>
          )}
        </div>
      </div>

      <nav className="flex items-center gap-1 border-t border-white/5 px-4 pb-2 sm:hidden">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                active ? "bg-white/12 text-white" : "text-violet-100/65"
              }`}
            >
              {link.icon} {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
