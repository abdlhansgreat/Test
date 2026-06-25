import { cn } from "@/lib/utils";

export function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-sun-50",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent",
        className,
      )}
      aria-hidden="true"
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
      <Shimmer className="aspect-[16/11] w-full rounded-none" />
      <div className="space-y-3 p-5">
        <Shimmer className="h-5 w-2/3" />
        <Shimmer className="h-3 w-1/3" />
        <div className="flex gap-2">
          <Shimmer className="h-5 w-14" />
          <Shimmer className="h-5 w-16" />
        </div>
        <Shimmer className="h-8 w-1/2" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
