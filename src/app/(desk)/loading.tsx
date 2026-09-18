export default function DeskLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-3">
        <div className="h-3 w-24 rounded bg-cf-soft" />
        <div className="h-9 w-56 rounded bg-cf-soft" />
        <div className="h-4 w-full max-w-xl rounded bg-cf-soft" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="cf-card h-28" />
        ))}
      </div>
      <div className="cf-card h-14" />
      <div className="cf-card h-14" />
      <div className="cf-card h-14" />
    </div>
  );
}
