import { TableSkeleton } from "@/components/shared/Skeleton";

export default function DeletedRentalsLoading() {
  return <TableSkeleton rows={8} cols={8} />;
}
