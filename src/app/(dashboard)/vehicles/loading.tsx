import { TableSkeleton } from "@/components/shared/Skeleton";

export default function VehiclesLoading() {
  return <TableSkeleton rows={8} cols={10} />;
}
