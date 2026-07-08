import { TableSkeleton } from "@/components/shared/Skeleton";

export default function SuppliersLoading() {
  return <TableSkeleton rows={8} cols={6} />;
}
