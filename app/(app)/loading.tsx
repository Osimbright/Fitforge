export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-64 rounded-xl bg-surface-2" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 rounded-[var(--radius-card)] bg-surface" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="h-64 rounded-[var(--radius-card)] bg-surface" />
        <div className="h-64 rounded-[var(--radius-card)] bg-surface" />
      </div>
    </div>
  );
}
