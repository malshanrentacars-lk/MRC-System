import { TableSkeleton } from "@/components/shared/Skeleton";

export default function UsersLoading() {
  return <TableSkeleton rows={8} cols={5} />;
}
