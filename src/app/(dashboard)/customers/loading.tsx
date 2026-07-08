import { TableSkeleton } from "@/components/shared/Skeleton";

export default function CustomersLoading() {
  return <TableSkeleton rows={8} cols={7} />;
}
