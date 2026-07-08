import { TableSkeleton } from "@/components/shared/Skeleton";

export default function AgreementsLoading() {
  return <TableSkeleton rows={8} cols={4} />;
}
