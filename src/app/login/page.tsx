import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(`/u/${user.username}`);

  const { mode } = await searchParams;
  return <AuthForm initialMode={mode === "signup" ? "signup" : "signin"} />;
}
