import { TableSkeleton } from "@/components/shared/Skeleton";

export default function CompaniesLoading() {
  return <TableSkeleton rows={8} cols={5} />;
}
