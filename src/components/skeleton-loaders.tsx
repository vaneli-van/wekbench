import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export function RFQDetailSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="w-48 h-10" />
        <Skeleton className="w-96 h-4" />
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} className="p-4" />
        ))}
      </div>
      
      <div className="space-y-4">
        <Skeleton className="w-32 h-6" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="w-full h-16" />
        ))}
      </div>
    </div>
  );
}

export function QuoteDetailSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="w-48 h-10" />
        <Skeleton className="w-96 h-4" />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      
      <div className="rounded-lg border border-border p-6 space-y-4">
        <Skeleton className="w-32 h-6" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="w-full h-12" />
        ))}
      </div>
    </div>
  );
}

export function OrderDetailSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="w-48 h-10" />
        <Skeleton className="w-96 h-4" />
      </div>
      
      <div className="rounded-lg border border-border p-6 space-y-4">
        <Skeleton className="w-full h-8" />
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="w-20 h-6" />
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="w-full h-20" />
        ))}
      </div>
    </div>
  );
}

export function InvoiceDetailSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="w-48 h-10" />
        <Skeleton className="w-96 h-4" />
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="p-4" />
        ))}
      </div>
      
      <div className="rounded-lg border border-border p-6 space-y-4">
        <Skeleton className="w-32 h-6" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="w-full h-12" />
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border p-4 space-y-2">
          <div className="flex justify-between items-start">
            <Skeleton className="w-48 h-5" />
            <Skeleton className="w-20 h-5" />
          </div>
          <Skeleton className="w-96 h-3" />
          <Skeleton className="w-24 h-3" />
        </div>
      ))}
    </div>
  );
}
