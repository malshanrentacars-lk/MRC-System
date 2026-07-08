import { TableSkeleton } from "@/components/shared/Skeleton";

export default function WhatsAppListLoading() {
  return <TableSkeleton rows={8} cols={4} />;
}
