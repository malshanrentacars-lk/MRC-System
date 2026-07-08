import { TableSkeleton } from "@/components/shared/Skeleton";

export default function DepositsLoading() {
  return <TableSkeleton rows={8} cols={7} />;
}
