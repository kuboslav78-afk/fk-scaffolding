export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8" aria-busy="true">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-ink-100" />
      <div className="card h-40 animate-pulse" />
      <div className="card h-64 animate-pulse" />
    </div>
  );
}
