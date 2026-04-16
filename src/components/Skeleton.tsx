export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`skeleton h-4 ${className}`} />;
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-gray-100 dark:bg-slate-800 rounded-2xl p-4 space-y-3 ${className}`}>
      <SkeletonLine className="w-1/3 h-3" />
      <SkeletonLine className="w-2/3 h-6" />
      <SkeletonLine className="w-1/2 h-3" />
    </div>
  );
}

export function SkeletonCircle({ size = "w-12 h-12" }: { size?: string }) {
  return <div className={`skeleton rounded-full ${size}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="space-y-1">
        <SkeletonLine className="w-1/2 h-6" />
        <SkeletonLine className="w-1/3 h-4" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard className="col-span-2" />
        <SkeletonCard className="col-span-2" />
      </div>
      <div className="flex gap-2">
        <SkeletonLine className="flex-1 h-12 rounded-xl" />
        <SkeletonLine className="flex-1 h-12 rounded-xl" />
        <SkeletonLine className="flex-1 h-12 rounded-xl" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      <SkeletonLine className="w-1/3 h-6" />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <SkeletonLine className="w-1/4 h-6" />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}
