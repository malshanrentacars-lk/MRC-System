import { TableSkeleton } from "@/components/shared/Skeleton";

export default function AttendanceLoading() {
  return <TableSkeleton rows={8} cols={6} />;
}
