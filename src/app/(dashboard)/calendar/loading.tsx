import { Skeleton } from "@/components/shared/Skeleton";

export default function CalendarLoading() {
  return (
    <div className="section-card animate-fade-in">
      <div className="p-5">
        <Skeleton className="h-5 w-28 mb-4" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    </div>
  );
}
