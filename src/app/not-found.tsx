import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <p className="text-4xl">🛰️</p>
      <h1 className="mt-3 text-xl font-bold text-white">Nothing here</h1>
      <p className="mt-2 text-sm text-violet-100/75">
        That profile or page doesn&apos;t exist — it may have been deleted.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Link href="/" className="btn btn-primary">
          Back to the feed
        </Link>
        <Link href="/discover" className="btn btn-ghost">
          Discover people
        </Link>
      </div>
    </div>
  );
}
