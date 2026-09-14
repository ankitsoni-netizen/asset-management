import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="cf-label">Not found</p>
      <h1 className="mt-3 text-2xl font-medium">This page does not exist</h1>
      <Link href="/" className="cf-action mt-6 bg-cf-primary text-white sm:w-auto">
        Return to asset desk
      </Link>
    </div>
  );
}
