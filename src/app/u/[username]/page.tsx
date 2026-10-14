import { notFound } from "next/navigation";
import { ProfileView } from "@/components/profile-view";
import { getCurrentUser, normalizeUsername } from "@/lib/auth";
import { getProfile, listPosts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const handle = normalizeUsername(decodeURIComponent(username));
  const viewer = await getCurrentUser();

  const profile = await getProfile(handle, viewer?.id ?? null);
  if (!profile) notFound();

  const posts = await listPosts({
    viewerId: viewer?.id ?? null,
    authorUsername: handle,
    limit: 50,
  });

  return (
    <div className="mx-auto max-w-3xl">
      <ProfileView initialProfile={profile} initialPosts={posts} />
    </div>
  );
}
