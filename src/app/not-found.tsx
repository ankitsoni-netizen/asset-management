import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="cf-label">Not found</p>
      <h1 className="mt-3 text-2xl font-medium">This UID or page does not exist</h1>
      <Link href="/" className="mt-6 text-sm font-medium text-cf-primary">
        Return to asset desk
      </Link>
    </div>
  );
}
