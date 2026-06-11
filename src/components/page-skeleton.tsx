function SkeletonBar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />
}

/**
 * Generic page-loading skeleton shown instantly during client-side
 * navigation (via Next.js loading.tsx boundaries). Mirrors the common
 * "header + filter row + content grid" layout used across the app so the
 * transition feels immediate instead of blank/frozen.
 */
export function PageSkeleton() {
  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <SkeletonBar className="h-7 w-56" />
        <SkeletonBar className="h-4 w-80" />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <SkeletonBar className="h-9 w-32" />
        <SkeletonBar className="h-9 w-32" />
        <SkeletonBar className="h-9 w-40" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBar key={i} className="h-24" />
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBar key={i} className="h-14" />
        ))}
      </div>
    </div>
  )
}
