import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Nav } from "@/components/nav";
import { SessionProvider } from "@/components/social";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulse — a mini social network",
  description:
    "Pulse is a mini social network with profiles, posts, comments, likes and a follow graph, built on Next.js, Drizzle ORM and PostgreSQL.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body className="antialiased">
        <SessionProvider
          initialUser={
            user
              ? {
                  id: user.id,
                  username: user.username,
                  displayName: user.displayName,
                  avatarHue: user.avatarHue,
                  email: user.email,
                  bio: user.bio,
                }
              : null
          }
        >
          <Nav />
          <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
          <footer className="mx-auto w-full max-w-6xl px-4 pb-10 text-center text-xs text-violet-200/40">
            Pulse · Next.js App Router API routes + Drizzle ORM + PostgreSQL · passwords hashed with
            scrypt, sessions stored server-side
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
