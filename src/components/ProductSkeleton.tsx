export function ProductSkeleton() {
  return (
    <div className="flex flex-col h-full rounded-lg bg-card border border-border overflow-hidden">
      <div className="relative aspect-square overflow-hidden bg-gray-200 animate-pulse" />
      <div className="p-2.5 md:p-3 space-y-2 text-left flex flex-col flex-1 border-t border-border">
        <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
        <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
        <div className="h-5 bg-gray-200 rounded w-1/3 animate-pulse mt-auto" />
      </div>
    </div>
  );
}
